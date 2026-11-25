import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compileFunction } from "node:vm";
import ts from "typescript";
import { STYLE_PRESETS, getStylePresetById } from "../src/config/styles.ts";
import {
  ANIMATED_ACTION_PRESETS,
  ANIM_SPRITE_QUAD_THEME_ID,
  ANIM_SPRITE_SINGLE_THEME_ID,
  buildAnimatedSlots,
  buildDefaultAnimatedSlots,
  extractAnimatedClipGroups,
  isAnimatedSpriteThemeId,
  resolveAnimatedSlotsForGeneration,
} from "../src/config/animations.ts";
import {
  computeClipStabilization,
  computeFrameAlphaMetrics,
  computeUniformPlacement,
  expandPlaybackSequence,
  normalizeLineApngTiming,
} from "../src/lib/slicer/sprite-math.ts";

const builderSrc = fs.readFileSync(new URL("../src/lib/prompt/builder.ts", import.meta.url), "utf8");
const builderCompiled = ts.transpileModule(builderSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const builderMod = { exports: {} };
compileFunction(builderCompiled, ["require", "module", "exports"])(
  (id) => {
    assert.equal(id, "@/config/styles");
    return { STYLE_PRESETS, getStylePresetById };
  },
  builderMod,
  builderMod.exports
);
const { buildAnimatedSpritePrompt } = builderMod.exports;

function makeDiscFrame(w, h, cx, cy, r) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        const o = (y * w + x) * 4;
        rgba[o] = 240;
        rgba[o + 1] = 150;
        rgba[o + 2] = 60;
        rgba[o + 3] = 255;
      }
    }
  }
  return rgba;
}

test("curated animated action catalog has valid 4-frame and 9-frame beats", () => {
  assert.ok(ANIMATED_ACTION_PRESETS.length >= 16);
  const ids = new Set();
  for (const preset of ANIMATED_ACTION_PRESETS) {
    assert.equal(ids.has(preset.id), false, `Duplicate preset id ${preset.id}`);
    ids.add(preset.id);
    assert.equal(preset.frames4.length, 4);
    assert.equal(preset.frames9.length, 9);
    assert.ok(preset.defaultFps >= 4 && preset.defaultFps <= 16);
    assert.ok(preset.captionZh.length > 0 && preset.captionEn.length <= 12);
  }
  assert.equal(isAnimatedSpriteThemeId(ANIM_SPRITE_SINGLE_THEME_ID), true);
  assert.equal(isAnimatedSpriteThemeId(ANIM_SPRITE_QUAD_THEME_ID), true);
  assert.equal(isAnimatedSpriteThemeId("daily-essentials"), false);
});

