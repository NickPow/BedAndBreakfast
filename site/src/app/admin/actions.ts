"use server";

import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  sendBookingDeclinedEmailToGuest,
  sendBookingConfirmedEmailToGuest,
} from "@/lib/booking";
import { hasActiveDateBlockOverlap } from "@/lib/date-blocks";
import { GALLERY_IMAGES_BUCKET, REVIEW_IMAGES_BUCKET } from "@/lib/media/constants";
import {
  buildGalleryStoragePath,
  deleteFileFromBucket,
  uploadFileToBucket,
  validateImageFile,
} from "@/lib/media/storage";
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

function isAdminRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() === "admin";
}

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

const galleryMetadataSchema = z.object({
  altText: z.string().trim().max(180).optional().default(""),
  caption: z.string().trim().max(500).optional().default(""),
});

const galleryDeleteSchema = z.object({
  galleryImageId: z.string().uuid("Invalid image ID."),
});

const galleryReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, "At least one image is required for reorder."),
});

const deleteDateBlockSchema = z.object({
  blockId: z.string().uuid("Invalid block ID."),
});

const LEGACY_IMPORT_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function mimeTypeFromExtension(extension: string) {
  const lower = extension.toLowerCase();
  if (lower === ".jpg" || lower === ".jpeg") {
    return "image/jpeg";
  }
  if (lower === ".png") {
    return "image/png";
  }
  if (lower === ".webp") {
    return "image/webp";
  }
  if (lower === ".gif") {
    return "image/gif";
  }
  return "application/octet-stream";
}

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

  const authRoleResult = await authClient
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1);

  const serviceRoleResult = await serviceClient
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1);

  const authRoleRow = ((authRoleResult.data as { role: string }[] | null) ?? [])[0] ?? null;
  const serviceRoleRow = ((serviceRoleResult.data as { role: string }[] | null) ?? [])[0] ?? null;
  const resolvedRole = authRoleRow?.role ?? serviceRoleRow?.role ?? null;

  if (!isAdminRole(resolvedRole)) {
    const reason = authRoleResult.error
      ? "auth-role-query-failed"
      : serviceRoleResult.error
        ? "service-role-query-failed"
        : "no-admin-role-for-user";
    const email = encodeURIComponent(user.email ?? "");
    redirect(`/admin/login?error=unauthorized&reason=${reason}&email=${email}`);
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

async function getGalleryImageById(galleryImageId: string) {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("gallery_images")
    .select("id,storage_path")
    .eq("id", galleryImageId)
    .single();

  if (error || !data) {
    throw new Error("Gallery image not found.");
  }

  return data as { id: string; storage_path: string };
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

export async function uploadGalleryImage(formData: FormData) {
  const adminUserId = await requireAdminUserId();

  const file = formData.get("galleryImage");

  if (!(file instanceof File)) {
    redirect("/admin?error=invalid-gallery-image");
  }

  const validation = validateImageFile(file);

  if (!validation.ok) {
    redirect(`/admin?error=gallery-upload-failed&reason=${encodeURIComponent(validation.message)}`);
  }

  const metadata = galleryMetadataSchema.safeParse({
    altText: formData.get("altText"),
    caption: formData.get("caption"),
  });

  if (!metadata.success) {
    redirect("/admin?error=invalid-gallery-metadata");
  }

  const supabase = getSupabaseServiceClient();

  const { data: sortRows, error: sortError } = await supabase
    .from("gallery_images")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  if (sortError) {
    redirect(`/admin?error=gallery-upload-failed&reason=${encodeURIComponent(sortError.message)}`);
  }

  const nextSortOrder = ((sortRows as Array<{ sort_order: number }> | null)?.[0]?.sort_order ?? -1) + 1;
  const storagePath = buildGalleryStoragePath(file);

  try {
    await uploadFileToBucket({
      bucket: GALLERY_IMAGES_BUCKET,
      path: storagePath,
      file,
    });

    const { error: insertError } = await supabase.from("gallery_images").insert(
      {
        storage_path: storagePath,
        alt_text: metadata.data.altText,
        caption: metadata.data.caption,
        sort_order: nextSortOrder,
        is_active: true,
        created_by: adminUserId,
        updated_by: adminUserId,
      } as never,
    );

    if (insertError) {
      await deleteFileFromBucket({
        bucket: GALLERY_IMAGES_BUCKET,
        paths: [storagePath],
      });
      throw new Error(insertError.message);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unable to upload gallery image.";
    redirect(`/admin?error=gallery-upload-failed&reason=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/pictures");
  redirect("/admin?notice=gallery-image-uploaded");
}

export async function deleteGalleryImage(formData: FormData) {
  const adminUserId = await requireAdminUserId();
  const parsed = galleryDeleteSchema.safeParse({
    galleryImageId: formData.get("galleryImageId"),
  });

  if (!parsed.success) {
    redirect("/admin?error=invalid-gallery-image");
  }

  const supabase = getSupabaseServiceClient();
  const galleryImage = await getGalleryImageById(parsed.data.galleryImageId);

  try {
    await deleteFileFromBucket({
      bucket: GALLERY_IMAGES_BUCKET,
      paths: [galleryImage.storage_path],
    });

    const { error: deleteError } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", parsed.data.galleryImageId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const { data: remainingRows } = await supabase
      .from("gallery_images")
      .select("id")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    const remainingImages = (remainingRows ?? []) as Array<{ id: string }>;

    await Promise.all(
      remainingImages.map((image, index) =>
        supabase
          .from("gallery_images")
          .update({
            sort_order: index,
            updated_by: adminUserId,
          } as never)
          .eq("id", image.id),
      ),
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unable to delete gallery image.";
    redirect(`/admin?error=gallery-delete-failed&reason=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/pictures");
  redirect("/admin?notice=gallery-image-deleted");
}

export async function reorderGalleryImages(formData: FormData) {
  const adminUserId = await requireAdminUserId();
  const rawOrderedIds = String(formData.get("orderedIds") ?? "").trim();

  let parsedIds: string[] = [];

  try {
    const json = JSON.parse(rawOrderedIds);
    if (Array.isArray(json)) {
      parsedIds = json.map((value) => String(value));
    }
  } catch {
    redirect("/admin?error=invalid-gallery-order");
  }

  const parsed = galleryReorderSchema.safeParse({ orderedIds: parsedIds });

  if (!parsed.success) {
    redirect("/admin?error=invalid-gallery-order");
  }

  const supabase = getSupabaseServiceClient();
  const { data: existingRows, error: existingError } = await supabase
    .from("gallery_images")
    .select("id")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (existingError) {
    redirect(`/admin?error=gallery-reorder-failed&reason=${encodeURIComponent(existingError.message)}`);
  }

  const existingIds = ((existingRows ?? []) as Array<{ id: string }>).map((row) => row.id).sort();
  const incomingIds = [...parsed.data.orderedIds].sort();

  if (existingIds.length !== incomingIds.length || existingIds.some((id, index) => id !== incomingIds[index])) {
    redirect("/admin?error=invalid-gallery-order");
  }

  try {
    await Promise.all(
      parsed.data.orderedIds.map((id, index) =>
        supabase
          .from("gallery_images")
          .update({
            sort_order: index,
            updated_by: adminUserId,
          } as never)
          .eq("id", id),
      ),
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unable to save gallery order.";
    redirect(`/admin?error=gallery-reorder-failed&reason=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/pictures");
  redirect("/admin?notice=gallery-order-saved");
}

export async function importLegacyGalleryImages() {
  const adminUserId = await requireAdminUserId();
  const supabase = getSupabaseServiceClient();

  let fileNames: string[] = [];

  try {
    const imagesDirectory = join(process.cwd(), "public", "images");
    fileNames = (await readdir(imagesDirectory))
      .filter((fileName) => LEGACY_IMPORT_EXTENSIONS.has(extname(fileName).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));

    if (fileNames.length === 0) {
      redirect("/admin?notice=legacy-gallery-no-files");
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("gallery_images")
      .select("storage_path,sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    if (existingError) {
      throw new Error(existingError.message);
    }

    const existingPaths = new Set((existingRows ?? []).map((row) => (row as { storage_path: string }).storage_path));
    let nextSortOrder = ((existingRows ?? [])[0] as { sort_order: number } | undefined)?.sort_order ?? -1;
    let importedCount = 0;

    for (const fileName of fileNames) {
      const legacyPath = `legacy/${fileName}`;
      if (existingPaths.has(legacyPath)) {
        continue;
      }

      const fullPath = join(process.cwd(), "public", "images", fileName);
      const extension = extname(fileName);
      const fileBuffer = await readFile(fullPath);

      const { error: uploadError } = await supabase.storage
        .from(GALLERY_IMAGES_BUCKET)
        .upload(legacyPath, fileBuffer, {
          upsert: false,
          contentType: mimeTypeFromExtension(extension),
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      nextSortOrder += 1;
      const { error: insertError } = await supabase.from("gallery_images").insert(
        {
          storage_path: legacyPath,
          alt_text: "",
          caption: "",
          sort_order: nextSortOrder,
          is_active: true,
          created_by: adminUserId,
          updated_by: adminUserId,
        } as never,
      );

      if (insertError) {
        await deleteFileFromBucket({
          bucket: GALLERY_IMAGES_BUCKET,
          paths: [legacyPath],
        });
        throw new Error(insertError.message);
      }

      importedCount += 1;
    }

    revalidatePath("/admin");
    revalidatePath("/pictures");

    if (importedCount === 0) {
      redirect("/admin?notice=legacy-gallery-already-imported");
    }

    redirect("/admin?notice=legacy-gallery-imported");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unable to import legacy gallery images.";
    redirect(`/admin?error=legacy-gallery-import-failed&reason=${encodeURIComponent(errorMessage)}`);
  }
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

export async function deleteDateBlock(formData: FormData) {
  const adminUserId = await requireAdminUserId();
  const parsed = deleteDateBlockSchema.safeParse({
    blockId: formData.get("blockId"),
  });

  if (!parsed.success) {
    redirect("/admin?error=invalid-block-delete");
  }

  const supabase = getSupabaseServiceClient();

  const { error } = await supabase
    .from("date_blocks")
    .update({
      is_active: false,
      note: "Blocked date removed from admin dashboard",
      delete_reason: "Removed by admin",
      updated_by: adminUserId,
    } as never)
    .eq("id", parsed.data.blockId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Unable to delete blocked date: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/booking");
  redirect("/admin?notice=block-deleted");
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

  const { error: photoApproveError } = await supabase
    .from("review_photos")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      moderated_by: adminUserId,
      moderation_note: null,
    } as never)
    .eq("review_id", review.id)
    .eq("status", "pending");

  if (photoApproveError) {
    throw new Error(`Unable to approve review photos: ${photoApproveError.message}`);
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

  const { data: reviewPhotoRows, error: reviewPhotoFetchError } = await supabase
    .from("review_photos")
    .select("id,storage_path")
    .eq("review_id", review.id);

  if (reviewPhotoFetchError) {
    throw new Error(`Unable to load review photos: ${reviewPhotoFetchError.message}`);
  }

  const reviewPhotos = (reviewPhotoRows ?? []) as Array<{ id: string; storage_path: string }>;

  if (reviewPhotos.length > 0) {
    await deleteFileFromBucket({
      bucket: REVIEW_IMAGES_BUCKET,
      paths: reviewPhotos.map((photo) => photo.storage_path),
    });

    const { error: photoDeleteError } = await supabase
      .from("review_photos")
      .delete()
      .eq("review_id", review.id);

    if (photoDeleteError) {
      throw new Error(`Unable to remove review photo records: ${photoDeleteError.message}`);
    }
  }

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
