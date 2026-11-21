import JSZip from "jszip";
import type { GridSize } from "@/db/schema";
import { getGridCellRect } from "./grid";

export interface SliceOptions {
  gridSize: GridSize;
  removeBackground: boolean;
  tolerance: number; // 0 - 80
  whiteBorderPx: number; // 0 - 24 (in 512px normalized space)
}

export type ExportPreset = "original" | "wechat" | "telegram";

export interface ProcessedSticker {
  index: number;
  dataUrl: string;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load master sticker sheet image"));
    img.src = src;
  });
}

function estimateBackgroundColor(
  data: Uint8ClampedArray,
  w: number,
  h: number
): [number, number, number] {
  const samples = [
    0,
    (w - 1) * 4,
    (h - 1) * w * 4,
    ((h - 1) * w + (w - 1)) * 4,
    Math.floor(w / 2) * 4,
    ((h - 1) * w + Math.floor(w / 2)) * 4,
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  for (const offset of samples) {
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
  }
  const n = samples.length;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/**
 * Edge-connected BFS flood fill to remove solid outer background while preserving
 * interior white highlights (eyes, teeth, reflections).
 */
function floodFillRemoveBackground(imageData: ImageData, tolerance: number): void {
  const { width: w, height: h, data } = imageData;
  const [bgR, bgG, bgB] = estimateBackgroundColor(data, w, h);
  const tolSq = tolerance * tolerance * 3;
  const softTolSq = (tolerance + 14) * (tolerance + 14) * 3;

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const colorDistSq = (pixelIdx: number) => {
    const o = pixelIdx * 4;
    const dr = data[o] - bgR;
    const dg = data[o + 1] - bgG;
    const db = data[o + 2] - bgB;
    return dr * dr + dg * dg + db * db;
  };

  const enqueueIfBg = (x: number, y: number) => {
    const idx = y * w + x;
    if (visited[idx]) return;
    if (colorDistSq(idx) <= tolSq) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    enqueueIfBg(x, 0);
    enqueueIfBg(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueueIfBg(0, y);
    enqueueIfBg(w - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    data[idx * 4 + 3] = 0;

    const x = idx % w;
    const y = (idx - x) / w;

    if (x > 0) enqueueIfBg(x - 1, y);
    if (x < w - 1) enqueueIfBg(x + 1, y);
    if (y > 0) enqueueIfBg(x, y - 1);
    if (y < h - 1) enqueueIfBg(x, y + 1);
  }

  // Crisp 1px anti-aliasing feather on boundary pixels
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (visited[idx]) continue;
      const touchesBg =
        visited[idx - 1] || visited[idx + 1] || visited[idx - w] || visited[idx + w];
      if (!touchesBg) continue;

      const distSq = colorDistSq(idx);
      if (distSq <= softTolSq) {
        const ratio = Math.max(0, Math.min(1, (distSq - tolSq) / Math.max(1, softTolSq - tolSq)));
        data[idx * 4 + 3] = Math.round(data[idx * 4 + 3] * ratio);
      }
    }
  }
}

function findAlphaBounds(
  imageData: ImageData
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const { width: w, height: h, data } = imageData;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] >= 128) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * 1D squared Euclidean distance transform (Felzenszwalb & Huttenlocher, O(n)).
 */
function edt1d(f: Float32Array, n: number, d: Float32Array, v: Int32Array, z: Float32Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -1e20;
  z[1] = 1e20;

  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = 1e20;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const diff = q - v[k];
    d[q] = diff * diff + f[v[k]];
  }
}

/**
 * 2D exact Euclidean distance transform from binary foreground mask (1 = fg, 0 = bg).
 * Returns Float32Array of exact Euclidean distance to nearest foreground pixel.
 */
function computeDistanceField(fgMask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e12;
  const grid = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    grid[i] = fgMask[i] ? 0 : INF;
  }

  const maxDim = Math.max(w, h);
  const f = new Float32Array(maxDim);
  const d = new Float32Array(maxDim);
  const v = new Int32Array(maxDim);
  const z = new Float32Array(maxDim + 1);

  // Transform along columns
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }

  // Transform along rows
  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) f[x] = grid[rowOff + x];
    edt1d(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[rowOff + x] = Math.sqrt(d[x]);
  }

  return grid;
}

/**
 * Renders a silky-smooth, anti-aliased die-cut white border underneath a transparent sticker
 * using an exact 2D Euclidean Distance Field (zero stair-steps, zero fuzzy gray halo).
 */
