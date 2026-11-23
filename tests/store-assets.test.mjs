import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { compileFunction } from "node:vm";
import ts from "typescript";
import { STYLE_PRESETS, getStylePresetById } from "../src/config/styles.ts";
import { THEME_PACKS, getThemePackById } from "../src/config/themes.ts";
import { checkStudioMutation } from "../src/lib/studio-request.ts";
import { imageUrl, ownedPackMaster, validObjectKey } from "../src/lib/storage/media.ts";
import { evaluatePlatformChecklist } from "../src/lib/slicer/platform-specs.ts";
import { encodeAnimatedGif } from "../src/lib/slicer/gif-encoder.ts";

const require = createRequire(import.meta.url);

function loadModule(relPath, deps) {
  const source = fs.readFileSync(new URL(relPath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  compileFunction(compiled, ["require", "module", "exports"])(
    (id) => {
      assert.ok(id in deps, `Unexpected dependency in ${relPath}: ${id}`);
      return deps[id];
    },
    mod,
    mod.exports
  );
  return mod.exports;
}

const { buildStoreAssetPrompt } = loadModule("../src/lib/prompt/asset-builder.ts", {
  "@/config/styles": { STYLE_PRESETS, getStylePresetById },
  "@/config/themes": { THEME_PACKS, getThemePackById },
});

const { getExportPresetDimensions } = loadModule("../src/lib/slicer/sticker-processor.ts", {
  jszip: require("jszip"),
  "./grid": {},
});

const VALID_UUID = "11111111-2222-4333-8444-555555555555";
const ORIGIN = "https://sticker.example";
const MASTER_URL = imageUrl(`packs/user-a/${VALID_UUID}/master.png`, ORIGIN);

test("media key validation supports store assets and restricts pack master ownership", () => {
  assert.equal(validObjectKey(`packs/user-a/${VALID_UUID}/assets/cover.png`), true);
  assert.equal(validObjectKey(`packs/user-a/${VALID_UUID}/assets/banner.webp`), true);
  assert.equal(validObjectKey(`packs/user-a/${VALID_UUID}/assets/icon.svg`), true);
  assert.equal(validObjectKey(`packs/user-a/${VALID_UUID}/assets/logo.png`), false);
  assert.equal(validObjectKey(`packs/user-a/${VALID_UUID}/assets/cover.jpg`), false);

  assert.equal(ownedPackMaster(MASTER_URL, "user-a", ORIGIN), true);
  assert.equal(ownedPackMaster(MASTER_URL, "user-b", ORIGIN), false);
  assert.equal(
    ownedPackMaster(imageUrl(`packs/user-a/${VALID_UUID}/assets/cover.png`, ORIGIN), "user-a", ORIGIN),
    false
  );
});

test("buildStoreAssetPrompt enforces no-text banner rules and includes user direction", () => {
  const bannerPrompt = buildStoreAssetPrompt({
    kind: "banner",
    platform: "wechat",
    styleId: "3d-blindbox",
    themeId: "office-worker",
    packUserPrompt: "yellow shiba in striped shirt",
    customUserPrompt: "sitting at a sunny cafe table cheering with iced coffee",
    mood: "cheerful",
  });
  assert.match(bannerPrompt, /ABSOLUTELY NO TEXT ANYWHERE/i);
  assert.match(bannerPrompt, /sitting at a sunny cafe table cheering with iced coffee/);
  assert.match(bannerPrompt, /3D blind box/);

  const coverPrompt = buildStoreAssetPrompt({
    kind: "cover",
    styleId: "chibi-handdrawn",
    themeId: "daily-essentials",
    packUserPrompt: "cute cat",
    customUserPrompt: "waving happily",
  });
  assert.match(coverPrompt, /#FFFFFF/);
  assert.match(coverPrompt, /waving happily/);

  const iconPrompt = buildStoreAssetPrompt({
    kind: "icon",
    styleId: "flat-vector",
    themeId: "daily-essentials",
    packUserPrompt: "cute cat",
  });
  assert.match(iconPrompt, /HEAD-AND-FACE CLOSE-UP/);
  assert.match(iconPrompt, /50x50/);
});

test("evaluatePlatformChecklist checks WeChat, LINE, WhatsApp, and animated conflicts", () => {
  const wechatOk = evaluatePlatformChecklist({
    platform: "wechat",
    stickerCount: 16,
    removeBackground: true,
    animated: false,
    hasAiBanner: true,
    hasAiCover: true,
    hasAiIcon: false,
  });
  assert.equal(wechatOk.every((i) => i.status === "pass"), true);

  const wechat9 = evaluatePlatformChecklist({
    platform: "wechat",
    stickerCount: 9,
    removeBackground: false,
    animated: false,
  });
  assert.equal(wechat9.find((i) => i.id === "count")?.status, "warn");
  assert.equal(wechat9.find((i) => i.id === "transparency")?.status, "warn");

  const lineAnim = evaluatePlatformChecklist({
    platform: "line",
    stickerCount: 16,
    removeBackground: true,
    animated: true,
  });
  assert.equal(lineAnim.find((i) => i.id === "count")?.status, "pass");
  assert.equal(lineAnim.find((i) => i.id === "animation")?.status, "warn");

  assert.deepEqual(getExportPresetDimensions("discord-sticker"), {
    width: 320,
    height: 320,
    ext: "png",
  });
  assert.deepEqual(getExportPresetDimensions("slack"), {
    width: 128,
    height: 128,
    ext: "png",
  });
});

test("encodeAnimatedGif builds adaptive palette with maxColors cap and transparency", () => {
  const w = 32;
  const h = 32;
  const frame = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (x < 4 || y < 4) continue; // transparent border
      frame[o] = (x * 7) % 256;
      frame[o + 1] = (y * 7) % 256;
      frame[o + 2] = 140;
      frame[o + 3] = 255;
    }
  }
  const gifFull = encodeAnimatedGif(w, h, [{ rgba: frame, delayCs: 8 }], { maxColors: 255 });
  const gifLow = encodeAnimatedGif(w, h, [{ rgba: frame, delayCs: 8 }], { maxColors: 16 });
  assert.equal(Buffer.from(gifLow.slice(0, 6)).toString("ascii"), "GIF89a");
  assert.equal(gifLow[gifLow.length - 1], 0x3b);
  assert.ok(gifLow.length <= gifFull.length);
});

function assetRouteFixture(generateAsset, options = {}) {
  const state = { balance: options.balance ?? 50, holds: 0, refunds: 0, uploaded: [] };
  const row = options.missing
    ? []
    : [
        {
          id: VALID_UUID,
          status: options.status ?? "COMPLETED",
          styleId: "3d-blindbox",
          themeId: "office-worker",
          userPrompt: "office shiba",
          masterImageUrl: MASTER_URL,
        },
      ];

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => row,
        }),
      }),
    }),
  };

  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "drizzle-orm": { and: (...args) => args, eq: () => true },
    zod: require("zod"),
    "@/lib/auth": {
      getServerSession: async () => (options.anonymous ? null : { user: { id: "user-a" } }),
    },
    "@/lib/studio-request": { checkStudioMutation },
    "@/db": { getDb: () => db, stickerPacks: { id: "id", userId: "user_id" } },
    "@/config/pricing": { getStoreAssetCreditCost: () => 5 },
    "@/lib/credits": {
      holdCredits: async (userId, cost) => {
        assert.equal(userId, "user-a");
        if (state.balance < cost) return null;
        state.holds++;
        return (state.balance -= cost);
      },
      addCredits: async (userId, amount, type) => {
        assert.equal(userId, "user-a");
        assert.equal(type, "REFUND");
        state.refunds++;
        return (state.balance += amount);
      },
    },
    "@/lib/r2": {
      isR2Configured: () => true,
      listPackStoreAssets: async () => ({
        banner: `${ORIGIN}/media/packs/user-a/${VALID_UUID}/assets/banner.png?signature=read`,
      }),
      getPackMasterImage: async (url, userId) => {
        assert.equal(url, MASTER_URL);
        assert.equal(userId, "user-a");
        return new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
      },
      uploadPackStoreAsset: async (params) => {
        state.uploaded.push(params);
        const readUrl = `${ORIGIN}/media/packs/${params.userId}/${params.packId}/assets/${params.kind}.png?signature=ok`;
        return { url: readUrl.split("?")[0], readUrl };
      },
    },
    "@/lib/ai/factory": { getImageProvider: () => ({ generateAsset }) },
    "@/lib/prompt/asset-builder": { buildStoreAssetPrompt },
  };

  const source = fs.readFileSync(
    new URL("../src/app/api/packs/[id]/assets/route.ts", import.meta.url),
    "utf8"
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const mod = { exports: {} };
  compileFunction(compiled, ["require", "module", "exports"])(
    (id) => {
      assert.ok(id in modules, `Unexpected dependency: ${id}`);
      return modules[id];
    },
    mod,
    mod.exports
  );

  return { state, GET: mod.exports.GET, POST: mod.exports.POST };
}

