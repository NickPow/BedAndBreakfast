"use client";

import { useActionState } from "react";
import { submitReview, type ReviewActionState } from "./actions";

const reviewInitialState: ReviewActionState = {
  status: "idle",
  message: "",
};

export function ReviewForm() {
  const [state, formAction, pending] = useActionState(submitReview, reviewInitialState);

  return (
    <form action={formAction} className="quote-panel rounded-[1.6rem] p-6 md:p-8">
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

      <div className="mt-5 flex flex-col gap-4 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`text-sm ${state.status === "error" ? "font-semibold text-rose-700" : "text-stone-600"}`}
          aria-live="polite"
        >
          {state.message || ""}
        </p>
        <button type="submit" className="button-primary disabled:cursor-not-allowed disabled:opacity-70" disabled={pending}>
          {pending ? "Submitting..." : "Submit review"}
        </button>
      </div>
    </form>
  );
}
