/**
 * Zero-dependency pure TypeScript GIF89a encoder with alpha transparency support.
 * Uses an adaptive Median-Cut 255-color palette computed from the animation frames
 * plus index 255 reserved for transparency.
 */

const TRANSPARENT_INDEX = 255;

interface ColorBox {
  bins: number[];
  weight: number;
  rMin: number;
  rMax: number;
  gMin: number;
  gMax: number;
  bMin: number;
  bMax: number;
}

function buildBox(bins: number[], counts: Int32Array): ColorBox {
  let weight = 0;
  let rMin = 31;
  let rMax = 0;
  let gMin = 31;
  let gMax = 0;
  let bMin = 31;
  let bMax = 0;
  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i];
    weight += counts[bin];
    const r = (bin >> 10) & 31;
    const g = (bin >> 5) & 31;
    const b = bin & 31;
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
    if (g < gMin) gMin = g;
    if (g > gMax) gMax = g;
    if (b < bMin) bMin = b;
    if (b > bMax) bMax = b;
  }
  return { bins, weight, rMin, rMax, gMin, gMax, bMin, bMax };
}

function buildAdaptiveColorTable(
  frames: GifFrameInput[],
  pixelCount: number,
  maxColors: number
): { gct: Uint8Array; paletteSize: number } {
  const cappedColors = Math.max(2, Math.min(255, Math.floor(maxColors)));
  const binCount = 32 * 32 * 32;
  const counts = new Int32Array(binCount);
  const sumR = new Float64Array(binCount);
  const sumG = new Float64Array(binCount);
  const sumB = new Float64Array(binCount);

  const totalPixels = frames.length * pixelCount;
  const stride = Math.max(1, Math.floor(totalPixels / 20000));
  let activeBins: number[] = [];

  for (let f = 0; f < frames.length; f++) {
    const rgba = frames[f].rgba;
    for (let i = f % stride; i < pixelCount; i += stride) {
      const o = i * 4;
      if (rgba[o + 3] < 128) continue;
      const r = rgba[o];
      const g = rgba[o + 1];
      const b = rgba[o + 2];
      const bin = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      if (counts[bin] === 0) activeBins.push(bin);
      counts[bin]++;
      sumR[bin] += r;
      sumG[bin] += g;
      sumB[bin] += b;
    }
  }

  const gct = new Uint8Array(256 * 3);
  if (activeBins.length === 0) {
    // Fully transparent fallback: black & white
    gct[3] = 255;
    gct[4] = 255;
    gct[5] = 255;
    return { gct, paletteSize: 2 };
  }

  let boxes: ColorBox[];
  if (activeBins.length <= cappedColors) {
    boxes = activeBins.map((bin) => buildBox([bin], counts));
  } else {
    boxes = [buildBox(activeBins, counts)];
    while (boxes.length < cappedColors) {
      // Pick splittable box with highest (maxChannelSpan * sqrt(weight))
      let bestIdx = -1;
      let bestScore = -1;
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (box.bins.length < 2) continue;
        const span = Math.max(box.rMax - box.rMin, box.gMax - box.gMin, box.bMax - box.bMin);
        if (span <= 0) continue;
        const score = span * Math.sqrt(box.weight);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;

      const target = boxes[bestIdx];
      const rSpan = target.rMax - target.rMin;
      const gSpan = target.gMax - target.gMin;
      const bSpan = target.bMax - target.bMin;
      const shift = rSpan >= gSpan && rSpan >= bSpan ? 10 : gSpan >= bSpan ? 5 : 0;

      target.bins.sort((a, b) => ((a >> shift) & 31) - ((b >> shift) & 31));

      const halfWeight = target.weight / 2;
      let acc = 0;
      let splitAt = 1;
      for (let i = 0; i < target.bins.length - 1; i++) {
        acc += counts[target.bins[i]];
        if (acc >= halfWeight) {
          splitAt = Math.max(1, i + 1);
          break;
        }
      }

      const leftBins = target.bins.slice(0, splitAt);
      const rightBins = target.bins.slice(splitAt);
      boxes.splice(bestIdx, 1, buildBox(leftBins, counts), buildBox(rightBins, counts));
    }
  }

  const paletteSize = Math.min(255, boxes.length);
  for (let i = 0; i < paletteSize; i++) {
    const box = boxes[i];
    let rAcc = 0;
    let gAcc = 0;
    let bAcc = 0;
    let wAcc = 0;
    for (let j = 0; j < box.bins.length; j++) {
      const bin = box.bins[j];
      rAcc += sumR[bin];
      gAcc += sumG[bin];
      bAcc += sumB[bin];
      wAcc += counts[bin];
    }
    const base = i * 3;
    gct[base] = Math.min(255, Math.round(rAcc / Math.max(1, wAcc)));
    gct[base + 1] = Math.min(255, Math.round(gAcc / Math.max(1, wAcc)));
    gct[base + 2] = Math.min(255, Math.round(bAcc / Math.max(1, wAcc)));
  }

  return { gct, paletteSize };
}

