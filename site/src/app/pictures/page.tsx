import { readdirSync } from "node:fs";
import { join } from "node:path";
import { GalleryLightbox } from "./gallery-lightbox";
import { GALLERY_IMAGES_BUCKET } from "@/lib/media/constants";
import { getSignedImageUrl } from "@/lib/media/storage";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const SUPPORTED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

type GalleryPhotoRow = {
  id: string;
  storage_path: string;
  alt_text: string;
  caption: string;
};

export const dynamic = "force-dynamic";

export default async function PicturesPage() {
  const supabase = getSupabaseServiceClient();

  const { data } = await supabase
    .from("gallery_images")
    .select("id,storage_path,alt_text,caption")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as GalleryPhotoRow[];

  let photos: Array<{ id: string; src: string; alt: string; caption: string }> = [];

  if (rows.length > 0) {
    photos = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        src: await getSignedImageUrl({
          bucket: GALLERY_IMAGES_BUCKET,
          path: row.storage_path,
        }),
        alt: row.alt_text,
        caption: row.caption,
      })),
    );
  } else {
    const imagesDirectory = join(process.cwd(), "public", "images");
    photos = readdirSync(imagesDirectory)
      .filter((fileName) => {
        const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
        return SUPPORTED_IMAGE_EXTENSIONS.has(extension);
      })
      .sort((a, b) => a.localeCompare(b))
      .map((fileName) => ({
        id: fileName,
        src: `/images/${fileName}`,
        alt: "Shylow SKI gallery photo",
        caption: "",
      }));
  }

  return (
    <div className="site-shell section-pad">
      <GalleryLightbox photos={photos} />
    </div>
  );
}