function applyDieCutWhiteBorder(
  sourceCanvas: HTMLCanvasElement,
  borderRadius: number
): HTMLCanvasElement {
  if (borderRadius <= 0) return sourceCanvas;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const srcCtx = sourceCanvas.getContext("2d", { willReadFrequently: true })!;
  const srcImg = srcCtx.getImageData(0, 0, w, h);
  const sData = srcImg.data;

  // 1. Build clean binary foreground mask (threshold >= 160 to ignore faint shadow fringe)
  const rawMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    rawMask[i] = sData[i * 4 + 3] >= 160 ? 1 : 0;
  }

  // 2. Despeckle: remove isolated 1px noisy border specks (keep only pixels with >= 3 fg neighbors)
  const cleanMask = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      if (!rawMask[idx]) continue;
      const neighbors =
        rawMask[idx - 1] +
        rawMask[idx + 1] +
        rawMask[idx - w] +
        rawMask[idx + w] +
        rawMask[idx - w - 1] +
        rawMask[idx - w + 1] +
        rawMask[idx + w - 1] +
        rawMask[idx + w + 1];
      if (neighbors >= 3) cleanMask[idx] = 1;
    }
  }

  // 3. Exact Euclidean distance field -> smooth 1.5px sub-pixel anti-aliased white border
  const dist = computeDistanceField(cleanMask, w, h);
  const borderCanvas = document.createElement("canvas");
  borderCanvas.width = w;
  borderCanvas.height = h;
  const borderCtx = borderCanvas.getContext("2d")!;
  const borderImg = borderCtx.createImageData(w, h);
  const bData = borderImg.data;

  const innerEdge = borderRadius - 0.75;
  const outerEdge = borderRadius + 0.75;

  for (let i = 0; i < w * h; i++) {
    const d = dist[i];
    if (d <= outerEdge) {
      const o = i * 4;
      bData[o] = 255;
      bData[o + 1] = 255;
      bData[o + 2] = 255;
      if (d <= innerEdge) {
        bData[o + 3] = 255;
      } else {
        // Smooth sub-pixel anti-aliased outer contour
        bData[o + 3] = Math.round(((outerEdge - d) / (outerEdge - innerEdge)) * 255);
      }
    }
  }
  borderCtx.putImageData(borderImg, 0, 0);

  // 4. Composite crisp original sticker directly on top of the smooth white border
  borderCtx.drawImage(sourceCanvas, 0, 0);
  return borderCanvas;
}

function processSingleCell(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetSize: number | null, // null => lossless 1:1 native crop (zero upscaling!)
  options: SliceOptions
): HTMLCanvasElement {
  // Step 1: Extract cell at exact 1:1 native pixel dimensions (never resampled!)
  const nativeW = Math.max(1, Math.round(sw));
  const nativeH = Math.max(1, Math.round(sh));
  const cellCanvas = document.createElement("canvas");
  cellCanvas.width = nativeW;
  cellCanvas.height = nativeH;
  const cellCtx = cellCanvas.getContext("2d", { willReadFrequently: true })!;
  cellCtx.drawImage(img, Math.round(sx), Math.round(sy), nativeW, nativeH, 0, 0, nativeW, nativeH);

  // The default path is a faithful cell crop: no cutout, recentering or extra rim.
  if (!options.removeBackground) {
    if (targetSize === null) return cellCanvas;
    const output = document.createElement("canvas");
    output.width = targetSize;
    output.height = targetSize;
    const ctx = output.getContext("2d")!;
    const scale = Math.min(1, targetSize / nativeW, targetSize / nativeH);
    const width = Math.round(nativeW * scale);
    const height = Math.round(nativeH * scale);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cellCanvas, 0, 0, nativeW, nativeH, Math.floor((targetSize - width) / 2), Math.floor((targetSize - height) / 2), width, height);
    return output;
  }

  // Step 2: Optional flood-fill background removal
  let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  if (options.removeBackground) {
    const imgData = cellCtx.getImageData(0, 0, nativeW, nativeH);
    floodFillRemoveBackground(imgData, options.tolerance);
    cellCtx.putImageData(imgData, 0, 0);
    bounds = findAlphaBounds(imgData);
  }

  // Step 3: Place into square output canvas
  // When targetSize is null ("original"), keep exact 1:1 native pixels (NEVER upscale!)
  if (targetSize === null) {
    const bw = bounds ? bounds.maxX - bounds.minX + 1 : nativeW;
    const bh = bounds ? bounds.maxY - bounds.minY + 1 : nativeH;
    const baseSide = Math.max(bw, bh);
    const borderPx = options.removeBackground
      ? Math.round((options.whiteBorderPx / 512) * baseSide)
      : 0;
    const pad = Math.round(baseSide * 0.04) + borderPx;
    const outSide = baseSide + pad * 2;

    const centeredCanvas = document.createElement("canvas");
    centeredCanvas.width = outSide;
    centeredCanvas.height = outSide;
    const centeredCtx = centeredCanvas.getContext("2d")!;

    const dx = Math.round((outSide - bw) / 2);
    const dy = Math.round((outSide - bh) / 2);
    if (bounds) {
      centeredCtx.drawImage(cellCanvas, bounds.minX, bounds.minY, bw, bh, dx, dy, bw, bh);
    } else {
      centeredCtx.drawImage(cellCanvas, 0, 0, nativeW, nativeH, dx, dy, nativeW, nativeH);
    }

    if (options.removeBackground && borderPx > 0) {
      return applyDieCutWhiteBorder(centeredCanvas, borderPx);
    }
    return centeredCanvas;
  }

  // Fixed targetSize (e.g. WeChat 240x240, Telegram 512x512, or preview 384x384)
  const outSize = targetSize;
  const scaledBorder = options.removeBackground
    ? Math.round((options.whiteBorderPx / 512) * outSize)
    : 0;
  const padding = Math.round(outSize * 0.05) + scaledBorder;

  const centeredCanvas = document.createElement("canvas");
  centeredCanvas.width = outSize;
  centeredCanvas.height = outSize;
  const centeredCtx = centeredCanvas.getContext("2d")!;
  centeredCtx.imageSmoothingEnabled = true;
  centeredCtx.imageSmoothingQuality = "high";

  if (bounds) {
    const bw = bounds.maxX - bounds.minX + 1;
    const bh = bounds.maxY - bounds.minY + 1;
    const avail = Math.max(1, outSize - padding * 2);
    // Cap scale at 1.0 when native crop already fits inside outSize (avoid blurry upscaling)
    const scale = Math.min(1, avail / bw, avail / bh);
    const dw = Math.round(bw * scale);
    const dh = Math.round(bh * scale);
    const dx = Math.round((outSize - dw) / 2);
    const dy = Math.round((outSize - dh) / 2);

    centeredCtx.drawImage(cellCanvas, bounds.minX, bounds.minY, bw, bh, dx, dy, dw, dh);
  } else {
    const avail = Math.max(1, outSize - padding * 2);
    centeredCtx.drawImage(cellCanvas, 0, 0, nativeW, nativeH, padding, padding, avail, avail);
  }

  if (options.removeBackground && scaledBorder > 0) {
    return applyDieCutWhiteBorder(centeredCanvas, scaledBorder);
  }

  return centeredCanvas;
}

