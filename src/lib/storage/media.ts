export const MEDIA_PREFIX = "/media/";
export const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
export const REFERENCE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validObjectKey(key: string): boolean {
  return /^(refs\/[A-Za-z0-9_-]+\/[a-f0-9-]+\.(jpg|png|webp)|packs\/[A-Za-z0-9_-]+\/[a-f0-9-]+\/master\.(png|webp|svg))$/.test(key);
}

export function imageUrl(key: string, origin: string): string {
  if (!validObjectKey(key)) throw new Error("Invalid image object key");
  return new URL(MEDIA_PREFIX + key, new URL(origin).origin).href;
}

export function objectKey(url: string, origin: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== new URL(origin).origin || parsed.username || parsed.password || parsed.search || parsed.hash || !parsed.pathname.startsWith(MEDIA_PREFIX)) return null;
    const key = parsed.pathname.slice(MEDIA_PREFIX.length);
    return validObjectKey(key) ? key : null;
  } catch { return null; }
}

export function ownedReference(url: string, userId: string, origin: string): boolean {
  return objectKey(url, origin)?.startsWith(`refs/${userId}/`) ?? false;
}

export async function readReferenceImage(
  bucket: Pick<R2Bucket, "get">, url: string, userId: string, origin: string
): Promise<Blob> {
  const key = objectKey(url, origin);
  if (!key || !ownedReference(url, userId, origin)) throw new Error("Reference image does not belong to this user");
  // Same-zone fetch() can bypass this Worker and reach a nonexistent origin.
  // Read the private object through its binding, never through the public URL.
  const object = await bucket.get(key);
  if (!object) throw new Error("Reference image is no longer available");
  const contentType = object.httpMetadata?.contentType ?? "";
  if (object.size <= 0 || object.size > MAX_REFERENCE_BYTES || !REFERENCE_TYPES.includes(contentType)) {
    await object.body.cancel();
    throw new Error("Reference image has an unsupported type or size");
  }
  return (await object.blob()).slice(0, object.size, contentType);
}

function message(url: URL, method: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify([
    "sticker-r2-v1", method, url.pathname, url.searchParams.get("expires"),
    method === "PUT" ? url.searchParams.get("type") : "",
    method === "PUT" ? url.searchParams.get("size") : "",
  ]));
}

async function signingKey(secret: string) {
  if (secret.length < 32) throw new Error("R2 signing secret is missing or too short");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signedImageUrl(params: {
  url: string; secret: string; method: "GET" | "PUT"; expiresIn?: number;
  contentType?: string; size?: number; now?: number;
}): Promise<string> {
  const url = new URL(params.url);
  url.searchParams.set("expires", String(Math.floor((params.now ?? Date.now()) / 1000) + (params.expiresIn ?? 3600)));
  if (params.method === "PUT") {
    url.searchParams.set("type", params.contentType ?? "");
    url.searchParams.set("size", String(params.size));
  }
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(params.secret), message(url, params.method)));
  url.searchParams.set("signature", Array.from(signature, byte => byte.toString(16).padStart(2, "0")).join(""));
  return url.href;
}

export async function verifyImageUrl(url: URL, method: string, secret: string, now = Date.now()): Promise<boolean> {
  const expires = Number(url.searchParams.get("expires"));
  const seconds = Math.floor(now / 1000);
  const signature = url.searchParams.get("signature") ?? "";
  if (!Number.isSafeInteger(expires) || expires <= seconds || expires > seconds + 3600 || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const bytes = Uint8Array.from(signature.match(/../g)!, pair => parseInt(pair, 16));
  return crypto.subtle.verify("HMAC", await signingKey(secret), bytes, message(url, method));
}
