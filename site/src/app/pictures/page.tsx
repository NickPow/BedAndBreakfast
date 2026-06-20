import { GalleryLightbox } from "./gallery-lightbox";
import { GALLERY_IMAGES_BUCKET } from "@/lib/media/constants";
import { getSignedImageUrl } from "@/lib/media/storage";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

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

  const photos = await Promise.all(
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

  return (
    <div className="site-shell section-pad">
      <GalleryLightbox photos={photos} />
    </div>
  );
}