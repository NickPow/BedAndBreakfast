import { redirect } from "next/navigation";
import {
  approveGuestReview,
  approveBookingRequest,
  createManualDateBlock,
  declineBookingRequest,
  rejectGuestReview,
  removeManualDateBlock,
  signOutAdmin,
} from "@/app/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type BookingRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  guests: number;
  rooms: number;
  arrival_date: string;
  departure_date: string;
  created_at: string;
  message: string;
};

type BlockRow = {
  id: string;
  source_type: "pending_hold" | "booking_confirmed" | "manual_block";
  start_date: string;
  end_date: string;
  note: string;
  booking_request_id: string | null;
};

type PendingReviewRow = {
  id: string;
  full_name: string;
  location: string | null;
  rating: number;
  title: string | null;
  comment: string;
  created_at: string;
};

function isAdminRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() === "admin";
}

function friendlyNotice(notice?: string) {
  switch (notice) {
    case "approved":
      return "Booking confirmed and dates blocked.";
    case "declined":
      return "Booking declined and pending hold released.";
    case "manual-block-added":
      return "Manual date block created.";
    case "manual-block-removed":
      return "Manual date block removed.";
    case "review-approved":
      return "Review approved and published.";
    case "review-rejected":
      return "Review rejected.";
    default:
      return "";
  }
}

