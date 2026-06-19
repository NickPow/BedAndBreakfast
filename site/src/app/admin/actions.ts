"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  sendBookingDeclinedEmailToGuest,
  sendBookingConfirmedEmailToGuest,
} from "@/lib/booking";
import { hasActiveDateBlockOverlap } from "@/lib/date-blocks";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BookingRow = {
  id: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  full_name: string;
  email: string;
  guests: number;
  rooms: number;
  arrival_date: string;
  departure_date: string;
  decline_email_enabled: boolean;
};

type ReviewModerationRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
};

const manualBlockSchema = z
  .object({
    startDate: z.string().trim().min(1),
    endDate: z.string().trim().min(1),
    note: z.string().trim().max(2000).optional().default(""),
  })
  .superRefine((value, context) => {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);

    if (Number.isNaN(start.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Choose a valid start date.",
      });
    }

    if (Number.isNaN(end.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "Choose a valid end date.",
      });
    }

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be the same as or after start date.",
      });
    }
  });

const reviewModerationSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID."),
  reason: z.string().trim().max(1000).optional().default(""),
});

async function requireAdminUserId() {
  const authClient = await createSupabaseServerClient();
  const serviceClient = getSupabaseServiceClient();

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  const roleResult = await serviceClient
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const roleRow = roleResult.data as { role: string } | null;
  const roleError = roleResult.error;

  if (roleError || !roleRow || roleRow.role !== "admin") {
    redirect("/admin/login?error=unauthorized");
  }

  return user.id;
}

async function getBookingById(bookingId: string): Promise<BookingRow> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("booking_requests")
    .select(
      "id,status,full_name,email,guests,rooms,arrival_date,departure_date,decline_email_enabled",
    )
    .eq("id", bookingId)
    .single();

  if (error || !data) {
    throw new Error("Booking request not found.");
  }

  return data as BookingRow;
}

async function getReviewById(reviewId: string): Promise<ReviewModerationRow> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("guest_reviews")
    .select("id,status")
    .eq("id", reviewId)
    .single();

  if (error || !data) {
    throw new Error("Review not found.");
  }

  return data as ReviewModerationRow;
}

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/admin/login?error=missing");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/admin/login?error=invalid");
  }

  redirect("/admin");
}

export async function signOutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function approveBookingRequest(formData: FormData) {
  const adminUserId = await requireAdminUserId();
  const bookingId = String(formData.get("bookingId") ?? "").trim();

  if (!bookingId) {
    redirect("/admin?error=missing-booking");
  }

  const booking = await getBookingById(bookingId);

  if (booking.status !== "pending") {
    redirect("/admin?error=not-pending");
  }

  const overlaps = await hasActiveDateBlockOverlap(
    booking.arrival_date,
    booking.departure_date,
    booking.id,
  );

  if (overlaps) {
    redirect("/admin?error=dates-unavailable");
  }

  const supabase = getSupabaseServiceClient();

  const { error: bookingUpdateError } = await supabase
    .from("booking_requests")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    } as never)
    .eq("id", booking.id)
    .eq("status", "pending");

  if (bookingUpdateError) {
    throw new Error(`Unable to confirm booking: ${bookingUpdateError.message}`);
  }

  const { data: updatedBlocks, error: blockUpdateError } = await supabase
    .from("date_blocks")
    .update({
      source_type: "booking_confirmed",
      note: "Booking confirmed",
      updated_by: adminUserId,
    } as never)
    .eq("booking_request_id", booking.id)
    .eq("source_type", "pending_hold")
    .eq("is_active", true)
    .select("id");

  if (blockUpdateError) {
    throw new Error(`Unable to confirm booking dates: ${blockUpdateError.message}`);
  }

  if (!updatedBlocks || updatedBlocks.length === 0) {
    const { error: insertBlockError } = await supabase.from("date_blocks").insert(
      {
        booking_request_id: booking.id,
        source_type: "booking_confirmed",
        start_date: booking.arrival_date,
        end_date: booking.departure_date,
        is_active: true,
        note: "Booking confirmed",
        created_by: adminUserId,
        updated_by: adminUserId,
      } as never,
    );

    if (insertBlockError) {
      throw new Error(`Unable to create confirmed block: ${insertBlockError.message}`);
    }
  }

  try {
    await sendBookingConfirmedEmailToGuest({
      fullName: booking.full_name,
      email: booking.email,
      arrivalDate: booking.arrival_date,
      departureDate: booking.departure_date,
      guests: booking.guests,
      rooms: booking.rooms,
    });
  } catch (error) {
    console.error("Confirmation email failed", { bookingId: booking.id, error });
  }

  revalidatePath("/admin");
  redirect("/admin?notice=approved");
}

