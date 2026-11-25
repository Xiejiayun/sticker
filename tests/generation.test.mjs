import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { compileFunction } from "node:vm";
import ts from "typescript";
import { checkStudioMutation } from "../src/lib/studio-request.ts";
import { ownedReference } from "../src/lib/storage/media.ts";
import { getThemePackById, isCustomThemeId, resolveSlotsForGeneration } from "../src/config/themes.ts";
import {
  ANIM_SPRITE_DUAL_THEME_ID,
  ANIM_SPRITE_QUAD_THEME_ID,
  ANIM_SPRITE_SINGLE_16_THEME_ID,
  ANIM_SPRITE_SINGLE_THEME_ID,
  buildDefaultAnimatedSlots,
  getAnimatedPackLayout,
  isAnimatedSpriteThemeId,
  resolveAnimatedSlotsForGeneration,
} from "../src/config/animations.ts";

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL("../src/app/api/packs/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const referenceUrl = "https://sticker.example/media/refs/user-a/1234.jpg";

function fixture(generate, options = {}) {
  const state = { balance: options.balance ?? 100, holds: 0, refunds: 0, pack: null };
  const db = {
    insert: () => ({
      values: async values => {
        if (options.failInsert) throw new Error("DB insert failed");
        state.pack = { ...values };
      },
    }),
    update: () => ({ set: values => ({ where: async () => { Object.assign(state.pack, values); } }) }),
  };
  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "drizzle-orm": { desc: value => value, eq: () => true },
    zod: require("zod"),
    "@/lib/auth": { getServerSession: async () => options.anonymous ? null : { user: { id: "user-a" } } },
    "@/lib/studio-request": { checkStudioMutation },
    "@/db": { getDb: () => db, stickerPacks: {} },
    "@/config/pricing": { getGridCreditCost: () => 15 },
    "@/config/styles": { getStylePresetById: () => ({}) },
    "@/config/themes": {
      getThemePackById: id => getThemePackById(id) ?? (id === "test" ? {} : undefined),
      isCustomThemeId,
      resolveSlotsForGeneration: input =>
        input.themeId === "test"
          ? Array.from({ length: input.gridSize === "4x4" ? 16 : 9 }, (_, index) => ({ index, pose: "wave", caption: "" }))
          : resolveSlotsForGeneration(input),
    },
    "@/config/animations": {
      getAnimatedPackLayout,
      isAnimatedSpriteThemeId,
      resolveAnimatedSlotsForGeneration,
    },
    "@/lib/credits": {
      holdCredits: async (userId, cost) => {
        assert.equal(userId, "user-a");
        if (state.balance < cost) return null;
        state.holds++;
        return state.balance -= cost;
      },
      addCredits: async (user, amount, type, id) => {
        assert.equal(user, "user-a"); assert.equal(type, "REFUND");
        if (state.pack) { assert.equal(id, state.pack.id); } else { assert.ok(typeof id === "string" && id.length > 0); }
        state.refunds++; return state.balance += amount;
      },
    },
    "@/lib/r2": {
      isR2Configured: () => true, isOwnedReferenceUrl: (url, userId) => ownedReference(url, userId, "https://sticker.example"),
      referenceExists: async () => options.referenceMissing !== true,
      getReferenceImage: options.getRef ?? (async () => new Blob(["fixture"], { type: "image/jpeg" })),
      uploadBufferToR2: async () => "https://sticker.example/media/packs/user-a/1234/master.png",
      getObjectReadUrl: async url => `${url}?signature=test-only`,
    },
    "@/lib/prompt/enhancer": { enhanceSubjectDescription: options.enhance ?? (async value => value) },
    "@/lib/prompt/builder": {
      buildStickerGridPrompt: () => "test prompt",
      buildAnimatedSpritePrompt: (input) => `animated sprite prompt (${input.layoutKind}:${input.gridSize})`,
    },
    "@/lib/ai/factory": { getImageProvider: () => ({ generateGrid: generate }) },
  };
  const mod = { exports: {} };
  compileFunction(compiled, ["require", "module", "exports"])(id => {
    assert.ok(id in modules, `Unexpected dependency: ${id}`);
    return modules[id];
  }, mod, mod.exports);
  return { state, post: mod.exports.POST };
}

function request(signal, { url = referenceUrl, headers = {} } = {}) {
  return new Request("https://sticker.example/api/packs", {
    method: "POST", signal, headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ gridSize: "3x3", styleId: "test", themeId: "test", captionMode: "none", userPrompt: "fixture", references: [{ url, role: "character", mimeType: "image/jpeg" }] }),
  });
}

