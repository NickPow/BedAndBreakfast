import { ReviewForm } from "./review-form";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type PublicReviewRow = {
  id: string;
  full_name: string;
  location: string | null;
  rating: number;
  title: string | null;
  comment: string;
  created_at: string;
};

function renderStars(value: number) {
  const clamped = Math.max(1, Math.min(5, Math.round(value)));
  return "★".repeat(clamped) + "☆".repeat(5 - clamped);
}

export default async function ReviewsPage() {
  const supabase = getSupabaseServiceClient();

  const { data } = await supabase
    .from("guest_reviews")
    .select("id,full_name,location,rating,title,comment,created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(24);

  const reviews = (data ?? []) as PublicReviewRow[];

  return (
    <div className="site-shell section-pad grid gap-6">
      <section className="hero-ribbon rounded-[1.6rem] p-6 md:p-8">
        <p className="eyebrow">Guest stories</p>
        <h1 className="section-title mt-3">Reviews</h1>
        <p className="section-copy mt-3 max-w-2xl">
          Real feedback from guests who stayed at Shylow SKI Bed & Breakfast.
        </p>
      </section>

      <section className="content-card rounded-[1.6rem] p-6 md:p-8">
        <h2 className="font-serif text-3xl text-stone-900">Published reviews</h2>

        {reviews.length === 0 ? (
          <p className="section-copy mt-3">No published reviews yet. Be the first to share your experience.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-stone-200 bg-white/80 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent-ink)]">
                  {renderStars(review.rating)}
                </p>
                {review.title && <h3 className="mt-2 font-serif text-2xl text-stone-900">{review.title}</h3>}
                <p className="mt-3 text-sm leading-7 text-stone-700">{review.comment}</p>
                <p className="mt-4 text-sm font-semibold text-stone-800">
                  {review.full_name}
                  {review.location ? `, ${review.location}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <ReviewForm />
    </div>
  );
}
