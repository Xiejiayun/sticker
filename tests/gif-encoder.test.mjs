import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compileFunction } from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/lib/slicer/gif-encoder.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const mod = { exports: {} };
compileFunction(compiled, ["require", "module", "exports"])(
  (id) => {
    throw new Error(`Unexpected dependency in zero-dep gif-encoder: ${id}`);
  },
  mod,
  mod.exports
);

const { encodeAnimatedGif } = mod.exports;

test("encodeAnimatedGif produces valid GIF89a header, Netscape 2.0 loop, GCE transparency, and trailer", () => {
  const w = 16;
  const h = 16;
  const frame1 = new Uint8ClampedArray(w * h * 4);
  const frame2 = new Uint8ClampedArray(w * h * 4);

  // Frame 1: transparent border + coral center square
  // Frame 2: transparent border + teal shifted center square
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (x >= 4 && x < 12 && y >= 4 && y < 12) {
        frame1.set([224, 72, 72, 255], idx);
      }
      if (x >= 5 && x < 13 && y >= 3 && y < 11) {
        frame2.set([15, 118, 110, 255], idx);
      }
    }
  }

  const gif = encodeAnimatedGif(w, h, [
    { rgba: frame1, delayCs: 8 },
    { rgba: frame2, delayCs: 10 },
  ]);

  assert.ok(gif instanceof Uint8Array);
  assert.equal(Buffer.from(gif.slice(0, 6)).toString("ascii"), "GIF89a");
  assert.equal(gif[6], w);
  assert.equal(gif[8], h);

  const ascii = Buffer.from(gif).toString("latin1");
  assert.ok(ascii.includes("NETSCAPE2.0"), "Missing Netscape 2.0 infinite loop block");

  // Verify Graphic Control Extension bytes (0x21 0xF9 0x04 0x09 delayLo delayHi 0xFF 0x00)
  const gceIdx = gif.findIndex((_, i) => gif[i] === 0x21 && gif[i + 1] === 0xf9 && gif[i + 2] === 0x04);
  assert.ok(gceIdx > 0, "Missing Graphic Control Extension");
  assert.equal(gif[gceIdx + 3], 0x09, "Expected disposal method 2 + transparent flag");
  assert.equal(gif[gceIdx + 6], 0xff, "Expected transparent index 255");

  assert.equal(gif[gif.length - 1], 0x3b, "Missing GIF trailer 0x3B");
});

test("encodeAnimatedGif handles LZW dictionary reset on noisy frames", () => {
  const w = 96;
  const h = 96;
  const noisy = new Uint8ClampedArray(w * h * 4);
  let seed = 1337;
  for (let i = 0; i < w * h; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const o = i * 4;
    noisy[o] = seed & 0xff;
    noisy[o + 1] = (seed >>> 8) & 0xff;
    noisy[o + 2] = (seed >>> 16) & 0xff;
    noisy[o + 3] = 255;
  }

  const gif = encodeAnimatedGif(w, h, [{ rgba: noisy, delayCs: 8 }]);
  assert.equal(Buffer.from(gif.slice(0, 6)).toString("ascii"), "GIF89a");
  assert.equal(gif[gif.length - 1], 0x3b);
});
