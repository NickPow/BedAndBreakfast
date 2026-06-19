import Image from "next/image";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function getGalleryPhotos() {
  const imagesDirectory = join(process.cwd(), "public", "images");

  return readdirSync(imagesDirectory)
    .filter((fileName) => {
      const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
      return SUPPORTED_IMAGE_EXTENSIONS.has(extension);
    })
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => `/images/${fileName}`);
}

export default function PicturesPage() {
  const photos = getGalleryPhotos();

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