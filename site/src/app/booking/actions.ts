"use server";

import { z } from "zod";
import { sendBookingRequestEmail } from "@/lib/booking";
import { hasActiveDateBlockOverlap } from "@/lib/date-blocks";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export type BookingActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const bookingSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name.").max(80),
    email: z.string().trim().email("Please enter a valid email address."),
    phone: z.string().trim().min(7, "Please enter a valid phone number.").max(30),
    guests: z.coerce.number().int().min(1, "Select at least one guest.").max(12),
    rooms: z.coerce.number().int().min(1, "Select at least one room.").max(6),
    arrivalDate: z.string().trim().min(1, "Choose an arrival date."),
    departureDate: z.string().trim().min(1, "Choose a departure date."),
    message: z.string().trim().max(2000).optional().default(""),
    honeypot: z.string().max(0).optional().default(""),
  })
  .superRefine((value, context) => {
    const arrival = new Date(value.arrivalDate);
    const departure = new Date(value.departureDate);

    if (Number.isNaN(arrival.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["arrivalDate"],
        message: "Choose a valid arrival date.",
      });
    }

    if (Number.isNaN(departure.getTime())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departureDate"],
        message: "Choose a valid departure date.",
      });
    }

    if (!Number.isNaN(arrival.getTime()) && !Number.isNaN(departure.getTime()) && departure <= arrival) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departureDate"],
        message: "Departure must be after arrival.",
      });
    }
  });

export async function submitBookingRequest(
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = bookingSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    guests: formData.get("guests"),
    rooms: formData.get("rooms"),
    arrivalDate: formData.get("arrivalDate"),
    departureDate: formData.get("departureDate"),
    message: formData.get("message"),
    honeypot: formData.get("website"),
  });

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];

    return {
      status: "error",
      message: firstError ?? "Please check the booking form and try again.",
    };
  }

  if (parsed.data.honeypot) {
    return {
      status: "success",
      message: "Your request has been received.",
    };
  }

  try {
    const overlaps = await hasActiveDateBlockOverlap(
      parsed.data.arrivalDate,
      parsed.data.departureDate,
    );

    if (overlaps) {
      return {
        status: "error",
        message:
          "Those dates are no longer available, including the listed departure day. Please select different dates.",
      };
    }

    const supabase = getSupabaseServiceClient();

    const { data: createdBooking, error: bookingInsertError } = await supabase
      .from("booking_requests")
      .insert({
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        guests: parsed.data.guests,
        rooms: parsed.data.rooms,
        arrival_date: parsed.data.arrivalDate,
        departure_date: parsed.data.departureDate,
        message: parsed.data.message,
        status: "pending",
        decline_email_enabled: true,
      } as never)
      .select("id")
      .single();

    const bookingRow = createdBooking as { id: string } | null;

    if (bookingInsertError || !bookingRow) {
      throw new Error(
        bookingInsertError?.message ?? "Unable to store booking request.",
      );
    }

    const { error: holdInsertError } = await supabase.from("date_blocks").insert(
      {
        booking_request_id: bookingRow.id,
        source_type: "pending_hold",
        start_date: parsed.data.arrivalDate,
        end_date: parsed.data.departureDate,
        is_active: true,
        note: "Pending hold from booking request",
      } as never,
    );

    if (holdInsertError) {
      throw new Error(
        `Unable to reserve pending hold: ${holdInsertError.message}`,
      );
    }

    try {
      await sendBookingRequestEmail({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        guests: parsed.data.guests,
        rooms: parsed.data.rooms,
        arrivalDate: parsed.data.arrivalDate,
        departureDate: parsed.data.departureDate,
        message: parsed.data.message,
      });
    } catch (emailError) {
      console.error("Host booking notification email failed", {
        bookingId: bookingRow.id,
        emailError,
      });
    }

    return {
      status: "success",
      message:
        "Booking request sent. It is now pending host approval, and your dates are temporarily held.",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unable to send the booking request.";
    const isConfigIssue = /configure smtp_host|booking_from_email|smtp_pass|smtp_user|smtp_port/i.test(
      errorMessage,
    );
    const incidentId = crypto.randomUUID().slice(0, 8);

    console.error(`[booking:${incidentId}] Email send failed`, {
      message: errorMessage,
      error,
    });

    if (isConfigIssue) {
      return {
        status: "error",
        message: "Bookings are temporarily unavailable. Please contact the host directly.",
      };
    }

    return {
      status: "error",
      message: `Unable to send your request right now. Please try again in a moment. Ref: ${incidentId}`,
    };
  }
}