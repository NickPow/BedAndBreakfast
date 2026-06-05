"use server";

import { z } from "zod";
import { sendBookingRequestEmail } from "@/lib/booking";

export type BookingActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const initialState: BookingActionState = {
  status: "idle",
  message: "",
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

    return {
      status: "success",
      message:
        "Booking request sent. The host will review it by email before payment details are shared.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send the booking request.";

    return {
      status: "error",
      message,
    };
  }
}

export const bookingInitialState = initialState;