function findOpaqueSubRect(
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
      if (rgba[(rowBase + x) * 4 + 3] >= 128) {
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

function quantizeRgbaSubRect(
  rgba: Uint8ClampedArray,
  fullWidth: number,
  left: number,
  top: number,
  subW: number,
  subH: number,
  gct: Uint8Array,
  paletteSize: number,
  lutCache: Uint8Array
): Uint8Array {
  const indices = new Uint8Array(subW * subH);
  let dst = 0;

  for (let y = 0; y < subH; y++) {
    const srcRow = (top + y) * fullWidth + left;
    for (let x = 0; x < subW; x++) {
      const o = (srcRow + x) * 4;
      if (rgba[o + 3] < 128) {
        indices[dst++] = TRANSPARENT_INDEX;
        continue;
      }

      const r = rgba[o];
      const g = rgba[o + 1];
      const b = rgba[o + 2];
      const bin = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let mapped = lutCache[bin];
      if (mapped === 255) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let p = 0; p < paletteSize; p++) {
          const base = p * 3;
          const dr = r - gct[base];
          const dg = g - gct[base + 1];
          const db = b - gct[base + 2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = p;
            if (dist === 0) break;
          }
        }
        mapped = bestIdx;
        lutCache[bin] = mapped;
      }

      indices[dst++] = mapped;
    }
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

export interface EncodeAnimatedGifOptions {
  maxColors?: number; // 2..255, default 255
}

export function encodeAnimatedGif(
  width: number,
  height: number,
  frames: GifFrameInput[],
  options: EncodeAnimatedGifOptions = {}
): Uint8Array {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error("Invalid GIF dimensions");
  }
  if (frames.length === 0) {
    throw new Error("GIF requires at least one frame");
  }

  const pixelCount = width * height;
  const { gct, paletteSize } = buildAdaptiveColorTable(frames, pixelCount, options.maxColors ?? 255);
  const lutCache = new Uint8Array(32 * 32 * 32);
  lutCache.fill(255);

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
  parts.push(gct);

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

    // Trim transparent margins per frame (disposal=2 clears canvas between frames)
    const { left, top, subW, subH } = findOpaqueSubRect(frame.rgba, width, height);

    // Image Descriptor
    parts.push(
      new Uint8Array([
        0x2c,
        left & 0xff, (left >> 8) & 0xff,
        top & 0xff, (top >> 8) & 0xff,
        subW & 0xff, (subW >> 8) & 0xff,
        subH & 0xff, (subH >> 8) & 0xff,
        0x00,
      ])
    );

    // LZW Image Data
    const indexed = quantizeRgbaSubRect(
      frame.rgba,
      width,
      left,
      top,
      subW,
      subH,
      gct,
      paletteSize,
      lutCache
    );
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
