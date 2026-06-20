import Image from "next/image";
import { ReviewForm } from "./review-form";
import { REVIEW_IMAGES_BUCKET } from "@/lib/media/constants";
import { getSignedImageUrl } from "@/lib/media/storage";
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

type PublicReviewPhotoRow = {
  id: string;
  review_id: string;
  storage_path: string;
  caption: string;
  sort_order: number;
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
  const reviewIds = reviews.map((review) => review.id);

  const { data: photoRows } = reviewIds.length
    ? await supabase
        .from("review_photos")
        .select("id,review_id,storage_path,caption,sort_order")
        .eq("status", "approved")
        .in("review_id", reviewIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [] as unknown[] };

  const reviewPhotos = (photoRows ?? []) as PublicReviewPhotoRow[];
  const reviewPhotoGroups = new Map<string, Array<{ id: string; src: string; caption: string }>>();

  for (const reviewPhoto of reviewPhotos) {
    const signedUrl = await getSignedImageUrl({
      bucket: REVIEW_IMAGES_BUCKET,
      path: reviewPhoto.storage_path,
    });

    const current = reviewPhotoGroups.get(reviewPhoto.review_id) ?? [];
    current.push({
      id: reviewPhoto.id,
      src: signedUrl,
      caption: reviewPhoto.caption,
    });
    reviewPhotoGroups.set(reviewPhoto.review_id, current);
  }

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

                {(reviewPhotoGroups.get(review.id)?.length ?? 0) > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {(reviewPhotoGroups.get(review.id) ?? []).map((photo) => (
                      <figure key={photo.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                        <div className="relative aspect-[4/3] w-full">
                          <Image
                            src={photo.src}
                            alt="Guest stay photo"
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        </div>
                        {photo.caption ? <figcaption className="px-2 py-1 text-xs text-stone-700">{photo.caption}</figcaption> : null}
                      </figure>
                    ))}
                  </div>
                )}

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
