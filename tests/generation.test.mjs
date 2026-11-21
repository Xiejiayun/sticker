import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { compileFunction } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL("../src/app/api/packs/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const referenceUrl = "https://sticker.example/media/refs/user-a/1234.jpg";

function fixture(generate, options = {}) {
  const state = { balance: 100, holds: 0, refunds: 0, pack: null };
  const db = {
    insert: () => ({ values: async values => { state.pack = { ...values }; } }),
    update: () => ({ set: values => ({ where: async () => { Object.assign(state.pack, values); } }) }),
  };
  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "drizzle-orm": { desc: value => value, eq: () => true },
    zod: require("zod"),
    "@/lib/auth": { getServerSession: async () => options.anonymous ? null : { user: { id: "user-a" } } },
    "@/db": { getDb: () => db, stickerPacks: {} },
    "@/config/pricing": { getGridCreditCost: () => 15 },
    "@/config/styles": { getStylePresetById: () => ({}) },
    "@/config/themes": { getThemePackById: () => ({}), buildDefaultSlots: () => Array.from({ length: 9 }, (_, index) => ({ index, pose: "wave", caption: "" })) },
    "@/lib/credits": {
      holdCredits: async () => { state.holds++; return state.balance -= 15; },
      addCredits: async (user, amount, type, id) => {
        assert.equal(user, "user-a"); assert.equal(type, "REFUND"); assert.equal(id, state.pack.id);
        state.refunds++; return state.balance += amount;
      },
    },
    "@/lib/r2": {
      isR2Configured: () => true, isOwnedReferenceUrl: () => true, referenceExists: async () => options.referenceMissing !== true,
      getReferenceImage: async () => new Blob(["fixture"], { type: "image/jpeg" }),
      uploadBufferToR2: async () => "https://sticker.example/media/packs/user-a/1234/master.png",
      getObjectReadUrl: async url => `${url}?signature=test-only`,
    },
    "@/lib/prompt/enhancer": { enhanceSubjectDescription: async value => value },
    "@/lib/prompt/builder": { buildStickerGridPrompt: () => "test prompt" },
    "@/lib/ai/factory": { getImageProvider: () => ({ generateGrid: generate }) },
  };
  const mod = { exports: {} };
  compileFunction(compiled, ["require", "module", "exports"])(id => {
    assert.ok(id in modules, `Unexpected dependency: ${id}`);
    return modules[id];
  }, mod, mod.exports);
  return { state, post: mod.exports.POST };
}

function request(signal) {
  return new Request("https://sticker.example/api/packs", {
    method: "POST", signal, headers: { "content-type": "application/json" },
    body: JSON.stringify({ gridSize: "3x3", styleId: "test", themeId: "test", captionMode: "none", userPrompt: "fixture", references: [{ url: referenceUrl, role: "character", mimeType: "image/jpeg" }] }),
  });
}

test("POST stays pending while AI runs and returns the completed R2 result", async () => {
  let release, started;
  const gate = new Promise(resolve => { release = resolve; });
  const entered = new Promise(resolve => { started = resolve; });
  const { post, state } = fixture(async req => {
    assert.ok(req.signal instanceof AbortSignal);
    assert.equal(req.referenceImages[0].image.type, "image/jpeg");
    started(); await gate;
    return { imageBytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" };
  });
  let returned = false;
  const pending = post(request()).then(response => { returned = true; return response; });
  await entered;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(returned, false, "Returning 202 before generation would trigger the 30-second background limit");
  assert.equal(state.pack.status, "PROCESSING");
  release();
  const response = await pending;
  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(data.pack.status, "COMPLETED");
  assert.match(data.pack.masterImageUrl, /signature=test-only/);
  assert.equal(state.pack.masterImageUrl.includes("?"), false);
  assert.equal(state.pack.referenceImages[0].url, referenceUrl);
  assert.equal(state.balance, 85);
  assert.equal(state.refunds, 0);
});

test("provider failure returns a failed pack after refunding once", async () => {
  const { post, state } = fixture(async () => { throw Error("Relay failed"); });
  const response = await post(request());
  assert.equal(response.status, 502);
  const data = await response.json();
  assert.equal(data.pack.status, "FAILED");
  assert.equal(data.pack.errorMessage, "Relay failed");
  assert.equal(data.remainingBalance, 100);
  assert.equal(state.refunds, 1);
});

for (const reason of ["deadline", "disconnect"]) test(`${reason} aborts the provider and reaches the refund path`, async t => {
  const controller = new AbortController();
  if (reason === "deadline") t.mock.method(AbortSignal, "timeout", ms => {
    assert.equal(ms, 300000); return controller.signal;
  });
  let started;
  const entered = new Promise(resolve => { started = resolve; });
  const { post, state } = fixture(req => new Promise((resolve, reject) => {
    req.signal.addEventListener("abort", () => reject(req.signal.reason), { once: true });
    started();
  }));
  const pending = post(request(reason === "disconnect" ? controller.signal : undefined));
  await entered; controller.abort();
  const response = await pending;
  assert.equal(response.status, 504);
  assert.equal((await response.json()).pack.status, "FAILED");
  assert.equal(state.balance, 100);
  assert.equal(state.refunds, 1);
});

test("authorization and reference validation still run before charging credits", async () => {
  for (const [options, status] of [[{ anonymous: true }, 401], [{ referenceMissing: true }, 400]]) {
    const { post, state } = fixture(() => assert.fail("AI must not run"), options);
    assert.equal((await post(request())).status, status);
    assert.equal(state.holds, 0);
  }
});
