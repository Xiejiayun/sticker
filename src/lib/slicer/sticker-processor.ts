import JSZip from "jszip";
import type { GridSize } from "@/db/schema";
import { getGridCellRect } from "./grid";

export interface CaptionOverlayOptions {
  enabled: boolean;
  style: "bold-pop" | "bubble" | "neon-dark";
  position: "bottom" | "top";
  captions: string[];
}

export interface CellAdjustment {
  offsetX?: number; // -0.25 .. 0.25 (fraction of cell width)
  offsetY?: number; // -0.25 .. 0.25 (fraction of cell height)
  zoom?: number;    // 0.75 .. 1.5
  removeBackground?: boolean;
  tolerance?: number;
  whiteBorderPx?: number;
}

export interface SliceOptions {
  gridSize: GridSize;
  removeBackground: boolean;
  tolerance: number; // 0 - 80
  whiteBorderPx: number; // 0 - 24 (in 512px normalized space)
  smartSeam?: boolean;
  autoCenter?: boolean;
  captionOverlay?: CaptionOverlayOptions;
  cellAdjustments?: Record<number, CellAdjustment>;
}

export type ExportPreset =
  | "original"
  | "wechat"
  | "telegram"
  | "whatsapp"
  | "line"
  | "discord"
  | "discord-sticker"
  | "slack";

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
    case "discord-sticker":
      return { width: 320, height: 320, ext: "png" };
    case "slack":
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

const MAX_IMAGE_CACHE = 5;
const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadStickerImage(src: string): Promise<HTMLImageElement> {
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
    img.onerror = () => reject(new Error("Failed to load image"));
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
  let count = 0;
  for (const offset of samples) {
    if (data[offset + 3] < 200) continue;
    r += data[offset];
    g += data[offset + 1];
    b += data[offset + 2];
    count++;
  }
  if (count === 0) return [255, 255, 255];
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

/**
 * Edge-connected BFS flood fill to remove solid outer background while preserving
 * interior white highlights (eyes, teeth, reflections) and decontaminating feather edges.
 */
function floodFillRemoveBackground(imageData: ImageData, tolerance: number): void {
  const { width: w, height: h, data } = imageData;
  const [bgR, bgG, bgB] = estimateBackgroundColor(data, w, h);
  const tolSq = tolerance * tolerance * 3;
  const softTolSq = (tolerance + 16) * (tolerance + 16) * 3;

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const colorDistSq = (pixelIdx: number) => {
    const o = pixelIdx * 4;
    if (data[o + 3] < 20) return 0;
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

  // Crisp 1px anti-aliasing feather + background color decontamination on boundary pixels
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
        const o = idx * 4;
        const nextAlpha = Math.round(data[o + 3] * ratio);
        data[o + 3] = nextAlpha;

        if (nextAlpha > 10 && ratio > 0.08 && ratio < 0.96) {
          const inv = 1 - ratio;
          const denom = Math.max(0.28, ratio);
          data[o] = Math.max(0, Math.min(255, Math.round((data[o] - bgR * inv) / denom)));
          data[o + 1] = Math.max(0, Math.min(255, Math.round((data[o + 1] - bgG * inv) / denom)));
          data[o + 2] = Math.max(0, Math.min(255, Math.round((data[o + 2] - bgB * inv) / denom)));
        }
      }
    }
  }
}

/**
 * Convenience helper for cutting out solid outer background on any standalone canvas.
 */
export function removeSolidBackgroundOnCanvas(canvas: HTMLCanvasElement, tolerance = 32): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  floodFillRemoveBackground(imgData, tolerance);
  ctx.putImageData(imgData, 0, 0);
}

