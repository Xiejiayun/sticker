/**
 * Zero-dependency pure TypeScript APNG encoder (32-bit truecolor RGBA with full alpha).
 * Produces LINE Creators Market compliant APNG files (.png) with IHDR, acTL, fcTL, IDAT, fdAT, IEND.
 */

export interface ApngFrameInput {
  rgba: Uint8ClampedArray;
  delayMs?: number; // Milliseconds, default 100
}

export interface EncodeApngOptions {
  numPlays?: number; // 0 = infinite loop; LINE allows 1..4 loops (<= 4s total)
}

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(typeBytes: Uint8Array, data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < typeBytes.length; i++) {
    c = CRC_TABLE[(c ^ typeBytes[i]) & 0xff] ^ (c >>> 8);
  }
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeU32BE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

function writeU16BE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = (value >>> 8) & 0xff;
  buf[offset + 1] = value & 0xff;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new Uint8Array([
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
  ]);
  const out = new Uint8Array(12 + data.length);
  writeU32BE(out, 0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  writeU32BE(out, 8 + data.length, crc32(typeBytes, data));
  return out;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  const MOD = 65521;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]) % MOD;
    b = (b + a) % MOD;
  }
  return ((b << 16) | a) >>> 0;
}

function zlibStoreFallback(raw: Uint8Array): Uint8Array {
  const MAX_BLOCK = 65535;
  const blockCount = Math.max(1, Math.ceil(raw.length / MAX_BLOCK));
  const out = new Uint8Array(2 + raw.length + blockCount * 5 + 4);
  out[0] = 0x78;
  out[1] = 0x01;
  let cursor = 2;
  let offset = 0;
  for (let b = 0; b < blockCount; b++) {
    const len = Math.min(MAX_BLOCK, raw.length - offset);
    const isFinal = b === blockCount - 1 ? 1 : 0;
    out[cursor++] = isFinal;
    out[cursor++] = len & 0xff;
    out[cursor++] = (len >>> 8) & 0xff;
    const nlen = ~len & 0xffff;
    out[cursor++] = nlen & 0xff;
    out[cursor++] = (nlen >>> 8) & 0xff;
    if (len > 0) {
      out.set(raw.subarray(offset, offset + len), cursor);
      cursor += len;
      offset += len;
    }
  }
  writeU32BE(out, cursor, adler32(raw));
  return out;
}

async function zlibDeflate(raw: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") {
    return zlibStoreFallback(raw);
  }
  try {
    const stream = new CompressionStream("deflate");
    const writer = stream.writable.getWriter();
    const chunks: Uint8Array[] = [];
    const reader = stream.readable.getReader();

    const readAll = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
    })();

    const copy = new Uint8Array(raw.byteLength);
    copy.set(raw);
    await writer.write(copy);
    await writer.close();
    await readAll;

    const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const merged = new Uint8Array(total);
    let pos = 0;
    for (const c of chunks) {
      merged.set(c, pos);
      pos += c.byteLength;
    }
    return merged;
  } catch {
    return zlibStoreFallback(raw);
  }
}

/**
 * Applies PNG Sub filter (filter type 1) to RGBA scanlines for much better deflate compression
 * on flat/cartoon sticker art while staying fast in pure TypeScript.
 */
function buildFilteredScanlines(
  rgba: Uint8ClampedArray,
  fullWidth: number,
  left: number,
  top: number,
  subW: number,
  subH: number
): Uint8Array {
  const rowBytes = subW * 4;
  const out = new Uint8Array(subH * (rowBytes + 1));

  for (let y = 0; y < subH; y++) {
    const dstRow = y * (rowBytes + 1);
    out[dstRow] = 1; // Filter type: Sub
    const srcRowPixel = (top + y) * fullWidth + left;

    for (let x = 0; x < subW; x++) {
      const o = (srcRowPixel + x) * 4;
      const d = dstRow + 1 + x * 4;
      if (x === 0) {
        out[d] = rgba[o];
        out[d + 1] = rgba[o + 1];
        out[d + 2] = rgba[o + 2];
        out[d + 3] = rgba[o + 3];
      } else {
        const po = o - 4;
        out[d] = (rgba[o] - rgba[po]) & 0xff;
        out[d + 1] = (rgba[o + 1] - rgba[po + 1]) & 0xff;
        out[d + 2] = (rgba[o + 2] - rgba[po + 2]) & 0xff;
        out[d + 3] = (rgba[o + 3] - rgba[po + 3]) & 0xff;
      }
    }
  }

  return out;
}

