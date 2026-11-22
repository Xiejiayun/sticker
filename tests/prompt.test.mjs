import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compileFunction } from "node:vm";
import ts from "typescript";
import { STYLE_PRESETS, getStylePresetById } from "../src/config/styles.ts";
const source = fs.readFileSync(new URL("../src/lib/prompt/builder.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
compileFunction(compiled, ["require", "module", "exports"])(id => {
  assert.equal(id, "@/config/styles"); return { STYLE_PRESETS, getStylePresetById };
}, mod, mod.exports);
const { buildStickerGridPrompt } = mod.exports;

test("all styles ask for finished border-free artwork and preserve cell captions", () => {
  for (const style of STYLE_PRESETS) for (const grid of ["3x3", "4x4"]) {
    const count = grid === "4x4" ? 16 : 9;
    const prompt = buildStickerGridPrompt({ styleId: style.id, gridSize: grid, captionMode: "zh", subjectDescription: "a tabby cat", referenceRoles: ["pet"], slots: Array.from({ length: count }, (_, i) => ({ index: i, pose: `unique pose ${i}`, caption: `表情${i}` })) });
    assert.match(prompt, /No white sticker outlines/);
    assert.match(prompt, /10% clear safety margin/);
    assert.match(prompt, /only be sliced into equal cells/);
    assert.equal((prompt.match(/^- \(Row /gm) || []).length, count);
    assert.ok(prompt.includes(`Text: "表情${count - 1}"`));
    assert.match(prompt, /Reference Image 1: Use as main pet/);
    assert.doesNotMatch(prompt, /4096x4096|distinct die-cut stickers/);
    assert.doesNotMatch(style.promptSnippet, /die-cut/);
  }
});
test("no-caption mode never adds per-cell text", () => {
  const prompt = buildStickerGridPrompt({ styleId: "flat-vector", gridSize: "3x3", captionMode: "none", subjectDescription: "cat", referenceRoles: [], slots: [{ index: 0, pose: "wave", caption: "DO NOT DRAW" }] });
  assert.match(prompt, /Do NOT draw any text/);
  assert.doesNotMatch(prompt, /Text:|DO NOT DRAW/);
});
test("every style preset references an existing preview image asset", () => {
  for (const style of STYLE_PRESETS) {
    assert.match(style.previewImage, /^\/styles\/[a-z0-9-]+\.(png|webp)$/);
    const assetPath = new URL(`../public${style.previewImage}`, import.meta.url);
    assert.ok(fs.existsSync(assetPath), `Missing preview image for style ${style.id}: ${style.previewImage}`);
  }
});
