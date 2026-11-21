import { MEDIA_PREFIX, MAX_REFERENCE_BYTES, REFERENCE_TYPES, validObjectKey, verifyImageUrl } from "../src/lib/storage/media.ts";

export async function serveMedia(request, env) {
  if (!env.STICKER_IMAGES || !env.R2_SIGNING_SECRET) return new Response("Image storage unavailable", { status: 503 });
  const url = new URL(request.url);
  const key = url.pathname.slice(MEDIA_PREFIX.length);
  if (!validObjectKey(key)) return new Response("Invalid image path", { status: 400 });
  if (!["GET", "HEAD", "PUT"].includes(request.method)) return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD, PUT" } });
  const method = request.method === "HEAD" ? "GET" : request.method;
  if (!await verifyImageUrl(url, method, env.R2_SIGNING_SECRET)) return new Response("Invalid or expired image permission", { status: 403 });

  if (method === "PUT") {
    const size = Number(url.searchParams.get("size"));
    const contentType = url.searchParams.get("type");
    if (!key.startsWith("refs/") || !Number.isSafeInteger(size) || size <= 0 || size > MAX_REFERENCE_BYTES || !REFERENCE_TYPES.includes(contentType)) return new Response("Invalid upload permission", { status: 400 });
    if (request.headers.get("content-type") !== contentType || request.headers.get("content-length") !== String(size) || !request.body) return new Response("Upload type or size mismatch", { status: 400 });
    const stored = await env.STICKER_IMAGES.put(key, request.body, {
      onlyIf: { etagDoesNotMatch: "*" },
      httpMetadata: { contentType, cacheControl: "private, max-age=300" },
    });
    return new Response(null, { status: stored ? 201 : 409, headers: { "Cache-Control": "no-store" } });
  }

  const object = request.method === "HEAD" ? await env.STICKER_IMAGES.head(key) : await env.STICKER_IMAGES.get(key);
  if (!object) return new Response("Image not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Length", String(object.size));
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "sandbox; default-src 'none'");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}
