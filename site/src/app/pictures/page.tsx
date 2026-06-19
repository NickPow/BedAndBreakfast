import { readdirSync } from "node:fs";
import { join } from "node:path";
import { GalleryLightbox } from "./gallery-lightbox";

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
      <GalleryLightbox photos={photos} />
    </div>
  );
}