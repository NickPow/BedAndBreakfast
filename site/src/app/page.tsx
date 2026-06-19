import Link from "next/link";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type FeaturedReviewRow = {
  id: string;
  full_name: string;
  location: string | null;
  rating: number;
  title: string | null;
  comment: string;
};

function renderStars(value: number) {
  const clamped = Math.max(1, Math.min(5, Math.round(value)));
  return "★".repeat(clamped) + "☆".repeat(5 - clamped);
}

export default async function Home() {
  const supabase = getSupabaseServiceClient();

  const { data } = await supabase
    .from("guest_reviews")
    .select("id,full_name,location,rating,title,comment")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(3);

  const featuredReviews = (data ?? []) as FeaturedReviewRow[];

  return (
    <div className="site-shell section-pad space-y-8 md:space-y-12">
      <section className="hero-ribbon grid gap-8 rounded-[1.5rem] p-6">
        <div>
          <h1 className="section-title">Shylow SKI</h1>
          <p className="mt-2 text-lg">Private bed and breakfast in Albion, St Thomas, Jamaica</p>

          <div className="mt-4 space-y-1">
            <p>St Thomas Drive</p>
            <p>Albion, St Thomas, Jamaica</p>
          </div>

          <p className="mt-4">8 guests · 4 bedrooms · 4 beds · 2 shared baths</p>
          

          <div className="mt-6">
            <Link className="button-primary" href="/booking">
              Check availability
            </Link>
          </div>
        </div>
      </section>

      <section className="content-card rounded-[1.5rem] p-5 md:p-6">
        <h2 className="section-title text-2xl md:text-3xl">Location</h2>
        <p className="mt-2 text-sm text-stone-700">Albion, St Thomas, Jamaica</p>
        <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-white/60">
          <iframe
            title="Shylow SKI location map"
            src="https://www.google.com/maps?q=Albion,+St+Thomas,+Jamaica&output=embed"
            width="100%"
            height="420"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>

      <section className="content-card rounded-[1.5rem] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title text-2xl md:text-3xl">Featured guest reviews</h2>
          <Link href="/reviews" className="button-secondary">
            View all reviews
          </Link>
        </div>

        {featuredReviews.length === 0 ? (
          <p className="mt-3 text-sm text-stone-700">
            Guest reviews will appear here after approval.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {featuredReviews.map((review) => (
              <article key={review.id} className="rounded-[1.2rem] border border-white/60 bg-white/75 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent-ink)]">
                  {renderStars(review.rating)}
                </p>
                {review.title && (
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-950">
                    {review.title}
                  </h3>
                )}
                <p className="mt-3 text-sm leading-7 text-stone-700 line-clamp-5">{review.comment}</p>
                <p className="mt-4 text-sm font-semibold text-stone-900">
                  {review.full_name}
                  {review.location ? `, ${review.location}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