export async function declineBookingRequest(formData: FormData) {
  const adminUserId = await requireAdminUserId();
  const bookingId = String(formData.get("bookingId") ?? "").trim();

  if (!bookingId) {
    redirect("/admin?error=missing-booking");
  }

  const booking = await getBookingById(bookingId);

  if (booking.status !== "pending") {
    redirect("/admin?error=not-pending");
  }

  const supabase = getSupabaseServiceClient();

  const { error: bookingUpdateError } = await supabase
    .from("booking_requests")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
    } as never)
    .eq("id", booking.id)
    .eq("status", "pending");

  if (bookingUpdateError) {
    throw new Error(`Unable to decline booking: ${bookingUpdateError.message}`);
  }

  const { error: holdReleaseError } = await supabase
    .from("date_blocks")
    .update({
      is_active: false,
      note: "Pending hold released after decline",
      updated_by: adminUserId,
    } as never)
    .eq("booking_request_id", booking.id)
    .eq("source_type", "pending_hold")
    .eq("is_active", true);

  if (holdReleaseError) {
    throw new Error(`Unable to release pending hold: ${holdReleaseError.message}`);
  }

  if (booking.decline_email_enabled) {
    try {
      await sendBookingDeclinedEmailToGuest({
        fullName: booking.full_name,
        email: booking.email,
        arrivalDate: booking.arrival_date,
        departureDate: booking.departure_date,
      });
    } catch (error) {
      console.error("Decline email failed", { bookingId: booking.id, error });
    }
  }

  revalidatePath("/admin");
  redirect("/admin?notice=declined");
}

export async function createManualDateBlock(formData: FormData) {
  const adminUserId = await requireAdminUserId();

  const parsed = manualBlockSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    redirect("/admin?error=invalid-manual-block");
  }

  const overlaps = await hasActiveDateBlockOverlap(
    parsed.data.startDate,
    parsed.data.endDate,
  );

  if (overlaps) {
    redirect("/admin?error=dates-unavailable");
  }

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase.from("date_blocks").insert(
    {
      source_type: "manual_block",
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      is_active: true,
      note: parsed.data.note || "Manually blocked",
      created_by: adminUserId,
      updated_by: adminUserId,
    } as never,
  );

  if (error) {
    throw new Error(`Unable to create manual block: ${error.message}`);
  }

  revalidatePath("/admin");
  redirect("/admin?notice=manual-block-added");
}

export async function removeManualDateBlock(formData: FormData) {
  const adminUserId = await requireAdminUserId();
  const blockId = String(formData.get("blockId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!blockId || reason.length < 2) {
    redirect("/admin?error=invalid-remove-block");
  }

  const supabase = getSupabaseServiceClient();

  const blockResult = await supabase
    .from("date_blocks")
    .select("id,source_type")
    .eq("id", blockId)
    .single();

  const block = blockResult.data as { id: string; source_type: string } | null;
  const blockError = blockResult.error;

  if (blockError || !block) {
    redirect("/admin?error=block-not-found");
  }

  if (block.source_type !== "manual_block") {
    redirect("/admin?error=protected-block");
  }

  const { error: updateError } = await supabase
    .from("date_blocks")
    .update({
      is_active: false,
      delete_reason: reason,
      updated_by: adminUserId,
      note: "Manual block removed",
    } as never)
    .eq("id", blockId)
    .eq("source_type", "manual_block");

  if (updateError) {
    throw new Error(`Unable to remove manual block: ${updateError.message}`);
  }

  revalidatePath("/admin");
  redirect("/admin?notice=manual-block-removed");
}

export async function approveGuestReview(formData: FormData) {
  const adminUserId = await requireAdminUserId();

  const parsed = reviewModerationSchema.safeParse({
    reviewId: formData.get("reviewId"),
  });

  if (!parsed.success) {
    redirect("/admin?error=invalid-review");
  }

  const review = await getReviewById(parsed.data.reviewId);

  if (review.status !== "pending") {
    redirect("/admin?error=review-not-pending");
  }

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from("guest_reviews")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      moderated_by: adminUserId,
      moderation_note: null,
    } as never)
    .eq("id", review.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Unable to approve review: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/reviews");
  redirect("/admin?notice=review-approved");
}

export async function rejectGuestReview(formData: FormData) {
  const adminUserId = await requireAdminUserId();

  const parsed = reviewModerationSchema.safeParse({
    reviewId: formData.get("reviewId"),
    reason: formData.get("reason"),
  });

  if (!parsed.success || parsed.data.reason.length < 2) {
    redirect("/admin?error=invalid-review-rejection");
  }

  const review = await getReviewById(parsed.data.reviewId);

  if (review.status !== "pending") {
    redirect("/admin?error=review-not-pending");
  }

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from("guest_reviews")
    .update({
      status: "rejected",
      moderated_by: adminUserId,
      moderation_note: parsed.data.reason,
    } as never)
    .eq("id", review.id)
    .eq("status", "pending");

  if (error) {
    throw new Error(`Unable to reject review: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/reviews");
  redirect("/admin?notice=review-rejected");
}