function findNonZeroAlphaRect(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): { left: number; top: number; subW: number; subH: number } {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowBase = y * width;
    for (let x = 0; x < width; x++) {
      if (rgba[(rowBase + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { left: 0, top: 0, subW: 1, subH: 1 };
  }
  return {
    left: minX,
    top: minY,
    subW: maxX - minX + 1,
    subH: maxY - minY + 1,
  };
}

export async function encodeAnimatedPng(
  width: number,
  height: number,
  frames: ApngFrameInput[],
  options: EncodeApngOptions = {}
): Promise<Uint8Array> {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error("Invalid APNG dimensions");
  }
  if (frames.length === 0) {
    throw new Error("APNG requires at least one frame");
  }

  const pixelByteLen = width * height * 4;
  for (const frame of frames) {
    if (frame.rgba.length !== pixelByteLen) {
      throw new Error("APNG frame RGBA byte length does not match dimensions");
    }
  }

  const parts: Uint8Array[] = [PNG_SIGNATURE];

  // 1. IHDR (width, height, bitDepth=8, colorType=6 RGBA, compression=0, filter=0, interlace=0)
  const ihdr = new Uint8Array(13);
  writeU32BE(ihdr, 0, width);
  writeU32BE(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  parts.push(makeChunk("IHDR", ihdr));

  // 2. acTL (num_frames, num_plays)
  const actl = new Uint8Array(8);
  writeU32BE(actl, 0, frames.length);
  writeU32BE(actl, 4, Math.max(0, Math.round(options.numPlays ?? 0)));
  parts.push(makeChunk("acTL", actl));

  // 3. Frames: frame 0 MUST be full width x height for IDAT compatibility;
  // subsequent frames (1..N-1) can be cropped to their tight opaque sub-rect.
  let seqNum = 0;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const delayMs = Math.max(10, Math.min(65535, Math.round(frame.delayMs ?? 100)));
    const rect =
      i === 0
        ? { left: 0, top: 0, subW: width, subH: height }
        : findNonZeroAlphaRect(frame.rgba, width, height);

    // fcTL (26 bytes)
    const fctl = new Uint8Array(26);
    writeU32BE(fctl, 0, seqNum++);
    writeU32BE(fctl, 4, rect.subW);
    writeU32BE(fctl, 8, rect.subH);
    writeU32BE(fctl, 12, rect.left);
    writeU32BE(fctl, 16, rect.top);
    writeU16BE(fctl, 20, delayMs);
    writeU16BE(fctl, 22, 1000); // delay_den = 1000 (milliseconds)
    fctl[24] = 1; // APNG_DISPOSE_OP_BACKGROUND (clear to transparent before next frame)
    fctl[25] = 0; // APNG_BLEND_OP_SOURCE
    parts.push(makeChunk("fcTL", fctl));

    const scanlines = buildFilteredScanlines(
      frame.rgba,
      width,
      rect.left,
      rect.top,
      rect.subW,
      rect.subH
    );
    const compressed = await zlibDeflate(scanlines);

    if (i === 0) {
      parts.push(makeChunk("IDAT", compressed));
    } else {
      const fdat = new Uint8Array(4 + compressed.length);
      writeU32BE(fdat, 0, seqNum++);
      fdat.set(compressed, 4);
      parts.push(makeChunk("fdAT", fdat));
    }
  }

  // 4. IEND
  parts.push(makeChunk("IEND", new Uint8Array(0)));

  const totalBytes = parts.reduce((sum, p) => sum + p.length, 0);
  const output = new Uint8Array(totalBytes);
  let cursor = 0;
  for (const part of parts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}