export function findAlphaBounds(
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

function findNonBgBounds(
  imageData: ImageData,
  tolerance: number
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const { width: w, height: h, data } = imageData;
  const [bgR, bgG, bgB] = estimateBackgroundColor(data, w, h);
  const tolSq = Math.max(18, tolerance) ** 2 * 3;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (data[o + 3] < 128) continue;
      const dr = data[o] - bgR;
      const dg = data[o + 1] - bgG;
      const db = data[o + 2] - bgB;
      if (dr * dr + dg * dg + db * db > tolSq) {
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

interface SeamBounds {
  xBounds: number[];
  yBounds: number[];
}

const seamCache = new WeakMap<HTMLImageElement, Partial<Record<GridSize, SeamBounds>>>();

function computeSmartGridSeams(img: HTMLImageElement, gridSize: GridSize): SeamBounds {
  const existing = seamCache.get(img)?.[gridSize];
  if (existing) return existing;

  const dims = gridSize === "4x4" ? 4 : 3;
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const xBounds = Array.from({ length: dims + 1 }, (_, i) => Math.floor((i * w) / dims));
  const yBounds = Array.from({ length: dims + 1 }, (_, i) => Math.floor((i * h) / dims));

  const maxSide = 512;
  const aw = Math.min(maxSide, w);
  const ah = Math.min(maxSide, h);
  if (aw < dims * 4 || ah < dims * 4) {
    return { xBounds, yBounds };
  }

  const probe = document.createElement("canvas");
  probe.width = aw;
  probe.height = ah;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { xBounds, yBounds };
  ctx.drawImage(img, 0, 0, aw, ah);
  const { data } = ctx.getImageData(0, 0, aw, ah);
  const [bgR, bgG, bgB] = estimateBackgroundColor(data, aw, ah);

  // Compute optimal vertical interior cuts within +/- 5% of nominal grid line
  const xWindow = Math.max(2, Math.round(aw * 0.05));
  for (let c = 1; c < dims; c++) {
    const nominalAx = Math.round((c * aw) / dims);
    let bestAx = nominalAx;
    let bestScore = Infinity;
    const minAx = Math.max(1, nominalAx - xWindow);
    const maxAx = Math.min(aw - 2, nominalAx + xWindow);

    for (let ax = minAx; ax <= maxAx; ax++) {
      let energy = 0;
      for (let ay = 0; ay < ah; ay++) {
        const o = (ay * aw + ax) * 4;
        if (data[o + 3] < 40) continue;
        const dist = Math.abs(data[o] - bgR) + Math.abs(data[o + 1] - bgG) + Math.abs(data[o + 2] - bgB);
        if (dist > 36) energy += dist;
      }
      // Subtle center bias so uniform white margins keep exact nominal split
      const score = energy + Math.abs(ax - nominalAx) * 1.5;
      if (score < bestScore) {
        bestScore = score;
        bestAx = ax;
      }
    }
    xBounds[c] = Math.round((bestAx / aw) * w);
  }

  // Compute optimal horizontal interior cuts within +/- 5% of nominal grid line
  const yWindow = Math.max(2, Math.round(ah * 0.05));
  for (let r = 1; r < dims; r++) {
    const nominalAy = Math.round((r * ah) / dims);
    let bestAy = nominalAy;
    let bestScore = Infinity;
    const minAy = Math.max(1, nominalAy - yWindow);
    const maxAy = Math.min(ah - 2, nominalAy + yWindow);

    for (let ay = minAy; ay <= maxAy; ay++) {
      let energy = 0;
      for (let ax = 0; ax < aw; ax++) {
        const o = (ay * aw + ax) * 4;
        if (data[o + 3] < 40) continue;
        const dist = Math.abs(data[o] - bgR) + Math.abs(data[o + 1] - bgG) + Math.abs(data[o + 2] - bgB);
        if (dist > 36) energy += dist;
      }
      const score = energy + Math.abs(ay - nominalAy) * 1.5;
      if (score < bestScore) {
        bestScore = score;
        bestAy = ay;
      }
    }
    yBounds[r] = Math.round((bestAy / ah) * h);
  }

  probe.width = 0;
  probe.height = 0;

  const entry = seamCache.get(img) ?? {};
  entry[gridSize] = { xBounds, yBounds };
  seamCache.set(img, entry);
  return { xBounds, yBounds };
}

function resolveCellRect(img: HTMLImageElement, options: SliceOptions, cellIndex: number) {
  if (!options.smartSeam) {
    return getGridCellRect(img.naturalWidth, img.naturalHeight, options.gridSize, cellIndex);
  }
  const dims = options.gridSize === "4x4" ? 4 : 3;
  const col = cellIndex % dims;
  const row = Math.floor(cellIndex / dims);
  const { xBounds, yBounds } = computeSmartGridSeams(img, options.gridSize);
  return {
    x: xBounds[col],
    y: yBounds[row],
    width: Math.max(1, xBounds[col + 1] - xBounds[col]),
    height: Math.max(1, yBounds[row + 1] - yBounds[row]),
  };
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

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1d(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }

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

  const rawMask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    rawMask[i] = sData[i * 4 + 3] >= 160 ? 1 : 0;
  }

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
        bData[o + 3] = Math.round(((outerEdge - d) / (outerEdge - innerEdge)) * 255);
      }
    }
  }
  borderCtx.putImageData(borderImg, 0, 0);
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
  targetSize: number | { width: number; height: number } | null,
  options: SliceOptions,
  cellIndex = 0
): HTMLCanvasElement {
  const adj = options.cellAdjustments?.[cellIndex];
  const cellRemoveBg = adj?.removeBackground ?? options.removeBackground;
  const cellTolerance = adj?.tolerance ?? options.tolerance;
  const cellWhiteBorderPx = adj?.whiteBorderPx ?? options.whiteBorderPx;
  const zoom = Math.max(0.75, Math.min(1.5, adj?.zoom ?? 1));
  const offsetX = Math.max(-0.25, Math.min(0.25, adj?.offsetX ?? 0));
  const offsetY = Math.max(-0.25, Math.min(0.25, adj?.offsetY ?? 0));
  const hasCropAdjustment = zoom !== 1 || offsetX !== 0 || offsetY !== 0;

  const nativeW = Math.max(1, Math.round(sw));
  const nativeH = Math.max(1, Math.round(sh));
  const cellCanvas = document.createElement("canvas");
  cellCanvas.width = nativeW;
  cellCanvas.height = nativeH;
  const cellCtx = cellCanvas.getContext("2d", { willReadFrequently: true })!;

  if (!hasCropAdjustment) {
    cellCtx.drawImage(img, Math.round(sx), Math.round(sy), nativeW, nativeH, 0, 0, nativeW, nativeH);
  } else {
    // Fill canvas with white fallback before shifted/zoomed draw so edges remain clean
    cellCtx.fillStyle = "#FFFFFF";
    cellCtx.fillRect(0, 0, nativeW, nativeH);
    const cropW = nativeW / zoom;
    const cropH = nativeH / zoom;
    const centerX = sx + sw / 2 - offsetX * sw;
    const centerY = sy + sh / 2 - offsetY * sh;
    const desiredSx = centerX - cropW / 2;
    const desiredSy = centerY - cropH / 2;
    const clampedSx = Math.max(0, desiredSx);
    const clampedSy = Math.max(0, desiredSy);
    const clampedEx = Math.min(img.naturalWidth, desiredSx + cropW);
    const clampedEy = Math.min(img.naturalHeight, desiredSy + cropH);
    if (clampedEx > clampedSx && clampedEy > clampedSy) {
      const dstX = ((clampedSx - desiredSx) / cropW) * nativeW;
      const dstY = ((clampedSy - desiredSy) / cropH) * nativeH;
      const dstW = ((clampedEx - clampedSx) / cropW) * nativeW;
      const dstH = ((clampedEy - clampedSy) / cropH) * nativeH;
      cellCtx.imageSmoothingQuality = "high";
      cellCtx.drawImage(
        img,
        clampedSx,
        clampedSy,
        clampedEx - clampedSx,
        clampedEy - clampedSy,
        dstX,
        dstY,
        dstW,
        dstH
      );
    }
  }

  const targetDims =
    targetSize === null
      ? null
      : typeof targetSize === "number"
        ? { width: targetSize, height: targetSize }
        : targetSize;

  // Faithful lossless crop when background removal & autoCenter are off
  if (!cellRemoveBg) {
    if (!options.autoCenter) {
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

    // Optional autoCenter for opaque cells (trims uneven background margins and centers nicely)
    const imgData = cellCtx.getImageData(0, 0, nativeW, nativeH);
    const [bgR, bgG, bgB] = estimateBackgroundColor(imgData.data, nativeW, nativeH);
    const bounds = findNonBgBounds(imgData, cellTolerance);
    if (targetDims === null || !bounds) {
      if (targetDims === null) return finalizeCellCanvas(cellCanvas, options, cellIndex);
      const output = document.createElement("canvas");
      output.width = targetDims.width;
      output.height = targetDims.height;
      const ctx = output.getContext("2d")!;
      ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
      ctx.fillRect(0, 0, targetDims.width, targetDims.height);
      const scale = Math.min(1, targetDims.width / nativeW, targetDims.height / nativeH);
      const w = Math.round(nativeW * scale);
      const h = Math.round(nativeH * scale);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(cellCanvas, 0, 0, nativeW, nativeH, Math.floor((targetDims.width - w) / 2), Math.floor((targetDims.height - h) / 2), w, h);
      return finalizeCellCanvas(output, options, cellIndex);
    }

    const bw = bounds.maxX - bounds.minX + 1;
    const bh = bounds.maxY - bounds.minY + 1;
    const outW = targetDims.width;
    const outH = targetDims.height;
    const pad = Math.round(Math.min(outW, outH) * 0.05);
    const availW = Math.max(1, outW - pad * 2);
    const availH = Math.max(1, outH - pad * 2);
    const scale = Math.min(1, availW / bw, availH / bh);
    const dw = Math.round(bw * scale);
    const dh = Math.round(bh * scale);
    const dx = Math.round((outW - dw) / 2);
    const dy = Math.round((outH - dh) / 2);

    const output = document.createElement("canvas");
    output.width = outW;
    output.height = outH;
    const ctx = output.getContext("2d")!;
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, outW, outH);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(cellCanvas, bounds.minX, bounds.minY, bw, bh, dx, dy, dw, dh);
    return finalizeCellCanvas(output, options, cellIndex);
  }

  // Step 2: Optional flood-fill background removal
  const imgData = cellCtx.getImageData(0, 0, nativeW, nativeH);
  floodFillRemoveBackground(imgData, cellTolerance);
  cellCtx.putImageData(imgData, 0, 0);
  const bounds = findAlphaBounds(imgData);

  // Step 3: Place into output canvas
  if (targetDims === null) {
    const bw = bounds ? bounds.maxX - bounds.minX + 1 : nativeW;
    const bh = bounds ? bounds.maxY - bounds.minY + 1 : nativeH;
    const baseSide = Math.max(bw, bh);
    const borderPx = Math.round((cellWhiteBorderPx / 512) * baseSide);
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
      borderPx > 0 ? applyDieCutWhiteBorder(centeredCanvas, borderPx) : centeredCanvas;
    return finalizeCellCanvas(res, options, cellIndex);
  }

  const outW = targetDims.width;
  const outH = targetDims.height;
  const minOut = Math.min(outW, outH);
  const scaledBorder = Math.round((cellWhiteBorderPx / 512) * minOut);
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
    scaledBorder > 0 ? applyDieCutWhiteBorder(centeredCanvas, scaledBorder) : centeredCanvas;
  return finalizeCellCanvas(res, options, cellIndex);
}

/**
 * Generates preview thumbnails for all cells in the grid for fast interactive UI.
 */
export async function sliceStickerPreview(
  masterImageUrl: string,
  options: SliceOptions
): Promise<ProcessedSticker[]> {
  const img = await loadStickerImage(masterImageUrl);
  const dims = options.gridSize === "4x4" ? 4 : 3;
  const results: ProcessedSticker[] = [];

  for (let i = 0; i < dims * dims; i++) {
    const cell = resolveCellRect(img, options, i);
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
  const img = await loadStickerImage(masterImageUrl);
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
      const cell = resolveCellRect(img, options, i);
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
    const firstCell = resolveCellRect(img, options, 0);
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
  const img = await loadStickerImage(masterImageUrl);
  const cell = resolveCellRect(img, options, cellIndex);
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
  const img = await loadStickerImage(masterImageUrl);
  const cell = resolveCellRect(img, options, cellIndex);
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
  const img = await loadStickerImage(masterImageUrl);
  const cell = resolveCellRect(img, options, cellIndex);
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
