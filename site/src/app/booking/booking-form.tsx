"use client";

import Link from "next/link";
import { useState } from "react";
import { useActionState } from "react";
import { submitBookingRequest, type BookingActionState } from "./actions";

const guestOptions = [1, 2, 3, 4, 5, 6, 7, 8];
const roomOptions = [1, 2, 3, 4];
const bookingInitialState: BookingActionState = {
  status: "idle",
  message: "",
};

export function BookingForm() {
  const [dismissedSuccess, setDismissedSuccess] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previousState: BookingActionState, formData: FormData) => {
      const nextState = await submitBookingRequest(previousState, formData);

      if (nextState.status === "success") {
        setDismissedSuccess(false);
      }

      return nextState;
    },
    bookingInitialState,
  );

  const showSuccessModal = state.status === "success" && !dismissedSuccess;

  return (
    <>
      <form action={formAction} className="quote-panel rounded-[2rem] p-6 md:p-8">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />

        {/* Header removed — content limited to booking fields per provided images */}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Full name</span>
            <input className="input-field" name="fullName" placeholder="Your full name" autoComplete="name" required />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Email</span>
            <input className="input-field" type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Phone number</span>
            <input className="input-field" type="tel" name="phone" placeholder="+1 876 000 0000" autoComplete="tel" required />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Number of guests</span>
            <select className="select-field" name="guests" defaultValue="2" required>
              {guestOptions.map((guestCount) => (
                <option key={guestCount} value={guestCount}>
                  {guestCount} guest{guestCount === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Rooms needed</span>
            <select className="select-field" name="rooms" defaultValue="1" required>
              {roomOptions.map((roomCount) => (
                <option key={roomCount} value={roomCount}>
                  {roomCount} room{roomCount === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Arrival date</span>
            <input className="input-field" type="date" name="arrivalDate" required />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Departure date</span>
            <input className="input-field" type="date" name="departureDate" required />
          </label>
        </div>

        <label className="mt-5 grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Anything the host should know?</span>
          <textarea
            className="text-area"
            name="message"
            placeholder="Share any dietary needs, arrival timing, or special requests."
            maxLength={2000}
          />
        </label>

        <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-stone-600">
          Departure dates are also blocked. Same-day checkout and check-in is not available.
        </p>

        <div className="mt-6 flex flex-col gap-4 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-sm ${state.status === "error" ? "font-semibold text-rose-700" : "text-stone-600"}`}
            aria-live="polite"
          >
            {state.message || ""}
          </p>
          <button type="submit" className="button-primary disabled:cursor-not-allowed disabled:opacity-70" disabled={pending}>
            {pending ? "Sending request..." : "Check availability"}
          </button>
        </div>
      </form>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/55 px-4" role="dialog" aria-modal="true" aria-label="Booking request sent">
          <div className="quote-panel w-full max-w-lg rounded-[1.5rem] p-6 md:p-8">
            <p className="eyebrow">Request sent</p>
            <h2 className="mt-4 font-serif text-3xl text-stone-900">Your booking request was submitted.</h2>
            <p className="mt-3 text-sm leading-7 text-stone-700">
              We sent your details to the host. You can continue to the confirmation page or close this window.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/booking/success" className="button-primary">
                View confirmation
              </Link>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setDismissedSuccess(true)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}