/**
 * Generates preview thumbnails for all cells in the grid for fast interactive UI.
 */
export async function sliceStickerPreview(
  masterImageUrl: string,
  options: SliceOptions
): Promise<ProcessedSticker[]> {
  const img = await loadImage(masterImageUrl);
  const dims = options.gridSize === "4x4" ? 4 : 3;
  const results: ProcessedSticker[] = [];

  for (let i = 0; i < dims * dims; i++) {
    const cell = getGridCellRect(img.naturalWidth, img.naturalHeight, options.gridSize, i);
    const canvas = processSingleCell(img, cell.x, cell.y, cell.width, cell.height, 384, options);
    results.push({
      index: i,
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    });
  }

  return results;
}

function getExportTargetSize(preset: ExportPreset): number | null {
  if (preset === "wechat") return 240;
  if (preset === "telegram") return 512;
  return null; // "original" = exact 1:1 native pixels, zero upscaling!
}

/**
 * Exports all stickers in the chosen preset resolution packaged into a single ZIP Blob.
 */
export async function exportStickerPackZip(
  masterImageUrl: string,
  options: SliceOptions,
  preset: ExportPreset,
  captions?: string[]
): Promise<Blob> {
  const img = await loadImage(masterImageUrl);
  const dims = options.gridSize === "4x4" ? 4 : 3;
  const targetSize = getExportTargetSize(preset);

  const zip = new JSZip();

  for (let i = 0; i < dims * dims; i++) {
    const cell = getGridCellRect(img.naturalWidth, img.naturalHeight, options.gridSize, i);
    const canvas = processSingleCell(
      img,
      cell.x,
      cell.y,
      cell.width,
      cell.height,
      targetSize,
      options
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
        "image/png"
      );
    });

    const num = String(i + 1).padStart(2, "0");
    const safeCaption = captions?.[i]
      ? `_${captions[i].replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "").slice(0, 10)}`
      : "";
    zip.file(`sticker_${num}${safeCaption}.png`, blob);
  }

  return zip.generateAsync({ type: "blob" });
}

/**
 * Exports one specific sticker at the chosen preset resolution as a PNG Blob.
 */
export async function exportSingleStickerPng(
  masterImageUrl: string,
  cellIndex: number,
  options: SliceOptions,
  preset: ExportPreset
): Promise<Blob> {
  const img = await loadImage(masterImageUrl);
  const cell = getGridCellRect(img.naturalWidth, img.naturalHeight, options.gridSize, cellIndex);

  const canvas = processSingleCell(
    img,
    cell.x,
    cell.y,
    cell.width,
    cell.height,
    getExportTargetSize(preset),
    options
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
      "image/png"
    );
  });
}
