"use server";

import { z } from "zod";
import { REVIEW_IMAGES_BUCKET, REVIEW_MAX_PHOTOS } from "@/lib/media/constants";
import {
  buildReviewStoragePath,
  deleteFileFromBucket,
  uploadFileToBucket,
  validateImageFile,
} from "@/lib/media/storage";
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
  const photos = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (photos.length > REVIEW_MAX_PHOTOS) {
    return {
      status: "error",
      message: `You can upload up to ${REVIEW_MAX_PHOTOS} photos only.`,
    };
  }

  for (const photo of photos) {
    const validation = validateImageFile(photo);
    if (!validation.ok) {
      return {
        status: "error",
        message: validation.message,
      };
    }
  }

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
    const uploadedPaths: string[] = [];

    const { data: createdReview, error: insertReviewError } = await supabase
      .from("guest_reviews")
      .insert(
        {
          full_name: parsed.data.fullName,
          location: parsed.data.location || null,
          rating: parsed.data.rating,
          title: parsed.data.title || null,
          comment: parsed.data.comment,
          status: "pending",
        } as never,
      )
      .select("id")
      .single();

    const reviewRow = createdReview as { id: string } | null;

    if (insertReviewError || !reviewRow) {
      throw new Error(insertReviewError?.message ?? "Unable to create review record.");
    }

    try {
      for (const [index, photo] of photos.entries()) {
        const storagePath = buildReviewStoragePath(reviewRow.id, photo);

        await uploadFileToBucket({
          bucket: REVIEW_IMAGES_BUCKET,
          path: storagePath,
          file: photo,
        });

        uploadedPaths.push(storagePath);

        const { error: insertPhotoError } = await supabase.from("review_photos").insert(
          {
            review_id: reviewRow.id,
            storage_path: storagePath,
            sort_order: index,
            status: "pending",
          } as never,
        );

        if (insertPhotoError) {
          throw new Error(insertPhotoError.message);
        }
      }
    } catch (photoError) {
      if (uploadedPaths.length > 0) {
        try {
          await deleteFileFromBucket({
            bucket: REVIEW_IMAGES_BUCKET,
            paths: uploadedPaths,
          });
        } catch (cleanupError) {
          console.error("Review photo cleanup failed", cleanupError);
        }
      }

      await supabase.from("review_photos").delete().eq("review_id", reviewRow.id);
      await supabase.from("guest_reviews").delete().eq("id", reviewRow.id);
      throw photoError;
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
