"use client";

import Link from "next/link";
import { DayPicker, type Matcher } from "react-day-picker";
import { useState, type FormEvent } from "react";
import { useActionState } from "react";
import type { ActiveDateBlock } from "@/lib/date-blocks";
import { submitBookingRequest, type BookingActionState } from "./actions";

const guestOptions = [1, 2, 3, 4, 5, 6, 7, 8];
const roomOptions = [1, 2, 3, 4];
const bookingInitialState: BookingActionState = {
  status: "idle",
  message: "",
};

const calendarClassNames = {
  months: "grid gap-5 lg:grid-cols-2",
  month: "space-y-4 rounded-[1.25rem] border border-stone-200 bg-white/75 p-4",
  month_caption: "flex items-center justify-between gap-3",
  caption_label: "font-serif text-2xl text-stone-900",
  nav: "flex items-center gap-2",
  button_previous:
    "flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:border-[var(--accent)] hover:text-[var(--accent-ink)]",
  button_next:
    "flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition hover:border-[var(--accent)] hover:text-[var(--accent-ink)]",
  month_grid: "w-full border-collapse",
  weekdays: "grid grid-cols-7 gap-1",
  weekday: "text-center text-[0.7rem] font-bold uppercase tracking-[0.18em] text-stone-500",
  week: "mt-1 grid grid-cols-7 gap-1",
  day: "flex justify-center",
  day_button:
    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-stone-700 transition hover:bg-stone-100",
  today: "[&>button]:border [&>button]:border-[var(--accent)] [&>button]:text-[var(--accent-ink)]",
  selected: "[&>button]:bg-[var(--accent-ink)] [&>button]:text-white [&>button]:shadow-md",
  disabled: "[&>button]:cursor-not-allowed [&>button]:bg-stone-200/80 [&>button]:text-stone-400 [&>button]:line-through",
  outside: "[&>button]:text-stone-300",
  hidden: "invisible",
};

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatCalendarSummary(date?: Date) {
  if (!date) {
    return "Select a date";
  }

  return new Intl.DateTimeFormat("en-JM", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatBlockedRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("en-JM", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(parseIsoDate(startDate))} to ${formatter.format(parseIsoDate(endDate))}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function rangesOverlap(startDate: string, endDate: string, blockedRange: ActiveDateBlock) {
  return blockedRange.startDate <= endDate && blockedRange.endDate >= startDate;
}

function getOverlap(blockedDateRanges: ActiveDateBlock[], arrivalDate: Date, departureDate: Date) {
  const startDate = formatIsoDate(arrivalDate);
  const endDate = formatIsoDate(departureDate);

  return blockedDateRanges.find((blockedRange) => rangesOverlap(startDate, endDate, blockedRange));
}

function getNextBlockedStart(blockedDateRanges: ActiveDateBlock[], arrivalDate?: Date) {
  if (!arrivalDate) {
    return undefined;
  }

  const arrivalTime = arrivalDate.getTime();

  return blockedDateRanges
    .map((blockedRange) => parseIsoDate(blockedRange.startDate))
    .filter((date) => date.getTime() >= arrivalTime)
    .sort((left, right) => left.getTime() - right.getTime())[0];
}

export function BookingForm({ blockedDateRanges }: { blockedDateRanges: ActiveDateBlock[] }) {
  const [dismissedSuccess, setDismissedSuccess] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [arrivalDate, setArrivalDate] = useState<Date>();
  const [departureDate, setDepartureDate] = useState<Date>();
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
  const today = startOfToday();
  const blockedMatchers: Matcher[] = blockedDateRanges.map((blockedRange) => ({
    from: parseIsoDate(blockedRange.startDate),
    to: parseIsoDate(blockedRange.endDate),
  }));
  const nextBlockedStart = getNextBlockedStart(blockedDateRanges, arrivalDate);
  const arrivalDisabled: Matcher[] = [{ before: today }, ...blockedMatchers];
  const departureDisabled: Matcher[] = [
    { before: addDays(arrivalDate ?? today, 1) },
    ...blockedMatchers,
    ...(nextBlockedStart
      ? [
          (date: Date) => {
            return date.getTime() >= nextBlockedStart.getTime();
          },
        ]
      : []),
  ];

  function handleArrivalSelect(date?: Date) {
    setCalendarError("");
    setArrivalDate(date);

    if (!date) {
      setDepartureDate(undefined);
      return;
    }

    if (departureDate && departureDate.getTime() <= date.getTime()) {
      setDepartureDate(undefined);
      return;
    }

    if (departureDate) {
      const overlap = getOverlap(blockedDateRanges, date, departureDate);

      if (overlap) {
        setDepartureDate(undefined);
        setCalendarError(`Your stay crosses blocked dates (${formatBlockedRange(overlap.startDate, overlap.endDate)}). Choose a departure before that range.`);
      }
    }
  }

  function handleDepartureSelect(date?: Date) {
    setCalendarError("");

    if (!date) {
      setDepartureDate(undefined);
      return;
    }

    if (!arrivalDate) {
      setCalendarError("Choose your arrival date first.");
      return;
    }

    const overlap = getOverlap(blockedDateRanges, arrivalDate, date);

    if (overlap) {
      setDepartureDate(undefined);
      setCalendarError(`Your stay crosses blocked dates (${formatBlockedRange(overlap.startDate, overlap.endDate)}). Choose a departure before that range.`);
      return;
    }

    setDepartureDate(date);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setCalendarError("");

    if (!arrivalDate || !departureDate) {
      event.preventDefault();
      setCalendarError("Choose both arrival and departure dates from the calendars.");
      return;
    }

    if (departureDate.getTime() <= arrivalDate.getTime()) {
      event.preventDefault();
      setCalendarError("Departure must be after arrival.");
      return;
    }

    const overlap = getOverlap(blockedDateRanges, arrivalDate, departureDate);

    if (overlap) {
      event.preventDefault();
      setCalendarError(`Those dates overlap booked dates (${formatBlockedRange(overlap.startDate, overlap.endDate)}).`);
    }
  }

  return (
    <>
      <form action={formAction} onSubmit={handleSubmit} className="quote-panel rounded-[2rem] p-6 md:p-8">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
        <input type="hidden" name="arrivalDate" value={arrivalDate ? formatIsoDate(arrivalDate) : ""} />
        <input type="hidden" name="departureDate" value={departureDate ? formatIsoDate(departureDate) : ""} />

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

        </div>

        <div className="mt-6 grid gap-6">
          <div className="rounded-[1.5rem] border border-white/70 bg-white/55 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-stone-900">Availability calendar</h2>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  Shaded dates are unavailable, including checkout dates. Choose your arrival first, then a departure before the next blocked range.
                </p>
              </div>
              <div className="rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
                {blockedDateRanges.length} blocked range{blockedDateRanges.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="grid gap-3">
                <div className="rounded-[1.2rem] border border-stone-200 bg-white/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Arrival</p>
                  <p className="mt-2 text-base font-semibold text-stone-900">{formatCalendarSummary(arrivalDate)}</p>
                </div>
                <DayPicker
                  mode="single"
                  selected={arrivalDate}
                  onSelect={handleArrivalSelect}
                  disabled={arrivalDisabled}
                  classNames={calendarClassNames}
                  showOutsideDays
                  fixedWeeks
                />
              </div>

              <div className="grid gap-3">
                <div className="rounded-[1.2rem] border border-stone-200 bg-white/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Departure</p>
                  <p className="mt-2 text-base font-semibold text-stone-900">{formatCalendarSummary(departureDate)}</p>
                </div>
                <DayPicker
                  mode="single"
                  selected={departureDate}
                  onSelect={handleDepartureSelect}
                  disabled={departureDisabled}
                  classNames={calendarClassNames}
                  showOutsideDays
                  fixedWeeks
                />
              </div>
            </div>

            {blockedDateRanges.length > 0 && (
              <div className="mt-5 rounded-[1.2rem] border border-stone-200 bg-white/70 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Blocked dates</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {blockedDateRanges.map((blockedRange) => (
                    <span
                      key={blockedRange.id}
                      className="rounded-full border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700"
                    >
                      {formatBlockedRange(blockedRange.startDate, blockedRange.endDate)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
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

        

        <div className="mt-6 flex flex-col gap-4 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-sm ${state.status === "error" ? "font-semibold text-rose-700" : "text-stone-600"}`}
            aria-live="polite"
          >
            {calendarError || state.message || ""}
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