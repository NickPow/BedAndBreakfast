import "server-only";

import { randomUUID } from "node:crypto";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_MAX_BYTES,
} from "@/lib/media/constants";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export type MediaValidationResult =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

export function validateImageFile(file: File): MediaValidationResult {
  if (!file || file.size === 0) {
    return { ok: false, message: "Choose an image file before uploading." };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    return {
      ok: false,
      message: "Only JPG, PNG, and WEBP files are allowed.",
    };
  }

  if (file.size > IMAGE_MAX_BYTES) {
    return {
      ok: false,
      message: "Each image must be 5MB or smaller.",
    };
  }

  return { ok: true };
}

function safeExtensionFromFile(file: File) {
  const extensionFromName = file.name.split(".").pop()?.trim().toLowerCase() ?? "";

  if (ALLOWED_IMAGE_EXTENSIONS.includes(extensionFromName as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])) {
    return extensionFromName;
  }

  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "bin";
}

export function buildGalleryStoragePath(file: File) {
  const extension = safeExtensionFromFile(file);
  return `gallery/${new Date().getUTCFullYear()}/${randomUUID()}.${extension}`;
}

export function buildReviewStoragePath(reviewId: string, file: File) {
  const extension = safeExtensionFromFile(file);
  return `reviews/${reviewId}/${randomUUID()}.${extension}`;
}

export async function uploadFileToBucket(params: {
  bucket: string;
  path: string;
  file: File;
}) {
  const supabase = getSupabaseServiceClient();
  const arrayBuffer = await params.file.arrayBuffer();

  const { data, error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, arrayBuffer, {
      contentType: params.file.type,
      upsert: false,
    });

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to upload image.");
  }

  return data;
}

export async function deleteFileFromBucket(params: {
  bucket: string;
  paths: string[];
}) {
  if (params.paths.length === 0) {
    return;
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.storage.from(params.bucket).remove(params.paths);

  if (error) {
    throw new Error(`Unable to delete image file: ${error.message}`);
  }
}

export async function getSignedImageUrl(params: {
  bucket: string;
  path: string;
  expiresInSeconds?: number;
}) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.path, params.expiresInSeconds ?? 60 * 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to sign image URL.");
  }

  return data.signedUrl;
}
