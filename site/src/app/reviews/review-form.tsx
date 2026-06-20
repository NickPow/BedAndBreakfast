"use client";

import { IMAGE_MAX_BYTES, REVIEW_MAX_PHOTOS } from "@/lib/media/constants";
import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import { submitReview, type ReviewActionState } from "./actions";

const reviewInitialState: ReviewActionState = {
  status: "idle",
  message: "",
};

export function ReviewForm() {
  const [state, formAction, pending] = useActionState(submitReview, reviewInitialState);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoValidationMessage, setPhotoValidationMessage] = useState("");

  const previewUrls = useMemo(
    () => selectedPhotos.map((photo) => URL.createObjectURL(photo)),
    [selectedPhotos],
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function validateSelectedPhotos(files: File[]) {
    if (files.length > REVIEW_MAX_PHOTOS) {
      return `You can upload up to ${REVIEW_MAX_PHOTOS} photos only.`;
    }

    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        return "Only JPG, PNG, and WEBP files are allowed.";
      }

      if (file.size > IMAGE_MAX_BYTES) {
        return "Each image must be 5MB or smaller.";
      }
    }

    return "";
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const validationMessage = validateSelectedPhotos(files);

    if (validationMessage) {
      setPhotoValidationMessage(validationMessage);
      setSelectedPhotos([]);
      event.target.value = "";
      return;
    }

    setPhotoValidationMessage("");
    setSelectedPhotos(files);
  }

  return (
    <form action={formAction} encType="multipart/form-data" className="quote-panel rounded-[1.6rem] p-6 md:p-8">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />

      <h2 className="font-serif text-3xl text-stone-900">Leave a review</h2>
      <p className="section-copy mt-2">
        Share your experience. Reviews are moderated before they are published.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Name</span>
          <input className="input-field" name="fullName" required />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Location (optional)</span>
          <input className="input-field" name="location" placeholder="Kingston, Jamaica" />
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-stone-800">Rating</span>
          <select className="select-field" name="rating" defaultValue="5" required>
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Very good</option>
            <option value="3">3 - Good</option>
            <option value="2">2 - Fair</option>
            <option value="1">1 - Poor</option>
          </select>
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-stone-800">Title (optional)</span>
          <input className="input-field" name="title" placeholder="Peaceful stay with great hosts" />
        </label>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-sm font-semibold text-stone-800">Review</span>
        <textarea
          className="text-area"
          name="comment"
          maxLength={3000}
          minLength={20}
          placeholder="Tell future guests what you liked about your stay."
          required
        />
      </label>

      <label className="mt-4 grid gap-2">
        <span className="text-sm font-semibold text-stone-800">Photos from your stay (optional)</span>
        <input
          className="input-field"
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handlePhotoChange}
        />
        <span className="text-xs text-stone-600">
          Up to {REVIEW_MAX_PHOTOS} photos. JPG, PNG, or WEBP. Max 5MB each.
        </span>
        {photoValidationMessage ? (
          <span className="text-xs font-semibold text-rose-700">{photoValidationMessage}</span>
        ) : null}
        {previewUrls.length > 0 ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {previewUrls.map((previewUrl, index) => (
              <div key={previewUrl} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={previewUrl}
                    alt={`Selected review photo ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </label>

      <div className="mt-5 flex flex-col gap-4 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm ${state.status === "error" ? "font-semibold text-rose-700" : "text-stone-600"}`}
          aria-live="polite"
        >
          {photoValidationMessage || state.message || ""}
        </p>
        <button type="submit" className="button-primary disabled:cursor-not-allowed disabled:opacity-70" disabled={pending}>
          {pending ? "Submitting..." : "Submit review"}
        </button>
      </div>
    </form>
  );
}
