import JSZip from "jszip";
import type { GridSize } from "@/db/schema";
import { getGridCellRect } from "./grid";

export interface CaptionOverlayOptions {
  enabled: boolean;
  style: "bold-pop" | "bubble" | "neon-dark";
  position: "bottom" | "top";
  captions: string[];
}

export interface SliceOptions {
  gridSize: GridSize;
  removeBackground: boolean;
  tolerance: number; // 0 - 80
  whiteBorderPx: number; // 0 - 24 (in 512px normalized space)
  captionOverlay?: CaptionOverlayOptions;
}

export type ExportPreset = "original" | "wechat" | "telegram" | "whatsapp" | "line" | "discord";

export interface ExportPresetDimensions {
  width: number | null;
  height: number | null;
  ext: "png" | "webp";
}

export function getExportPresetDimensions(preset: ExportPreset): ExportPresetDimensions {
  switch (preset) {
    case "wechat":
      return { width: 240, height: 240, ext: "png" };
    case "telegram":
      return { width: 512, height: 512, ext: "png" };
    case "whatsapp":
      return { width: 512, height: 512, ext: "webp" };
    case "line":
      return { width: 370, height: 320, ext: "png" };
    case "discord":
      return { width: 128, height: 128, ext: "png" };
    case "original":
    default:
      return { width: null, height: null, ext: "png" };
  }
}

export interface ProcessedSticker {
  index: number;
  dataUrl: string;
  width: number;
  height: number;
}

const MAX_IMAGE_CACHE = 3;
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) {
    imageCache.delete(src);
    imageCache.set(src, cached);
    return cached;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load master sticker sheet image"));
    img.src = src;
  }).catch((err) => {
    imageCache.delete(src);
    throw err;
  });

  if (imageCache.size >= MAX_IMAGE_CACHE) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey !== undefined) imageCache.delete(oldestKey);
  }
  imageCache.set(src, promise);
  return promise;
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

function drawRoundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCaptionOverlay(
  canvas: HTMLCanvasElement,
  rawText: string,
  style: CaptionOverlayOptions["style"],
  position: CaptionOverlayOptions["position"]
): HTMLCanvasElement {
  const text = rawText.trim();
  if (!text) return canvas;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  const maxWidth = w * 0.86;
  let fontSize = Math.max(14, Math.round(Math.min(w, h) * 0.145));

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontFamily = '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

  while (fontSize > 12) {
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }

  const metrics = ctx.measureText(text);
  const textWidth = Math.min(maxWidth, metrics.width);
  const padX = Math.max(10, Math.round(fontSize * 0.55));
  const padY = Math.max(5, Math.round(fontSize * 0.3));
  const cy =
    position === "top"
      ? Math.round(Math.max(fontSize * 0.85, h * 0.115))
      : Math.round(Math.min(h - fontSize * 0.85, h * 0.885));
  const cx = Math.round(w / 2);

  if (style === "bubble") {
    const boxW = textWidth + padX * 2;
    const boxH = fontSize + padY * 2;
    const bx = Math.round(cx - boxW / 2);
    const by = Math.round(cy - boxH / 2);
    const strokeW = Math.max(2, Math.round(fontSize * 0.11));

    drawRoundRectPath(ctx, bx, by, boxW, boxH, Math.round(boxH / 2));
    ctx.fillStyle = "#FFFDF7";
    ctx.fill();
    ctx.lineWidth = strokeW;
    ctx.strokeStyle = "#1E1B2E";
    ctx.stroke();

    ctx.fillStyle = "#1E1B2E";
    ctx.fillText(text, cx, cy, maxWidth);
  } else {
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.24));
    ctx.strokeStyle = "#1E1B2E";
    ctx.strokeText(text, cx, cy, maxWidth);
    ctx.fillStyle = style === "neon-dark" ? "#FFF3C4" : "#FFFFFF";
    ctx.fillText(text, cx, cy, maxWidth);
  }

  ctx.restore();
  return canvas;
}

function finalizeCellCanvas(
  canvas: HTMLCanvasElement,
  options: SliceOptions,
  cellIndex: number
): HTMLCanvasElement {
  const overlay = options.captionOverlay;
  if (!overlay?.enabled) return canvas;
  const text = overlay.captions[cellIndex] ?? "";
  if (!text.trim()) return canvas;
  return drawCaptionOverlay(canvas, text, overlay.style, overlay.position);
}