function friendlyError(error?: string) {
  switch (error) {
    case "dates-unavailable":
      return "Those dates are already blocked, including checkout dates.";
    case "invalid-manual-block":
      return "Enter a valid manual block date range.";
    case "invalid-remove-block":
      return "Provide a short reason when removing a manual block.";
    case "protected-block":
      return "Booking-generated blocks must be changed through booking status.";
    case "not-pending":
      return "This booking is no longer pending.";
    case "invalid-review":
      return "That review action was invalid.";
    case "invalid-review-rejection":
      return "Please provide a short reason when rejecting a review.";
    case "review-not-pending":
      return "That review is no longer pending.";
    default:
      return "";
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  const authClient = await createSupabaseServerClient();
  const serviceClient = getSupabaseServiceClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const roleResult = await serviceClient
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const roleRow = roleResult.data as { role: string } | null;

  if (!roleRow || !isAdminRole(roleRow.role)) {
    redirect("/admin/login?error=unauthorized");
  }

  const { data: pendingBookings } = await serviceClient
    .from("booking_requests")
    .select(
      "id,full_name,email,phone,guests,rooms,arrival_date,departure_date,created_at,message",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const { data: activeBlocks } = await serviceClient
    .from("date_blocks")
    .select("id,source_type,start_date,end_date,note,booking_request_id")
    .eq("is_active", true)
    .order("start_date", { ascending: true });

  const { data: pendingReviews } = await serviceClient
    .from("guest_reviews")
    .select("id,full_name,location,rating,title,comment,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const bookings = (pendingBookings ?? []) as BookingRow[];
  const blocks = (activeBlocks ?? []) as BlockRow[];
  const reviews = (pendingReviews ?? []) as PendingReviewRow[];

  return (
    <div className="site-shell section-pad grid gap-6">
      <section className="quote-panel rounded-[1.8rem] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="eyebrow">Admin dashboard</span>
            <h1 className="section-title mt-3">Booking controls</h1>
            <p className="section-copy mt-2">
              Pending requests hold dates immediately. Checkout dates remain blocked.
            </p>
          </div>

          <form action={signOutAdmin}>
            <button type="submit" className="button-secondary">
              Sign out
            </button>
          </form>
        </div>

        {notice && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            {friendlyNotice(notice)}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {friendlyError(error) || "An action could not be completed."}
          </p>
        )}
      </section>

      <section className="content-card rounded-[1.6rem] p-6 md:p-8">
        <h2 className="font-serif text-3xl text-stone-900">Pending requests</h2>

        {bookings.length === 0 ? (
          <p className="section-copy mt-3">No pending requests right now.</p>
        ) : (
          <div className="mt-5 grid gap-4">
            {bookings.map((booking) => (
              <article key={booking.id} className="rounded-2xl border border-stone-200 bg-white/80 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-2xl text-stone-900">{booking.full_name}</h3>
                    <p className="mt-1 text-sm text-stone-700">{booking.email} · {booking.phone}</p>
                    <p className="mt-2 text-sm text-stone-700">
                      {booking.arrival_date} to {booking.departure_date} · {booking.guests} guest(s) · {booking.rooms} room(s)
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={approveBookingRequest}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button type="submit" className="button-primary">
                        Approve
                      </button>
                    </form>
                    <form action={declineBookingRequest}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button type="submit" className="button-secondary">
                        Decline
                      </button>
                    </form>
                  </div>
                </div>

                {booking.message && (
                  <p className="mt-3 text-sm leading-7 text-stone-700">{booking.message}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="content-card rounded-[1.6rem] p-6 md:p-8">
        <h2 className="font-serif text-3xl text-stone-900">Pending reviews</h2>

        {reviews.length === 0 ? (
          <p className="section-copy mt-3">No pending reviews right now.</p>
        ) : (
          <div className="mt-5 grid gap-4">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-stone-200 bg-white/80 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-2xl text-stone-900">
                      {review.title || "Guest review"}
                    </h3>
                    <p className="mt-1 text-sm text-stone-700">
                      {review.full_name}
                      {review.location ? `, ${review.location}` : ""}
                    </p>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent-ink)]">
                      {"★".repeat(Math.max(1, Math.min(5, Math.round(review.rating))))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={approveGuestReview}>
                      <input type="hidden" name="reviewId" value={review.id} />
                      <button type="submit" className="button-primary">
                        Approve
                      </button>
                    </form>
                    <form action={rejectGuestReview} className="grid gap-2 sm:min-w-72">
                      <input type="hidden" name="reviewId" value={review.id} />
                      <input
                        className="input-field"
                        name="reason"
                        placeholder="Reason for rejecting this review"
                        required
                      />
                      <button type="submit" className="button-secondary">
                        Reject
                      </button>
                    </form>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-7 text-stone-700">{review.comment}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="content-card rounded-[1.6rem] p-6 md:p-8">
        <h2 className="font-serif text-3xl text-stone-900">Manual date block</h2>
        <form action={createManualDateBlock} className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">Start date</span>
            <input className="input-field" name="startDate" type="date" required />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-stone-800">End date</span>
            <input className="input-field" name="endDate" type="date" required />
          </label>

          <label className="grid gap-2 md:col-span-1">
            <span className="text-sm font-semibold text-stone-800">Note (optional)</span>
            <input className="input-field" name="note" placeholder="Maintenance, owner stay, etc." />
          </label>

          <div className="md:col-span-3">
            <button type="submit" className="button-primary">
              Add manual block
            </button>
          </div>
        </form>
      </section>

      <section className="content-card rounded-[1.6rem] p-6 md:p-8">
        <h2 className="font-serif text-3xl text-stone-900">Active blocked dates</h2>

        {blocks.length === 0 ? (
          <p className="section-copy mt-3">No active blocks.</p>
        ) : (
          <div className="mt-5 grid gap-4">
            {blocks.map((block) => (
              <article key={block.id} className="rounded-2xl border border-stone-200 bg-white/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-stone-600">
                      {block.source_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-base font-semibold text-stone-900">
                      {block.start_date} to {block.end_date}
                    </p>
                    {block.note && <p className="mt-2 text-sm text-stone-700">{block.note}</p>}
                  </div>

                  {block.source_type === "manual_block" && (
                    <form action={removeManualDateBlock} className="grid gap-2 sm:min-w-72">
                      <input type="hidden" name="blockId" value={block.id} />
                      <input
                        className="input-field"
                        name="reason"
                        placeholder="Reason for removing this block"
                        required
                      />
                      <button type="submit" className="button-secondary">
                        Remove manual block
                      </button>
                    </form>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
