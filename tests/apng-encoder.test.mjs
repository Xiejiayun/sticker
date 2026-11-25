import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compileFunction } from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/lib/slicer/apng-encoder.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const mod = { exports: {} };
compileFunction(compiled, ["require", "module", "exports"])(
  (id) => {
    throw new Error(`Unexpected dependency in zero-dep apng-encoder: ${id}`);
  },
  mod,
  mod.exports
);

const { encodeAnimatedPng } = mod.exports;

function parsePngChunks(bytes) {
  const chunks = [];
  let offset = 8; // skip PNG signature
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = Buffer.from(bytes.subarray(offset + 4, offset + 8)).toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const crc = view.getUint32(offset + 8 + length, false);
    chunks.push({ type, length, data, crc });
    offset += 12 + length;
  }
  return chunks;
}

test("encodeAnimatedPng produces valid PNG signature and APNG chunk sequence (IHDR, acTL, fcTL, IDAT, fdAT, IEND)", async () => {
  const w = 24;
  const h = 24;
  const f1 = new Uint8ClampedArray(w * h * 4);
  const f2 = new Uint8ClampedArray(w * h * 4);
  const f3 = new Uint8ClampedArray(w * h * 4);

  for (let y = 6; y < 18; y++) {
    for (let x = 6; x < 18; x++) {
      f1.set([255, 183, 3, 255], (y * w + x) * 4);
    }
  }
  for (let y = 4; y < 16; y++) {
    for (let x = 8; x < 20; x++) {
      f2.set([255, 143, 171, 255], (y * w + x) * 4);
    }
  }
  for (let y = 8; y < 20; y++) {
    for (let x = 5; x < 17; x++) {
      f3.set([46, 196, 182, 255], (y * w + x) * 4);
    }
  }

  const apng = await encodeAnimatedPng(
    w,
    h,
    [
      { rgba: f1, delayMs: 100 },
      { rgba: f2, delayMs: 120 },
      { rgba: f3, delayMs: 80 },
    ],
    { numPlays: 3 }
  );

  // PNG 8-byte magic header
  assert.deepEqual(Array.from(apng.subarray(0, 8)), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const chunks = parsePngChunks(apng);
  assert.deepEqual(
    chunks.map((c) => c.type),
    ["IHDR", "acTL", "fcTL", "IDAT", "fcTL", "fdAT", "fcTL", "fdAT", "IEND"]
  );

  // Verify IHDR dimensions and RGBA color type 6
  const ihdr = new DataView(chunks[0].data.buffer, chunks[0].data.byteOffset, chunks[0].data.byteLength);
  assert.equal(ihdr.getUint32(0, false), w);
  assert.equal(ihdr.getUint32(4, false), h);
  assert.equal(chunks[0].data[8], 8); // bit depth 8
  assert.equal(chunks[0].data[9], 6); // RGBA truecolor

  // Verify acTL frame count = 3, numPlays = 3
  const actl = new DataView(chunks[1].data.buffer, chunks[1].data.byteOffset, chunks[1].data.byteLength);
  assert.equal(actl.getUint32(0, false), 3);
  assert.equal(actl.getUint32(4, false), 3);

  // Verify monotonic fcTL/fdAT sequence numbers: 0, 1, 2, 3, 4
  const seqChunks = chunks.filter((c) => c.type === "fcTL" || c.type === "fdAT");
  const seqNums = seqChunks.map((c) =>
    new DataView(c.data.buffer, c.data.byteOffset, c.data.byteLength).getUint32(0, false)
  );
  assert.deepEqual(seqNums, [0, 1, 2, 3, 4]);

  // Verify frame 1 fcTL cropped to sub-rect (x=8, y=4, w=12, h=12)
  const fctl1 = new DataView(chunks[4].data.buffer, chunks[4].data.byteOffset, chunks[4].data.byteLength);
  assert.equal(fctl1.getUint32(4, false), 12);
  assert.equal(fctl1.getUint32(8, false), 12);
  assert.equal(fctl1.getUint32(12, false), 8);
  assert.equal(fctl1.getUint32(16, false), 4);
  assert.equal(fctl1.getUint16(20, false), 120); // delay_num = 120ms
  assert.equal(fctl1.getUint16(22, false), 1000); // delay_den = 1000
});
