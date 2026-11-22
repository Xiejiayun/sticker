import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { compileFunction } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL("../src/lib/slicer/sticker-processor.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const mod = { exports: {} };
compileFunction(compiled, ["require", "module", "exports"])(
  (id) => {
    if (id === "jszip") return require("jszip");
    if (id === "./grid") return {};
    throw new Error(`Unexpected import: ${id}`);
  },
  mod,
  mod.exports
);

const { getExportPresetDimensions } = mod.exports;

test("export preset dimensions and extensions match IM platform specs", () => {
  assert.deepEqual(getExportPresetDimensions("original"), { width: null, height: null, ext: "png" });
  assert.deepEqual(getExportPresetDimensions("wechat"), { width: 240, height: 240, ext: "png" });
  assert.deepEqual(getExportPresetDimensions("telegram"), { width: 512, height: 512, ext: "png" });
  assert.deepEqual(getExportPresetDimensions("whatsapp"), { width: 512, height: 512, ext: "webp" });
  assert.deepEqual(getExportPresetDimensions("line"), { width: 370, height: 320, ext: "png" });
  assert.deepEqual(getExportPresetDimensions("discord"), { width: 128, height: 128, ext: "png" });
});
