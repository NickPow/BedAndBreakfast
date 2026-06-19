"use server";

import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export type ReviewActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const reviewSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name.").max(80),
  location: z.string().trim().max(120).optional().default(""),
  rating: z.coerce.number().int().min(1, "Select a rating.").max(5),
  title: z.string().trim().max(120).optional().default(""),
  comment: z.string().trim().min(20, "Please share at least a short review.").max(3000),
  honeypot: z.string().max(0).optional().default(""),
});

export async function submitReview(
  _previousState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = reviewSchema.safeParse({
    fullName: formData.get("fullName"),
    location: formData.get("location"),
    rating: formData.get("rating"),
    title: formData.get("title"),
    comment: formData.get("comment"),
    honeypot: formData.get("website"),
  });

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];

    return {
      status: "error",
      message: firstError ?? "Please check the form and try again.",
    };
  }

  if (parsed.data.honeypot) {
    return {
      status: "success",
      message: "Thanks. Your review has been submitted.",
    };
  }

  try {
    const supabase = getSupabaseServiceClient();

    const { error } = await supabase.from("guest_reviews").insert(
      {
        full_name: parsed.data.fullName,
        location: parsed.data.location || null,
        rating: parsed.data.rating,
        title: parsed.data.title || null,
        comment: parsed.data.comment,
        status: "pending",
      } as never,
    );

    if (error) {
      throw new Error(error.message);
    }

    return {
      status: "success",
      message: "Thanks for your review. It will appear after host approval.",
    };
  } catch (error) {
    const incidentId = crypto.randomUUID().slice(0, 8);
    console.error(`[review:${incidentId}] Review submit failed`, error);

    return {
      status: "error",
      message: `Unable to submit right now. Please try again in a moment. Ref: ${incidentId}`,
    };
  }
}
