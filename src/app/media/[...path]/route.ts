import { getDevMediaStorage } from "@/lib/r2";
import {
  MAX_REFERENCE_BYTES,
  MEDIA_PREFIX,
  REFERENCE_TYPES,
  validObjectKey,
  verifyImageUrl,
} from "@/lib/storage/media";

function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch || !etag) return false;
  const normalizedEtag = etag.replace(/^W\//, "");
  return ifNoneMatch.split(",").some((candidate) => {
    const trimmed = candidate.trim();
    return trimmed === "*" || trimmed.replace(/^W\//, "") === normalizedEtag;
  });
}

function applyCommonHeaders(headers: Headers, etag: string) {
  headers.set("ETag", etag);
  headers.set("Cache-Control", "private, max-age=60");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "sandbox; default-src 'none'");
  headers.set("Referrer-Policy", "no-referrer");
}

async function handleRead(request: Request, isHead: boolean): Promise<Response> {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const dev = getDevMediaStorage();
  if (!dev) {
    return new Response("Image storage unavailable", { status: 503 });
  }

  const url = new URL(request.url);
  const key = url.pathname.slice(MEDIA_PREFIX.length);
  if (!validObjectKey(key)) {
    return new Response("Invalid image path", { status: 400 });
  }

  if (!(await verifyImageUrl(url, "GET", dev.secret))) {
    return new Response("Invalid or expired image permission", { status: 403 });
  }

  const ifNoneMatch = !isHead ? request.headers.get("if-none-match") : null;
  if (ifNoneMatch) {
    const head = await dev.bucket.head(key);
    if (!head) return new Response("Image not found", { status: 404 });
    if (etagMatches(ifNoneMatch, head.httpEtag)) {
      const headers = new Headers();
      applyCommonHeaders(headers, head.httpEtag);
      return new Response(null, { status: 304, headers });
    }
  }

  if (isHead) {
    const head = await dev.bucket.head(key);
    if (!head) return new Response("Image not found", { status: 404 });
    const headers = new Headers();
    head.writeHttpMetadata(headers);
    headers.set("Content-Length", String(head.size));
    applyCommonHeaders(headers, head.httpEtag);
    return new Response(null, { headers });
  }

  const object = await dev.bucket.get(key);
  if (!object) return new Response("Image not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Length", String(object.size));
  applyCommonHeaders(headers, object.httpEtag);
  const bytes = await object.arrayBuffer();
  return new Response(bytes, { headers });
}

export async function GET(request: Request) {
  return handleRead(request, false);
}

export async function HEAD(request: Request) {
  return handleRead(request, true);
}

export async function PUT(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const dev = getDevMediaStorage();
  if (!dev) {
    return new Response("Image storage unavailable", { status: 503 });
  }

  const url = new URL(request.url);
  const key = url.pathname.slice(MEDIA_PREFIX.length);
  if (!validObjectKey(key)) {
    return new Response("Invalid image path", { status: 400 });
  }

  if (!(await verifyImageUrl(url, "PUT", dev.secret))) {
    return new Response("Invalid or expired image permission", { status: 403 });
  }

  const size = Number(url.searchParams.get("size"));
  const contentType = url.searchParams.get("type") ?? "";
  if (
    !key.startsWith("refs/") ||
    !Number.isSafeInteger(size) ||
    size <= 0 ||
    size > MAX_REFERENCE_BYTES ||
    !REFERENCE_TYPES.includes(contentType)
  ) {
    return new Response("Invalid upload permission", { status: 400 });
  }

  const headerLength = request.headers.get("content-length");
  if (
    request.headers.get("content-type") !== contentType ||
    (headerLength !== null && headerLength !== String(size))
  ) {
    return new Response("Upload type or size mismatch", { status: 400 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength !== size) {
    return new Response("Upload size mismatch", { status: 400 });
  }

  const stored = await dev.bucket.put(key, bytes, {
    onlyIf: { etagDoesNotMatch: "*" },
    httpMetadata: { contentType, cacheControl: "private, max-age=300" },
  });

  return new Response(null, {
    status: stored ? 201 : 409,
    headers: { "Cache-Control": "no-store" },
  });
}