test("GET and POST /api/packs/[id]/assets handle auth, credits, AI generation, and refund", async () => {
  const ctx = { params: Promise.resolve({ id: VALID_UUID }) };

  // Unauthenticated
  const anon = assetRouteFixture(async () => assert.fail("no AI"), { anonymous: true });
  assert.equal((await anon.GET(new Request(`${ORIGIN}/api/packs/${VALID_UUID}/assets`), ctx)).status, 401);

  // Insufficient credits
  const broke = assetRouteFixture(async () => assert.fail("no AI"), { balance: 2 });
  const brokeRes = await broke.POST(
    new Request(`${ORIGIN}/api/packs/${VALID_UUID}/assets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "banner", platform: "wechat", userPrompt: "sunny cafe" }),
    }),
    ctx
  );
  assert.equal(brokeRes.status, 402);
  assert.equal((await brokeRes.json()).code, "INSUFFICIENT_CREDITS");

  // Happy path
  let seenReq = null;
  const ok = assetRouteFixture(async (req) => {
    seenReq = req;
    return { imageBytes: new Uint8Array([9, 8, 7]), mimeType: "image/png" };
  });
  const getRes = await ok.GET(new Request(`${ORIGIN}/api/packs/${VALID_UUID}/assets`), ctx);
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.equal(getJson.creditCost, 5);
  assert.match(getJson.assets.banner, /assets\/banner\.png\?signature=read$/);

  const postRes = await ok.POST(
    new Request(`${ORIGIN}/api/packs/${VALID_UUID}/assets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "banner",
        platform: "wechat",
        userPrompt: "drinking iced coffee in a sunny park",
        mood: "cheerful",
      }),
    }),
    ctx
  );
  assert.equal(postRes.status, 201);
  const postJson = await postRes.json();
  assert.equal(postJson.kind, "banner");
  assert.equal(postJson.remainingBalance, 45);
  assert.equal(seenReq.aspectRatio, "16:9");
  assert.match(seenReq.prompt, /drinking iced coffee in a sunny park/);
  assert.equal(ok.state.uploaded.length, 1);

  // Provider error refunds credits
  const fail = assetRouteFixture(async () => {
    throw new Error("Upstream error");
  });
  const failRes = await fail.POST(
    new Request(`${ORIGIN}/api/packs/${VALID_UUID}/assets`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "cover", platform: "wechat" }),
    }),
    ctx
  );
  assert.equal(failRes.status, 502);
  const failJson = await failRes.json();
  assert.equal(failJson.remainingBalance, 50);
  assert.equal(fail.state.refunds, 1);
});
