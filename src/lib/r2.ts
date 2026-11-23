import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  imageUrl,
  objectKey,
  signedImageUrl,
  ownedReference,
  readReferenceImage,
  readPackMasterImage,
  type StoreAssetKind,
} from "./storage/media";

function storage() {
  const { env } = getCloudflareContext();
  const isDev = process.env.NODE_ENV === "development";
  const secret =
    env.R2_SIGNING_SECRET ||
    (isDev
      ? process.env.R2_SIGNING_SECRET || "local-dev-only-r2-signing-secret-0123456789abcdef"
      : "");
  const origin = isDev
    ? process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    : env.NEXT_PUBLIC_APP_URL;

  if (!env.STICKER_IMAGES || !secret || !origin) {
    throw new Error("R2 storage is not configured");
  }
  return {
    bucket: env.STICKER_IMAGES,
    secret,
    origin,
    fallbackOrigin: isDev ? env.NEXT_PUBLIC_APP_URL : undefined,
  };
}

export function getDevMediaStorage() {
  if (process.env.NODE_ENV !== "development") return null;
  try {
    return storage();
  } catch {
    return null;
  }
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

export async function getPackMasterImage(url: string, userId: string): Promise<Blob> {
  const { bucket, origin } = storage();
  return readPackMasterImage(bucket, url, userId, origin);
}

export async function listPackStoreAssets(
  userId: string,
  packId: string,
  expiresIn = 3600
): Promise<Partial<Record<StoreAssetKind, string>>> {
  const { bucket, origin, secret } = storage();
  const prefix = `packs/${userId}/${packId}/assets/`;
  const listed = await bucket.list({ prefix });
  const assets: Partial<Record<StoreAssetKind, string>> = {};
  for (const obj of listed.objects) {
    const match = obj.key.match(/\/assets\/(cover|banner|icon)\.(png|webp|svg)$/);
    if (!match) continue;
    const kind = match[1] as StoreAssetKind;
    const url = imageUrl(obj.key, origin);
    assets[kind] = await signedImageUrl({ url, secret, method: "GET", expiresIn });
  }
  return assets;
}

export async function uploadPackStoreAsset(params: {
  userId: string;
  packId: string;
  kind: StoreAssetKind;
  body: Uint8Array;
  contentType: string;
}): Promise<{ url: string; readUrl: string }> {
  const { bucket, origin, secret } = storage();
  const ext =
    params.contentType === "image/webp"
      ? "webp"
      : params.contentType === "image/svg+xml"
        ? "svg"
        : "png";
  const prefix = `packs/${params.userId}/${params.packId}/assets/${params.kind}.`;
  const existing = await bucket.list({ prefix });
  if (existing.objects.length > 0) {
    await bucket.delete(existing.objects.map((o) => o.key));
  }
  const key = `packs/${params.userId}/${params.packId}/assets/${params.kind}.${ext}`;
  await bucket.put(key, params.body, {
    httpMetadata: { contentType: params.contentType, cacheControl: "private, max-age=300" },
  });
  const url = imageUrl(key, origin);
  const readUrl = await signedImageUrl({ url, secret, method: "GET", expiresIn: 3600 });
  return { url, readUrl };
}

export async function deletePackStoreAssets(userId: string, packId: string): Promise<void> {
  const { bucket } = storage();
  const prefix = `packs/${userId}/${packId}/assets/`;
  let cursor: string | undefined;
  do {
    const listed = await bucket.list({ prefix, cursor });
    if (listed.objects.length > 0) {
      await bucket.delete(listed.objects.map((o) => o.key));
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
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
  const { origin, secret, fallbackOrigin } = storage();
  let targetUrl = url;
  if (!objectKey(url, origin)) {
    const legacyKey =
      process.env.NODE_ENV === "development" && fallbackOrigin
        ? objectKey(url, fallbackOrigin)
        : null;
    if (!legacyKey) throw new Error("Image URL does not belong to this storage service");
    targetUrl = imageUrl(legacyKey, origin);
  }
  return signedImageUrl({ url: targetUrl, secret, method: "GET", expiresIn });
}

export async function deleteR2Object(url: string): Promise<void> {
  const { bucket, origin, fallbackOrigin } = storage();
  const key =
    objectKey(url, origin) ??
    (process.env.NODE_ENV === "development" && fallbackOrigin
      ? objectKey(url, fallbackOrigin)
      : null);
  if (!key) throw new Error("Image URL does not belong to this storage service");
  await bucket.delete(key);
}
