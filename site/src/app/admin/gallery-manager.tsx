"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type GalleryImageItem = {
  id: string;
  src: string;
  altText: string;
  caption: string;
};

type GalleryManagerProps = {
  images: GalleryImageItem[];
  uploadAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  reorderAction: (formData: FormData) => void;
  importLegacyAction: () => void;
};

function reorderIds(ids: string[], draggedId: string, targetId: string) {
  if (draggedId === targetId) {
    return ids;
  }

  const fromIndex = ids.indexOf(draggedId);
  const toIndex = ids.indexOf(targetId);

  if (fromIndex < 0 || toIndex < 0) {
    return ids;
  }

  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) {
    return ids;
  }
   next.splice(toIndex, 0, moved);
   return next;
}

export function GalleryManager({ images, uploadAction, deleteAction, reorderAction, importLegacyAction }: GalleryManagerProps) {
  const [orderedIds, setOrderedIds] = useState(images.map((image) => image.id));
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const imageById = useMemo(() => {
    return new Map(images.map((image) => [image.id, image]));
  }, [images]);

  const orderedImages = orderedIds
    .map((id) => imageById.get(id))
    .filter((image): image is GalleryImageItem => Boolean(image));

  return (
    <section className="content-card rounded-[1.6rem] p-6 md:p-8">
      <h2 className="font-serif text-3xl text-stone-900">Gallery manager</h2>
      <p className="section-copy mt-2">
        Upload, reorder, and remove images from the public gallery. Changes appear on the pictures page after save.
      </p>

      <form action={importLegacyAction} className="mt-4">
        <button type="submit" className="button-secondary">
          Import existing site images
        </button>
      </form>

      <form action={uploadAction} className="mt-5 grid gap-3 rounded-2xl border border-stone-200 bg-white/70 p-4 md:grid-cols-3">
        <label className="grid gap-2 md:col-span-3">
          <span className="text-sm font-semibold text-stone-800">Image file</span>
          <input className="input-field" type="file" name="galleryImage" accept="image/jpeg,image/png,image/webp" required />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-stone-800">Alt text (optional)</span>
          <input className="input-field" name="altText" maxLength={180} placeholder="Poolside morning view" />
        </label>

        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-semibold text-stone-800">Caption (optional)</span>
          <input className="input-field" name="caption" maxLength={500} placeholder="Golden hour from the veranda" />
        </label>

        <div className="md:col-span-3">
          <button type="submit" className="button-primary">
            Upload image
          </button>
        </div>
      </form>

      {orderedImages.length === 0 ? (
        <p className="section-copy mt-5">No gallery images yet. Upload one to start building the gallery.</p>
      ) : (
        <>
          <form action={reorderAction} className="mt-5">
            <input type="hidden" name="orderedIds" value={JSON.stringify(orderedIds)} />
            <button type="submit" className="button-secondary">
              Save order
            </button>
          </form>

          <ul className="mt-4 grid gap-3">
            {orderedImages.map((image) => (
              <li
                key={image.id}
                draggable
                onDragStart={() => setDraggedId(image.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!draggedId) {
                    return;
                  }
                  setOrderedIds((current) => reorderIds(current, draggedId, image.id));
                  setDraggedId(null);
                }}
                onDragEnd={() => setDraggedId(null)}
                className="grid gap-3 rounded-2xl border border-stone-200 bg-white/80 p-3 md:grid-cols-[7rem_minmax(0,1fr)_auto] md:items-center"
              >
                <div className="relative h-24 w-full overflow-hidden rounded-xl border border-stone-200 md:w-28">
                  <Image src={image.src} alt={image.altText || "Gallery image"} fill className="object-cover" sizes="112px" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Drag handle</p>
                  <p className="mt-1 text-sm font-semibold text-stone-800">Drag this card to reorder gallery images.</p>
                  {image.caption ? <p className="mt-2 text-sm text-stone-700">{image.caption}</p> : null}
                </div>

                <form action={deleteAction}>
                  <input type="hidden" name="galleryImageId" value={image.id} />
                  <button type="submit" className="button-secondary" aria-label="Delete gallery image">
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