test("buildAnimatedSpritePrompt produces locked-camera text-free prompts for single (3x3) and quad (4x4)", () => {
  const singleSlots = buildDefaultAnimatedSlots(ANIM_SPRITE_SINGLE_THEME_ID, "zh");
  const singlePrompt = buildAnimatedSpritePrompt({
    styleId: "chibi-handdrawn",
    gridSize: "3x3",
    layoutKind: "single",
    subjectDescription: "orange tabby cat",
    slots: singleSlots,
    referenceRoles: ["pet"],
  });
  assert.match(singlePrompt, /STRICTLY LOCKED CAMERA/);
  assert.match(singlePrompt, /NO TEXT/);
  assert.match(singlePrompt, /#FFFFFF/);
  assert.equal((singlePrompt.match(/Frame \d+\/9/g) || []).length, 9);

  const quadSlots = buildDefaultAnimatedSlots(ANIM_SPRITE_QUAD_THEME_ID, "zh");
  const quadPrompt = buildAnimatedSpritePrompt({
    styleId: "3d-blindbox",
    gridSize: "4x4",
    layoutKind: "quad",
    subjectDescription: "office shiba",
    slots: quadSlots,
    referenceRoles: [],
  });
  assert.match(quadPrompt, /4 independent looping sticker animations/);
  assert.equal((quadPrompt.match(/Frame \d+\/4/g) || []).length, 16);
  const groups = extractAnimatedClipGroups(ANIM_SPRITE_QUAD_THEME_ID, "4x4", quadSlots);
  assert.equal(groups.length, 4);
  assert.deepEqual(groups[1].cellIndices, [4, 5, 6, 7]);
});

test("custom animated actions sanitize input and expand into 4 or 9 beats", () => {
  const slots = buildAnimatedSlots({
    themeId: ANIM_SPRITE_SINGLE_THEME_ID,
    captionMode: "zh",
    clips: [{ actionId: "custom", customAction: '`"抱着奶茶蹦迪"\n<script>', caption: "干杯" }],
  });
  assert.equal(slots.length, 9);
  assert.equal(slots[0].customPose, "抱着奶茶蹦迪 script");
  assert.equal(slots[0].caption, "干杯");
  assert.match(slots[4].pose, /peak climax/i);

  const resolved = resolveAnimatedSlotsForGeneration({
    themeId: ANIM_SPRITE_SINGLE_THEME_ID,
    captionMode: "none",
    slots,
  });
  assert.equal(resolved.length, 9);
  assert.equal(resolved[0].caption, "");
  assert.equal(resolved[0].customPose, "抱着奶茶蹦迪 script");
});

test("cross-frame stabilization recovers synthetic pixel drift under centroid, bottom-center, and NCC modes", () => {
  const w = 128;
  const h = 128;
  // Frame 0 centered at (64, 68); Frame 1 drifted +10px X, -8px Y
  const f0 = makeDiscFrame(w, h, 64, 68, 26);
  const f1 = makeDiscFrame(w, h, 74, 60, 26);
  const metrics = [computeFrameAlphaMetrics(f0, w, h), computeFrameAlphaMetrics(f1, w, h)];

  const centroidPlan = computeClipStabilization(metrics, "centroid");
  assert.deepEqual(centroidPlan.transforms[0], { dx: 0, dy: 0 });
  assert.ok(Math.abs(centroidPlan.transforms[1].dx - -10) <= 1);
  assert.ok(Math.abs(centroidPlan.transforms[1].dy - 8) <= 1);

  const bottomPlan = computeClipStabilization(metrics, "bottom-center");
  assert.ok(Math.abs(bottomPlan.transforms[1].dx - -10) <= 1);
  assert.ok(Math.abs(bottomPlan.transforms[1].dy - 8) <= 1);

  const nccPlan = computeClipStabilization(metrics, "ncc");
  assert.ok(Math.abs(nccPlan.transforms[1].dx - -10) <= 3, `Expected NCC dx ~ -10, got ${nccPlan.transforms[1].dx}`);
  assert.ok(Math.abs(nccPlan.transforms[1].dy - 8) <= 3, `Expected NCC dy ~ 8, got ${nccPlan.transforms[1].dy}`);

  const placement = computeUniformPlacement(nccPlan.unionBounds, 240, 240, 14);
  assert.ok(placement.scale > 1);
});

test("playback sequence expansion and LINE APNG timing compliance", () => {
  // 4-frame Ping-Pong -> 6 frames: [0, 1, 2, 3, 2, 1]
  assert.deepEqual(expandPlaybackSequence(4, "pingpong"), [0, 1, 2, 3, 2, 1]);
  // 9-frame Ping-Pong -> 16 frames
  assert.equal(expandPlaybackSequence(9, "pingpong").length, 16);
  // Skipping disabled frame #2
  assert.deepEqual(expandPlaybackSequence(4, "loop", [true, true, false, true]), [0, 1, 3]);

  // LINE APNG requires 5..20 frames and <= 4000ms total
  const lineFrom4 = normalizeLineApngTiming([0, 1, 2, 3], [120, 120, 120, 120]);
  assert.ok(lineFrom4.sequence.length >= 5 && lineFrom4.sequence.length <= 20);
  assert.ok(lineFrom4.numPlays >= 1 && lineFrom4.numPlays <= 4);
  assert.ok(lineFrom4.totalDurationMs <= 4000);

  // Extremely slow 24-frame sequence gets capped to <= 20 frames and <= 4000ms
  const longSeq = Array.from({ length: 24 }, (_, i) => i);
  const longDelays = Array.from({ length: 24 }, () => 350);
  const lineLong = normalizeLineApngTiming(longSeq, longDelays);
  assert.equal(lineLong.sequence.length, 20);
  assert.ok(lineLong.totalDurationMs <= 4000);
});