function processSingleCell(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetSize: number | { width: number; height: number } | null, // null => lossless 1:1 native crop (zero upscaling!)
  options: SliceOptions,
  cellIndex = 0
): HTMLCanvasElement {
  // Step 1: Extract cell at exact 1:1 native pixel dimensions (never resampled!)
  const nativeW = Math.max(1, Math.round(sw));
  const nativeH = Math.max(1, Math.round(sh));
  const cellCanvas = document.createElement("canvas");
  cellCanvas.width = nativeW;
  cellCanvas.height = nativeH;
  const cellCtx = cellCanvas.getContext("2d", { willReadFrequently: true })!;
  cellCtx.drawImage(img, Math.round(sx), Math.round(sy), nativeW, nativeH, 0, 0, nativeW, nativeH);

  const targetDims =
    targetSize === null
      ? null
      : typeof targetSize === "number"
        ? { width: targetSize, height: targetSize }
        : targetSize;

  // The default path is a faithful cell crop: no cutout, recentering or extra rim.
  if (!options.removeBackground) {
    if (targetDims === null) return finalizeCellCanvas(cellCanvas, options, cellIndex);
    const output = document.createElement("canvas");
    output.width = targetDims.width;
    output.height = targetDims.height;
    const ctx = output.getContext("2d")!;
    const scale = Math.min(1, targetDims.width / nativeW, targetDims.height / nativeH);
    const width = Math.round(nativeW * scale);
    const height = Math.round(nativeH * scale);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      cellCanvas,
      0,
      0,
      nativeW,
      nativeH,
      Math.floor((targetDims.width - width) / 2),
      Math.floor((targetDims.height - height) / 2),
      width,
      height
    );
    return finalizeCellCanvas(output, options, cellIndex);
  }

  // Step 2: Optional flood-fill background removal
  let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  if (options.removeBackground) {
    const imgData = cellCtx.getImageData(0, 0, nativeW, nativeH);
    floodFillRemoveBackground(imgData, options.tolerance);
    cellCtx.putImageData(imgData, 0, 0);
    bounds = findAlphaBounds(imgData);
  }

  // Step 3: Place into output canvas
  // When targetDims is null ("original"), keep exact 1:1 native pixels (NEVER upscale!)
  if (targetDims === null) {
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

    const res =
      options.removeBackground && borderPx > 0
        ? applyDieCutWhiteBorder(centeredCanvas, borderPx)
        : centeredCanvas;
    return finalizeCellCanvas(res, options, cellIndex);
  }

  // Fixed target dimensions (e.g. WeChat 240x240, Telegram/WhatsApp 512x512, LINE 370x320, Discord 128x128)
  const outW = targetDims.width;
  const outH = targetDims.height;
  const minOut = Math.min(outW, outH);
  const scaledBorder = options.removeBackground
    ? Math.round((options.whiteBorderPx / 512) * minOut)
    : 0;
  const padding = Math.round(minOut * 0.05) + scaledBorder;

  const centeredCanvas = document.createElement("canvas");
  centeredCanvas.width = outW;
  centeredCanvas.height = outH;
  const centeredCtx = centeredCanvas.getContext("2d")!;
  centeredCtx.imageSmoothingEnabled = true;
  centeredCtx.imageSmoothingQuality = "high";

  if (bounds) {
    const bw = bounds.maxX - bounds.minX + 1;
    const bh = bounds.maxY - bounds.minY + 1;
    const availW = Math.max(1, outW - padding * 2);
    const availH = Math.max(1, outH - padding * 2);
    // Cap scale at 1.0 when native crop already fits inside output (avoid blurry upscaling)
    const scale = Math.min(1, availW / bw, availH / bh);
    const dw = Math.round(bw * scale);
    const dh = Math.round(bh * scale);
    const dx = Math.round((outW - dw) / 2);
    const dy = Math.round((outH - dh) / 2);

    centeredCtx.drawImage(cellCanvas, bounds.minX, bounds.minY, bw, bh, dx, dy, dw, dh);
  } else {
    const availW = Math.max(1, outW - padding * 2);
    const availH = Math.max(1, outH - padding * 2);
    const scale = Math.min(1, availW / nativeW, availH / nativeH);
    const dw = Math.round(nativeW * scale);
    const dh = Math.round(nativeH * scale);
    const dx = Math.round((outW - dw) / 2);
    const dy = Math.round((outH - dh) / 2);
    centeredCtx.drawImage(cellCanvas, 0, 0, nativeW, nativeH, dx, dy, dw, dh);
  }

  const res =
    options.removeBackground && scaledBorder > 0
      ? applyDieCutWhiteBorder(centeredCanvas, scaledBorder)
      : centeredCanvas;
  return finalizeCellCanvas(res, options, cellIndex);
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
    const canvas = processSingleCell(img, cell.x, cell.y, cell.width, cell.height, 384, options, i);
    results.push({
      index: i,
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    });
  }

  return results;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: "image/png" | "image/webp", quality?: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`${mimeType} encoding failed`))),
      mimeType,
      quality
    );
  });
}

async function encodeCanvasToWhatsappWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  const MAX_BYTES = 100 * 1024;
  let lastBlob: Blob | null = null;
  for (const quality of [0.92, 0.82, 0.72, 0.62, 0.52, 0.42]) {
    const blob = await canvasToBlob(canvas, "image/webp", quality);
    lastBlob = blob;
    if (blob.size <= MAX_BYTES) {
      return blob;
    }
  }
  return lastBlob!;
}

async function encodeCanvasForPreset(canvas: HTMLCanvasElement, preset: ExportPreset): Promise<{ blob: Blob; ext: "png" | "webp" }> {
  const dims = getExportPresetDimensions(preset);
  if (dims.ext === "webp") {
    return { blob: await encodeCanvasToWhatsappWebp(canvas), ext: "webp" };
  }
  return { blob: await canvasToBlob(canvas, "image/png"), ext: "png" };
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
  const presetDims = getExportPresetDimensions(preset);
  const targetSize =
    presetDims.width && presetDims.height
      ? { width: presetDims.width, height: presetDims.height }
      : null;

  const zip = new JSZip();
  const cellCount = dims * dims;

  const entries = await Promise.all(
    Array.from({ length: cellCount }, async (_, i) => {
      const cell = getGridCellRect(img.naturalWidth, img.naturalHeight, options.gridSize, i);
      const canvas = processSingleCell(
        img,
        cell.x,
        cell.y,
        cell.width,
        cell.height,
        targetSize,
        options,
        i
      );

      const { blob, ext } = await encodeCanvasForPreset(canvas, preset);
      canvas.width = 0;
      canvas.height = 0;

      const num = String(i + 1).padStart(2, "0");
      const safeCaption = captions?.[i]
        ? `_${captions[i].replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "").slice(0, 10)}`
        : "";
      return { name: `sticker_${num}${safeCaption}.${ext}`, blob };
    })
  );

  for (const entry of entries) {
    zip.file(entry.name, entry.blob);
  }

  // Include platform companion icon assets (Tray / Main / Tab) from cell 0
  if (preset === "whatsapp" || preset === "line") {
    const firstCell = getGridCellRect(img.naturalWidth, img.naturalHeight, options.gridSize, 0);
    const companionSpecs =
      preset === "whatsapp"
        ? [{ name: "tray_icon_96x96.png", width: 96, height: 96 }]
        : [
            { name: "main_240x240.png", width: 240, height: 240 },
            { name: "tab_96x74.png", width: 96, height: 74 },
          ];
    for (const spec of companionSpecs) {
      const c = processSingleCell(
        img,
        firstCell.x,
        firstCell.y,
        firstCell.width,
        firstCell.height,
        { width: spec.width, height: spec.height },
        { ...options, captionOverlay: undefined },
        0
      );
      const blob = await canvasToBlob(c, "image/png");
      c.width = 0;
      c.height = 0;
      zip.file(spec.name, blob);
    }
  }

  return zip.generateAsync({ type: "blob" });
}

/**
 * Renders one processed sticker cell onto a standalone HTMLCanvasElement.
 */
export async function renderSingleStickerCanvas(
  masterImageUrl: string,
  cellIndex: number,
  options: SliceOptions,
  targetSize: number | { width: number; height: number } | null = null
): Promise<HTMLCanvasElement> {
  const img = await loadImage(masterImageUrl);
  const cell = getGridCellRect(img.naturalWidth, img.naturalHeight, options.gridSize, cellIndex);
  return processSingleCell(
    img,
    cell.x,
    cell.y,
    cell.width,
    cell.height,
    targetSize,
    options,
    cellIndex
  );
}

/**
 * Exports one specific sticker at the chosen preset resolution in its target format (PNG or WebP).
 */
export async function exportSingleStickerFile(
  masterImageUrl: string,
  cellIndex: number,
  options: SliceOptions,
  preset: ExportPreset
): Promise<{ blob: Blob; ext: "png" | "webp" }> {
  const img = await loadImage(masterImageUrl);
  const cell = getGridCellRect(img.naturalWidth, img.naturalHeight, options.gridSize, cellIndex);
  const presetDims = getExportPresetDimensions(preset);
  const targetSize =
    presetDims.width && presetDims.height
      ? { width: presetDims.width, height: presetDims.height }
      : null;

  const canvas = processSingleCell(
    img,
    cell.x,
    cell.y,
    cell.width,
    cell.height,
    targetSize,
    options,
    cellIndex
  );

  const encoded = await encodeCanvasForPreset(canvas, preset);
  canvas.width = 0;
  canvas.height = 0;
  return encoded;
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
  const presetDims = getExportPresetDimensions(preset);
  const targetSize =
    presetDims.width && presetDims.height
      ? { width: presetDims.width, height: presetDims.height }
      : null;

  const canvas = processSingleCell(
    img,
    cell.x,
    cell.y,
    cell.width,
    cell.height,
    targetSize,
    options,
    cellIndex
  );

  const blob = await canvasToBlob(canvas, "image/png");
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}
