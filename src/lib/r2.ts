import { getCloudflareContext } from "@opennextjs/cloudflare";
import { imageUrl, objectKey, signedImageUrl, ownedReference, readReferenceImage } from "./storage/media";

function storage() {
  const { env } = getCloudflareContext();
  if (!env.STICKER_IMAGES || !env.R2_SIGNING_SECRET) throw new Error("R2 storage is not configured");
  return { bucket: env.STICKER_IMAGES, secret: env.R2_SIGNING_SECRET, origin: env.NEXT_PUBLIC_APP_URL };
}

export function isR2Configured(): boolean {
  // Local Next development may not have a Worker context; uploads then return 503.
  try { storage(); return true; } catch { return false; }
}

export function isOwnedReferenceUrl(url: string, userId: string): boolean {
  return ownedReference(url, userId, storage().origin);
}

export async function referenceExists(url: string): Promise<boolean> {
  const { bucket, origin } = storage();
  const key = objectKey(url, origin);
  return Boolean(key && await bucket.head(key));
}

export async function getReferenceImage(url: string, userId: string): Promise<Blob> {
  const { bucket, origin } = storage();
  return readReferenceImage(bucket, url, userId, origin);
}

export async function createPresignedUploadUrl(params: {
  key: string; contentType: string; fileSize: number;
}): Promise<{ uploadUrl: string; url: string }> {
  const { origin, secret } = storage();
  const url = imageUrl(params.key, origin);
  return {
    url,
    uploadUrl: await signedImageUrl({ url, secret, method: "PUT", expiresIn: 600, contentType: params.contentType, size: params.fileSize }),
  };
}

export async function uploadBufferToR2(params: {
  key: string; body: Uint8Array; contentType: string;
}): Promise<string> {
  const { bucket, origin } = storage();
  await bucket.put(params.key, params.body, { httpMetadata: { contentType: params.contentType, cacheControl: "private, max-age=300" } });
  return imageUrl(params.key, origin);
}

export async function getObjectReadUrl(url: string, expiresIn = 3600): Promise<string> {
  const { origin, secret } = storage();
  if (!objectKey(url, origin)) throw new Error("Image URL does not belong to this storage service");
  return signedImageUrl({ url, secret, method: "GET", expiresIn });
}

export async function deleteR2Object(url: string): Promise<void> {
  const { bucket, origin } = storage();
  const key = objectKey(url, origin);
  if (!key) throw new Error("Image URL does not belong to this storage service");
  await bucket.delete(key);
}
