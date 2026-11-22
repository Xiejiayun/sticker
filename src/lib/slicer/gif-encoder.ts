/**
 * Zero-dependency pure TypeScript GIF89a encoder with alpha transparency support.
 * Uses a fixed 256-color palette (216 web-safe RGB cube + 39 grayscale ramp + index 255 transparent).
 */

const TRANSPARENT_INDEX = 255;

function buildGlobalColorTable(): Uint8Array {
  const gct = new Uint8Array(256 * 3);
  const steps = [0, 51, 102, 153, 204, 255];

  // 0..215: 6x6x6 RGB cube
  let offset = 0;
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        gct[offset++] = steps[r];
        gct[offset++] = steps[g];
        gct[offset++] = steps[b];
      }
    }
  }

  // 216..254: 39-step grayscale ramp
  for (let i = 0; i < 39; i++) {
    const v = Math.round((i * 255) / 38);
    gct[offset++] = v;
    gct[offset++] = v;
    gct[offset++] = v;
  }

  // 255: transparent slot
  gct[offset++] = 0;
  gct[offset++] = 0;
  gct[offset++] = 0;
  return gct;
}

const GLOBAL_COLOR_TABLE = buildGlobalColorTable();

function quantizeRgbaFrame(rgba: Uint8ClampedArray, pixelCount: number): Uint8Array {
  const indices = new Uint8Array(pixelCount);
  const steps = [0, 51, 102, 153, 204, 255];

  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    const a = rgba[o + 3];
    if (a < 128) {
      indices[i] = TRANSPARENT_INDEX;
      continue;
    }

    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];

    const ri = Math.round(r / 51);
    const gi = Math.round(g / 51);
    const bi = Math.round(b / 51);
    const cr = steps[ri];
    const cg = steps[gi];
    const cb = steps[bi];
    const cubeDist = (r - cr) * (r - cr) + (g - cg) * (g - cg) + (b - cb) * (b - cb);

    const gray = Math.round((r * 77 + g * 150 + b * 29) / 256);
    const gStep = Math.round((gray * 38) / 255);
    const gv = Math.round((gStep * 255) / 38);
    const grayDist = (r - gv) * (r - gv) + (g - gv) * (g - gv) + (b - gv) * (b - gv);

    indices[i] = grayDist < cubeDist ? 216 + gStep : ri * 36 + gi * 6 + bi;
  }

  return indices;
}

function lzwEncodeIndices(indices: Uint8Array, minCodeSize = 8): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  let maxCode = 1 << codeSize;

  const outBytes: number[] = [];
  let bitBuf = 0;
  let bitCount = 0;

  const writeCode = (code: number) => {
    bitBuf |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      outBytes.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitCount -= 8;
    }
  };

  let dict = new Map<number, number>();
  const resetDict = () => {
    dict = new Map<number, number>();
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
    maxCode = 1 << codeSize;
  };

  writeCode(clearCode);
  if (indices.length === 0) {
    writeCode(eoiCode);
  } else {
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      const existing = dict.get(key);
      if (existing !== undefined) {
        prefix = existing;
      } else {
        writeCode(prefix);
        if (nextCode < 4096) {
          dict.set(key, nextCode++);
          if (nextCode > maxCode && codeSize < 12) {
            codeSize++;
            maxCode = 1 << codeSize;
          }
        } else {
          writeCode(clearCode);
          resetDict();
        }
        prefix = k;
      }
    }
    writeCode(prefix);
    writeCode(eoiCode);
  }

  if (bitCount > 0) {
    outBytes.push(bitBuf & 0xff);
  }

  // Package into GIF sub-blocks (max 255 bytes each) + block terminator 0x00
  const blocks: number[] = [minCodeSize];
  for (let offset = 0; offset < outBytes.length; offset += 255) {
    const chunkLen = Math.min(255, outBytes.length - offset);
    blocks.push(chunkLen);
    for (let j = 0; j < chunkLen; j++) {
      blocks.push(outBytes[offset + j]);
    }
  }
  blocks.push(0x00);
  return new Uint8Array(blocks);
}

export interface GifFrameInput {
  rgba: Uint8ClampedArray;
  delayCs?: number; // Centiseconds (1/100s), default 8 (80ms)
}

export function encodeAnimatedGif(
  width: number,
  height: number,
  frames: GifFrameInput[]
): Uint8Array {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error("Invalid GIF dimensions");
  }
  if (frames.length === 0) {
    throw new Error("GIF requires at least one frame");
  }

  const pixelCount = width * height;
  const parts: Uint8Array[] = [];

  // 1. Header ("GIF89a") + Logical Screen Descriptor (7 bytes)
  const header = new Uint8Array(13);
  header.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
  header[6] = width & 0xff;
  header[7] = (width >> 8) & 0xff;
  header[8] = height & 0xff;
  header[9] = (height >> 8) & 0xff;
  header[10] = 0xf7; // GCT present (1), color res 7 (111), sort 0, size 7 (256 colors)
  header[11] = TRANSPARENT_INDEX;
  header[12] = 0x00;
  parts.push(header);

  // 2. Global Color Table (768 bytes)
  parts.push(GLOBAL_COLOR_TABLE);

  // 3. Netscape 2.0 Application Extension (infinite loop)
  parts.push(
    new Uint8Array([
      0x21, 0xff, 0x0b,
      0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, // NETSCAPE2.0
      0x03, 0x01, 0x00, 0x00, 0x00,
    ])
  );

  // 4. Frames
  for (const frame of frames) {
    if (frame.rgba.length !== pixelCount * 4) {
      throw new Error("Frame RGBA byte length does not match dimensions");
    }
    const delayCs = Math.max(2, Math.round(frame.delayCs ?? 8));

    // Graphic Control Extension: disposal=2 (restore to bg) + transparent flag=1 => 0x09
    parts.push(
      new Uint8Array([
        0x21, 0xf9, 0x04,
        0x09,
        delayCs & 0xff,
        (delayCs >> 8) & 0xff,
        TRANSPARENT_INDEX,
        0x00,
      ])
    );

    // Image Descriptor
    parts.push(
      new Uint8Array([
        0x2c,
        0x00, 0x00, 0x00, 0x00,
        width & 0xff, (width >> 8) & 0xff,
        height & 0xff, (height >> 8) & 0xff,
        0x00,
      ])
    );

    // LZW Image Data
    const indexed = quantizeRgbaFrame(frame.rgba, pixelCount);
    parts.push(lzwEncodeIndices(indexed, 8));
  }

  // 5. GIF Trailer
  parts.push(new Uint8Array([0x3b]));

  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let cursor = 0;
  for (const part of parts) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return output;
}
