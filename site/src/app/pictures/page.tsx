import Image from "next/image";

const photos = [
  "/images/20180228_063624_1.jpg",
  "/images/20180301_014223.jpg",
  "/images/received_133216870838480.jpeg",
  "/images/received_133216987505135.jpeg",
  "/images/received_133217887505045.jpeg",
  "/images/received_133217894171711.jpeg",
  "/images/received_133218344171666.jpeg",
  "/images/received_1809764739044971.jpeg",
];

export default function PicturesPage() {
  return (
    <div className="site-shell section-pad">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {photos.map((src, index) => (
          <article key={src} className="media-card overflow-hidden">
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={src}
                alt={`Shylow SKI photo ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                priority={index < 2}
              />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}