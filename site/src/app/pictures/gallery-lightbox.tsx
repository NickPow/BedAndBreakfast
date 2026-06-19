"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type GalleryLightboxProps = {
  photos: string[];
};

export function GalleryLightbox({ photos }: GalleryLightboxProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => {
    setOpenIndex(null);
  }, []);

  const goToPrevious = useCallback(() => {
    setOpenIndex((current) => {
      if (current === null) {
        return null;
      }

      return current === 0 ? photos.length - 1 : current - 1;
    });
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setOpenIndex((current) => {
      if (current === null) {
        return null;
      }

      return current === photos.length - 1 ? 0 : current + 1;
    });
  }, [photos.length]);

  useEffect(() => {
    if (openIndex === null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        goToPrevious();
      }

      if (event.key === "ArrowRight") {
        goToNext();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeLightbox, goToNext, goToPrevious, openIndex]);

  if (photos.length === 0) {
    return <p className="section-copy">No photos are available right now.</p>;
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((src, index) => (
          <article key={src} className="media-card overflow-hidden">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="relative block aspect-[4/3] w-full cursor-zoom-in transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)]"
              onClick={(event) => {
                event.preventDefault();
                setOpenIndex(index);
              }}
              aria-label={`Open photo ${index + 1} in full view`}
            >
              <Image
                src={src}
                alt={`Shylow SKI photo ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                priority={index < 2}
              />
            </a>
          </article>
        ))}
      </section>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          onClick={closeLightbox}
        >
          <div
            className="relative w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-stone-900"
              aria-label="Close gallery"
            >
              Close
            </button>

            <div className="relative h-[75vh] w-full overflow-hidden rounded-2xl border border-white/20 bg-stone-900/50">
              <Image
                src={photos[openIndex]}
                alt={`Shylow SKI photo ${openIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-stone-900"
              aria-label="Previous photo"
            >
              ←
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-stone-900"
              aria-label="Next photo"
            >
              →
            </button>

            <p className="mt-3 text-center text-sm font-semibold text-white/90">
              {openIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