test("a signed-in POST without a captcha waits for AI and returns the charged, completed R2 result", async () => {
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
  assert.equal(state.holds, 1);
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

test("invalid session, request origin, media type, references or balance never starts AI or charges credits", async () => {
  for (const [options, input, status] of [
    [{ anonymous: true }, {}, 401],
    [{}, { headers: { origin: "https://other.invalid" } }, 403],
    [{}, { headers: { "content-type": "text/plain" } }, 415],
    [{}, { url: referenceUrl.replace("/user-a/", "/user-b/") }, 400],
    [{ referenceMissing: true }, {}, 400],
    [{ balance: 0 }, {}, 402],
  ]) {
    const { post, state } = fixture(() => assert.fail("AI must not run"), options);
    const response = await post(request(undefined, input));
    assert.equal(response.status, status);
    if (status === 402) assert.equal((await response.json()).code, "INSUFFICIENT_CREDITS");
    assert.equal(state.holds, 0);
    assert.equal(state.pack, null);
  }
});

test("refunds held credits if initial pack insert fails", async () => {
  const { post, state } = fixture(() => assert.fail("AI must not run"), { failInsert: true });
  const response = await post(request());
  assert.equal(response.status, 500);
  const data = await response.json();
  assert.equal(data.remainingBalance, 100);
  assert.equal(state.holds, 1);
  assert.equal(state.refunds, 1);
  assert.equal(state.balance, 100);
});

test("passes abort signal to enhancer and loads references concurrently", async () => {
  const events = [];
  let releaseEnhance, releaseRef;
  const enhanceGate = new Promise(resolve => { releaseEnhance = resolve; });
  const refGate = new Promise(resolve => { releaseRef = resolve; });

  const { post } = fixture(
    async () => ({ imageBytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" }),
    {
      enhance: async (value, signal) => {
        assert.ok(signal instanceof AbortSignal);
        events.push("enhance:start");
        await enhanceGate;
        events.push("enhance:end");
        return value;
      },
      getRef: async () => {
        events.push("ref:start");
        await refGate;
        events.push("ref:end");
        return new Blob(["fixture"], { type: "image/jpeg" });
      },
    }
  );

  const pending = post(request());
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.deepEqual(events, ["enhance:start", "ref:start"]);
  releaseRef();
  releaseEnhance();
  const response = await pending;
  assert.equal(response.status, 201);
});

test("POST /api/packs applies poseVariant and custom slot captions", async () => {
  let capturedPromptSlots = null;
  const { post, state } = fixture(
    async () => ({ imageBytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" }),
  );
  const slots = Array.from({ length: 9 }, (_, index) => ({
    index,
    pose: "saluting politely with a professional smile",
    caption: index === 6 ? "不想上班" : "",
  }));
  const req = new Request("https://sticker.example/api/packs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      gridSize: "3x3",
      styleId: "test",
      themeId: "office-worker",
      captionMode: "zh",
      poseVariant: 1,
      userPrompt: "office shiba",
      slots,
      references: [],
    }),
  });
  const response = await post(req);
  assert.equal(response.status, 201);
  capturedPromptSlots = state.pack.slotsConfig;
  assert.equal(capturedPromptSlots[6].caption, "不想上班");
  assert.match(capturedPromptSlots[6].pose, /不想上班/);
  assert.match(capturedPromptSlots[3].pose, /rolling office chair/);
});

test("POST /api/packs preserves customPose in none mode and cross-theme swapped slots", async () => {
  const { post, state } = fixture(
    async () => ({ imageBytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" }),
  );
  const slots = Array.from({ length: 9 }, (_, index) => {
    if (index === 0) {
      return {
        index: 0,
        pose: "placeholder pose",
        poseZh: "戴墨镜端咖啡微笑",
        caption: "",
        customPose: "戴墨镜端咖啡微笑",
      };
    }
    if (index === 2) {
      return {
        index: 2,
        pose: "hugging a jumbo cup of boba milk tea sipping happily",
        poseZh: "抱紧超大杯珍珠奶茶疯狂续命",
        caption: "",
        sourceThemeId: "foodie-life",
        sourceSlotIndex: 1,
      };
    }
    return {
      index,
      pose: "cheerfully waving hello with a sunny smile",
      caption: "",
    };
  });

  const req = new Request("https://sticker.example/api/packs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      gridSize: "3x3",
      styleId: "test",
      themeId: "daily-essentials",
      captionMode: "none",
      poseVariant: 0,
      userPrompt: "orange tabby cat",
      slots,
      references: [],
    }),
  });

  const response = await post(req);
  assert.equal(response.status, 201);
  const saved = state.pack.slotsConfig;
  assert.equal(saved[0].customPose, "戴墨镜端咖啡微笑");
  assert.match(saved[0].pose, /戴墨镜端咖啡微笑/);
  assert.equal(saved[0].caption, "");
  assert.equal(saved[2].sourceThemeId, "foodie-life");
  assert.equal(saved[2].sourceSlotIndex, 1);
  assert.match(saved[2].pose, /boba milk tea/);
});

test("POST /api/packs accepts themeId='custom' with customPose slots", async () => {
  const { post, state } = fixture(
    async () => ({ imageBytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" }),
  );
  const slots = Array.from({ length: 9 }, (_, index) => ({
    index,
    pose: "",
    caption: `词${index}`,
    customPose: `自定义动作${index}`,
  }));
  const req = new Request("https://sticker.example/api/packs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      gridSize: "3x3",
      styleId: "test",
      themeId: "custom",
      captionMode: "zh",
      poseVariant: 0,
      userPrompt: "coder cat",
      slots,
      references: [],
    }),
  });
  const response = await post(req);
  assert.equal(response.status, 201);
  assert.equal(state.pack.themeId, "custom");
  assert.equal(state.pack.slotsConfig[0].customPose, "自定义动作0");
  assert.match(state.pack.slotsConfig[0].pose, /自定义动作0/);
});

test("POST /api/themes/plan enforces auth, handles unconfigured LLM, and parses JSON plans", async () => {
  const plannerSrc = fs.readFileSync(new URL("../src/lib/prompt/theme-planner.ts", import.meta.url), "utf8");
  const plannerCompiled = ts.transpileModule(plannerSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const plannerMod = { exports: {} };
  const stylesMod = await import("../src/config/styles.ts");
  const themesMod = await import("../src/config/themes.ts");
  compileFunction(plannerCompiled, ["require", "module", "exports"])(id => {
    if (id === "@/config/styles") return stylesMod;
    if (id === "@/config/themes") return themesMod;
    throw new Error(`Unexpected planner dependency: ${id}`);
  }, plannerMod, plannerMod.exports);

  const routeSrc = fs.readFileSync(new URL("../src/app/api/themes/plan/route.ts", import.meta.url), "utf8");
  const routeCompiled = ts.transpileModule(routeSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

  function loadPlanRoute(anonymous = false) {
    const mod = { exports: {} };
    compileFunction(routeCompiled, ["require", "module", "exports"])(id => {
      if (id === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (id === "zod") return require("zod");
      if (id === "@/lib/auth") return { getServerSession: async () => (anonymous ? null : { user: { id: "user-a" } }) };
      if (id === "@/lib/studio-request") return { checkStudioMutation };
      if (id === "@/lib/prompt/theme-planner") return plannerMod.exports;
      throw new Error(`Unexpected plan route dependency: ${id}`);
    }, mod, mod.exports);
    return mod.exports.POST;
  }

  const makeReq = () =>
    new Request("https://sticker.example/api/themes/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idea: "程序员改Bug日常", gridSize: "3x3", captionMode: "zh", tone: "funny" }),
    });

  // 1. Anonymous rejected with 401
  const anonRes = await loadPlanRoute(true)(makeReq());
  assert.equal(anonRes.status, 401);

  // 2. Unconfigured LLM returns 503 with LLM_NOT_CONFIGURED
  const savedEnhanceKey = process.env.LLM_ENHANCE_API_KEY;
  const savedPlanKey = process.env.LLM_THEME_PLAN_API_KEY;
  delete process.env.LLM_ENHANCE_API_KEY;
  delete process.env.LLM_THEME_PLAN_API_KEY;
  try {
    const unconfRes = await loadPlanRoute(false)(makeReq());
    assert.equal(unconfRes.status, 503);
    assert.equal((await unconfRes.json()).code, "LLM_NOT_CONFIGURED");
  } finally {
    if (savedEnhanceKey !== undefined) process.env.LLM_ENHANCE_API_KEY = savedEnhanceKey;
    if (savedPlanKey !== undefined) process.env.LLM_THEME_PLAN_API_KEY = savedPlanKey;
  }

  // 3. parseThemePlanResponse handles fenced JSON cleanly
  const sampleJson = "```json\n" + JSON.stringify({
    slots: Array.from({ length: 9 }, (_, i) => ({
      pose: `coding pose ${i}`,
      poseZh: `狂敲键盘修第${i}个Bug`,
      captionZh: `修Bug${i}`,
      captionEn: `Fix ${i}`,
    })),
  }) + "\n```";
  const parsedSlots = plannerMod.exports.parseThemePlanResponse(sampleJson, {
    gridSize: "3x3",
    captionMode: "zh",
    locale: "zh",
  });
  assert.equal(parsedSlots.length, 9);
  assert.equal(parsedSlots[0].customPose, "狂敲键盘修第0个Bug");
  assert.equal(parsedSlots[0].caption, "修Bug0");
});

test("POST /api/packs supports animated sprite-sheet themes (9-frame single & 4x4 quad)", async () => {
  const seenPrompts = [];
  const { post, state } = fixture(async (req) => {
    seenPrompts.push({ prompt: req.prompt, gridSize: req.gridSize });
    return { imageBytes: new Uint8Array([1, 2, 3]), mimeType: "image/png" };
  });

  // 1. 3x3 single 9-frame animated sprite
  const singleSlots = buildDefaultAnimatedSlots(ANIM_SPRITE_SINGLE_THEME_ID, "zh");
  const singleRes = await post(
    new Request("https://sticker.example/api/packs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gridSize: "3x3",
        styleId: "test",
        themeId: ANIM_SPRITE_SINGLE_THEME_ID,
        captionMode: "zh",
        userPrompt: "chubby tabby cat",
        slots: singleSlots,
        references: [],
      }),
    })
  );
  assert.equal(singleRes.status, 201);
  assert.equal(state.pack.themeId, ANIM_SPRITE_SINGLE_THEME_ID);
  assert.equal(state.pack.gridSize, "3x3");
  assert.equal(state.pack.slotsConfig.length, 9);
  assert.equal(seenPrompts[0].prompt, "animated sprite prompt (single:3x3)");

  // 2. 4x4 quad 4-in-1 animated pack with one custom action row
  const quadSlots = buildDefaultAnimatedSlots(ANIM_SPRITE_QUAD_THEME_ID, "zh").map((s, idx) =>
    idx < 4
      ? { ...s, animActionId: "custom", customPose: "抱奶茶蹦迪", caption: "续命" }
      : s
  );
  const quadRes = await post(
    new Request("https://sticker.example/api/packs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        gridSize: "3x3", // Server must enforce 4x4 for anim-sprite-quad
        styleId: "test",
        themeId: ANIM_SPRITE_QUAD_THEME_ID,
        captionMode: "zh",
        userPrompt: "office shiba",
        slots: quadSlots,
        references: [],
      }),
    })
  );
  assert.equal(quadRes.status, 201);
  assert.equal(state.pack.themeId, ANIM_SPRITE_QUAD_THEME_ID);
  assert.equal(state.pack.gridSize, "4x4");
  assert.equal(state.pack.slotsConfig.length, 16);
  assert.equal(state.pack.slotsConfig[0].customPose, "抱奶茶蹦迪");
  assert.equal(state.pack.slotsConfig[0].caption, "续命");
  assert.equal(seenPrompts[1].prompt, "animated sprite prompt (quad:4x4)");
  assert.equal(seenPrompts[1].gridSize, "4x4");

  // 3. 4x4 dual 2x8 animated pack and 16-frame hero pack
  for (const [tid, expectedLayout] of [
    [ANIM_SPRITE_DUAL_THEME_ID, "dual"],
    [ANIM_SPRITE_SINGLE_16_THEME_ID, "single-16"],
  ]) {
    const res = await post(
      new Request("https://sticker.example/api/packs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          gridSize: "4x4",
          styleId: "test",
          themeId: tid,
          captionMode: "zh",
          userPrompt: "cute cat",
          slots: buildDefaultAnimatedSlots(tid, "zh"),
          references: [],
        }),
      })
    );
    assert.equal(res.status, 201);
    assert.equal(state.pack.themeId, tid);
    assert.equal(state.pack.gridSize, "4x4");
    assert.equal(state.pack.slotsConfig.length, 16);
    assert.equal(seenPrompts[seenPrompts.length - 1].prompt, `animated sprite prompt (${expectedLayout}:4x4)`);
  }
});
