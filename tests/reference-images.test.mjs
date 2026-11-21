import test from "node:test";
import assert from "node:assert/strict";
import { readReferenceImage, MAX_REFERENCE_BYTES } from "../src/lib/storage/media.ts";
import { OpenAIRelayImageProvider } from "../src/lib/ai/openai-relay.ts";
import { GeminiRelayImageProvider } from "../src/lib/ai/gemini-relay.ts";

const origin = "https://sticker.example.com";
const key = "refs/user-a/12345678-1234-1234-1234-123456789abc.png";
const url = `${origin}/media/${key}`;
const bytes = new Uint8Array([0, 1, 127, 128, 254, 255]);
const request = {
  prompt: "Reference regression fixture", aspectRatio: "1:1", resolution: "4K", gridSize: "3x3",
  referenceImages: [{ image: new Blob([bytes], { type: "image/png" }), role: "character" }],
};

function configure(t, provider = "openai") {
  const vars = {
    AI_IMAGE_PROVIDER: provider, AI_IMAGE_API_BASE: "https://relay.example/v1",
    AI_IMAGE_API_KEY: "test-key-only", AI_IMAGE_MODEL: "gpt-image-test",
    AI_IMAGE_SIZE: "1024x1024", AI_IMAGE_QUALITY: "auto",
  };
  const old = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
  Object.assign(process.env, vars);
  t.after(() => {
    for (const [k,v] of Object.entries(old)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  });
}

test("private reference is read from R2 with byte and MIME preservation, without HTTP", async t => {
  t.mock.method(globalThis, "fetch", () => { throw Error("No HTTP reference fetch is allowed"); });
  let reads = 0;
  const image = await readReferenceImage({ get: async requestedKey => {
    reads++;
    assert.equal(requestedKey, key);
    return { size: bytes.length, httpMetadata: { contentType: "image/png" }, blob: async () => new Blob([bytes]) };
  } }, url, "user-a", origin);
  assert.equal(reads, 1);
  assert.equal(image.type, "image/png");
  assert.deepEqual(new Uint8Array(await image.arrayBuffer()), bytes);
});

test("invalid ownership and URLs never read the bucket", async () => {
  const bucket = { get: async () => { assert.fail("Invalid reference reached R2"); } };
  for (const bad of [url.replace("user-a", "user-b"), url.replace("sticker.example.com", "attacker.example"), `${url}?signature=secret`, `${origin}/media/packs/user-a/1234/master.png`]) {
    await assert.rejects(readReferenceImage(bucket, bad, "user-a", origin), /does not belong/);
  }
});

test("missing, oversized, empty or non-image references fail before buffering", async () => {
  await assert.rejects(readReferenceImage({ get: async () => null }, url, "user-a", origin), /no longer available/);
  for (const [size, type] of [[MAX_REFERENCE_BYTES + 1, "image/png"], [0, "image/png"], [1, "text/html"], [1, undefined]]) {
    let cancelled = false;
    const bucket = { get: async () => ({ size, httpMetadata: { contentType: type }, body: { cancel: async () => { cancelled = true; } }, blob: async () => assert.fail("Invalid image was buffered") }) };
    await assert.rejects(readReferenceImage(bucket, url, "user-a", origin), /unsupported type or size/);
    assert.equal(cancelled, true);
  }
});

test("OpenAI edits sends R2 image bytes as multipart without fetching a reference URL", async t => {
  configure(t);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (target, options) => {
    calls++;
    assert.equal(target, "https://relay.example/v1/images/edits");
    assert.equal(options.method, "POST");
    // Round-trip multipart encoding as an upstream server would receive it.
    const form = await new Request(target, options).formData();
    const [image] = form.getAll("image[]");
    assert.equal(image.name, "ref_1.png");
    assert.equal(image.type, "image/png");
    assert.deepEqual(new Uint8Array(await image.arrayBuffer()), bytes);
    assert.equal(form.get("prompt"), request.prompt);
    return Response.json({ data: [{ b64_json: Buffer.from(bytes).toString("base64") }] });
  });
  const result = await new OpenAIRelayImageProvider().generateGrid(request);
  assert.equal(calls, 1);
  assert.deepEqual(result.imageBytes, bytes);
});

test("unsupported OpenAI edits falls back to chat with the same inline reference bytes", async t => {
  configure(t);
  const calls = [];
  t.mock.method(globalThis, "fetch", async (target, options) => {
    calls.push(target);
    if (target === "https://relay.example/v1/images/edits") return new Response("Unsupported endpoint", { status: 404 });
    assert.equal(target, "https://relay.example/v1/chat/completions");
    const body = JSON.parse(options.body);
    assert.equal(body.messages[0].content[1].image_url.url, `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`);
    return Response.json({ choices: [{ message: { images: [{ image_url: { url: `data:image/png;base64,${Buffer.from(bytes).toString("base64")}` } }] } }] });
  });
  assert.deepEqual((await new OpenAIRelayImageProvider().generateGrid(request)).imageBytes, bytes);
  assert.equal(calls.length, 2);
});

test("Gemini sends every reference inline without fetching or silently omitting images", async t => {
  configure(t, "gemini-relay");
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (target, options) => {
    calls++;
    assert.ok(target.startsWith("https://relay.example/v1/models/gpt-image-test:generateContent?"));
    const parts = JSON.parse(options.body).contents[0].parts;
    assert.equal(parts.length, 3);
    assert.deepEqual(parts.slice(1).map(p => p.inlineData), [
      { mimeType: "image/png", data: Buffer.from(bytes).toString("base64") },
      { mimeType: "image/webp", data: Buffer.from(bytes).toString("base64") },
    ]);
    return Response.json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: Buffer.from(bytes).toString("base64") } }] } }] });
  });
  const refs = [...request.referenceImages, { image: new Blob([bytes], { type: "image/webp" }), role: "pet" }];
  assert.deepEqual((await new GeminiRelayImageProvider().generateGrid({ ...request, referenceImages: refs })).imageBytes, bytes);
  assert.equal(calls, 1);
});

test("text-only OpenAI generation still uses the generations endpoint", async t => {
  configure(t);
  t.mock.method(globalThis, "fetch", async (target, options) => {
    assert.equal(target, "https://relay.example/v1/images/generations");
    assert.equal(JSON.parse(options.body).prompt, request.prompt);
    return Response.json({ data: [{ b64_json: Buffer.from(bytes).toString("base64") }] });
  });
  assert.deepEqual((await new OpenAIRelayImageProvider().generateGrid({ ...request, referenceImages: [] })).imageBytes, bytes);
});
