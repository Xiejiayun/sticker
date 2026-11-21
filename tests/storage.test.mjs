import test from "node:test";
import assert from "node:assert/strict";
import { imageUrl, objectKey, ownedReference, signedImageUrl, verifyImageUrl, MAX_REFERENCE_BYTES } from "../src/lib/storage/media.ts";
import { serveMedia } from "../cloudflare/media.js";

const origin = "https://sticker.example.com";
const secret = "test-secret-only-not-for-production-123456789";
const key = "refs/user-a/12345678-1234-1234-1234-123456789abc.png";
const url = imageUrl(key, origin);

test("stored URLs are stable, and references are restricted to their owner", () => {
  assert.equal(objectKey(url, origin), key);
  assert.equal(ownedReference(url, "user-a", origin), true);
  for (const other of [url.replace("user-a", "user-b"), url.replace("sticker.example.com", "attacker.example"), "data:image/png;base64,abc", url+"?signature=temporary", url.replace("https://", "https://user:password@")]) {
    assert.equal(ownedReference(other, "user-a", origin), false);
  }
});

test("image permissions expire and bind the path, method, size and MIME type", async () => {
  const signed = await signedImageUrl({ url, secret, method: "PUT", size: 3, contentType: "image/png", expiresIn: 600, now: 1_000_000 });
  assert.equal(await verifyImageUrl(new URL(signed), "PUT", secret, 1_000_000), true);
  assert.equal(await verifyImageUrl(new URL(signed), "GET", secret, 1_000_000), false);
  assert.equal(await verifyImageUrl(new URL(signed), "PUT", secret, 1_601_000), false);
  assert.equal(await verifyImageUrl(new URL(signed), "PUT", "different-test-key-with-32-characters", 1_000_000), false);
  for (const [field, value] of [["size","4"],["type","image/svg+xml"],["expires","2000"],["signature","invalid"]]) {
    const changed = new URL(signed); changed.searchParams.set(field,value);
    assert.equal(await verifyImageUrl(changed, "PUT", secret, 1_000_000), false);
  }
  const changedPath = new URL(signed); changedPath.pathname = changedPath.pathname.replace("user-a","user-b");
  assert.equal(await verifyImageUrl(changedPath, "PUT", secret, 1_000_000), false);
});

function fixture() {
  const objects = new Map();
  const env = { R2_SIGNING_SECRET: secret, STICKER_IMAGES: {
    async put(key, body, options) {
      assert.equal(options.onlyIf.etagDoesNotMatch, "*");
      if (objects.has(key)) return null;
      const bytes = new Uint8Array(await new Response(body).arrayBuffer());
      objects.set(key,{bytes,metadata:options.httpMetadata});
      return { key };
    },
    async get(key) {
      const stored = objects.get(key); if (!stored) return null;
      return { size:stored.bytes.length, httpEtag:'"test-etag"', body:stored.bytes,
        writeHttpMetadata(headers) { headers.set("Content-Type",stored.metadata.contentType); }
      };
    },
    async head(key) { return this.get(key); },
  }};
  return { env, objects };
}

test("private uploads stream to R2, cannot be replayed, and reads require authorization", async () => {
  const { env, objects } = fixture();
  assert.equal((await serveMedia(new Request(url),env)).status,403);
  const uploadUrl = await signedImageUrl({url,secret,method:"PUT",size:3,contentType:"image/png",expiresIn:600});
  const upload = () => new Request(uploadUrl,{method:"PUT",headers:{"Content-Type":"image/png","Content-Length":"3"},body:new Uint8Array([1,2,3])});
  assert.equal((await serveMedia(upload(),env)).status,201);
  assert.equal(objects.size,1);
  assert.equal((await serveMedia(upload(),env)).status,409);
  assert.equal((await serveMedia(new Request(url),env)).status,403);
  const readUrl = await signedImageUrl({url,secret,method:"GET"});
  const read = await serveMedia(new Request(readUrl),env);
  assert.equal(read.status,200);
  assert.deepEqual(new Uint8Array(await read.arrayBuffer()),new Uint8Array([1,2,3]));
  assert.equal(read.headers.get("Content-Type"),"image/png");
  assert.match(read.headers.get("Cache-Control"),/^private/);
  assert.equal((await serveMedia(new Request(readUrl,{method:"HEAD"}),env)).status,200);
});

test("wrong upload type, wrong length, oversize and missing storage fail without writing", async () => {
  const { env, objects } = fixture();
  const uploadUrl = await signedImageUrl({url,secret,method:"PUT",size:3,contentType:"image/png",expiresIn:600});
  for (const headers of [{"Content-Type":"image/jpeg","Content-Length":"3"},{"Content-Type":"image/png","Content-Length":"2"}]) {
    assert.equal((await serveMedia(new Request(uploadUrl,{method:"PUT",headers,body:"abc"}),env)).status,400);
  }
  const large = await signedImageUrl({url,secret,method:"PUT",size:MAX_REFERENCE_BYTES+1,contentType:"image/png",expiresIn:600});
  assert.equal((await serveMedia(new Request(large,{method:"PUT",body:"abc"}),env)).status,400);
  assert.equal((await serveMedia(new Request(url),{})).status,503);
  assert.equal(objects.size,0);
});
