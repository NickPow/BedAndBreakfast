export const GALLERY_IMAGES_BUCKET = "gallery-images";
export const REVIEW_IMAGES_BUCKET = "review-images";

export const REVIEW_MAX_PHOTOS = 3;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
