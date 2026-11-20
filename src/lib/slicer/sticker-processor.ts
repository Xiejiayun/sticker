import JSZip from "jszip";
import type { GridSize } from "@/db/schema";

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

function estimateBackgroundColor(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
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
  const softTolSq = (tolerance + 18) * (tolerance + 18) * 3;

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

  // Seed all four borders
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

  // Soft 1px anti-aliasing feather on pixels immediately adjacent to removed background
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

function findAlphaBounds(imageData: ImageData): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const { width: w, height: h, data } = imageData;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
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
 * Renders a smooth die-cut white border underneath a transparent sticker canvas
 * by stamping a white silhouette around a circular offset ring.
 */
function applyDieCutWhiteBorder(
  sourceCanvas: HTMLCanvasElement,
  borderRadius: number
): HTMLCanvasElement {
  if (borderRadius <= 0) return sourceCanvas;

  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  // Build pure-white silhouette of the sticker
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d")!;
  maskCtx.drawImage(sourceCanvas, 0, 0);
  maskCtx.globalCompositeOperation = "source-in";
  maskCtx.fillStyle = "#FFFFFF";
  maskCtx.fillRect(0, 0, w, h);

  const outCanvas = document.createElement("canvas");
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext("2d")!;

  const steps = Math.max(16, Math.round(borderRadius * 3));
  for (let r = borderRadius; r >= Math.max(1, borderRadius - 2); r -= 2) {
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dx = Math.cos(angle) * r;
      const dy = Math.sin(angle) * r;
      outCtx.drawImage(maskCanvas, dx, dy);
    }
  }

  // Draw crisp original sticker on top
  outCtx.drawImage(sourceCanvas, 0, 0);
  return outCanvas;
}

function processSingleCell(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetSize: number,
  options: SliceOptions
): HTMLCanvasElement {
  // Step 1: Extract cell at working resolution
  const workSize = Math.min(Math.max(sw, 512), 1024);
  const cellCanvas = document.createElement("canvas");
  cellCanvas.width = workSize;
  cellCanvas.height = workSize;
  const cellCtx = cellCanvas.getContext("2d", { willReadFrequently: true })!;
  cellCtx.drawImage(img, sx, sy, sw, sh, 0, 0, workSize, workSize);

  // Step 2: Optional flood-fill background removal
  let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  if (options.removeBackground) {
    const imgData = cellCtx.getImageData(0, 0, workSize, workSize);
    floodFillRemoveBackground(imgData, options.tolerance);
    cellCtx.putImageData(imgData, 0, 0);
    bounds = findAlphaBounds(imgData);
  }

  // Step 3: Adaptive trim + centered placement into square output canvas
  const outSize = targetSize > 0 ? targetSize : workSize;
  const scaledBorder = Math.round((options.whiteBorderPx / 512) * outSize);
  const padding = Math.round(outSize * 0.06) + scaledBorder;

  const centeredCanvas = document.createElement("canvas");
  centeredCanvas.width = outSize;
  centeredCanvas.height = outSize;
  const centeredCtx = centeredCanvas.getContext("2d")!;

  if (bounds) {
    const bw = bounds.maxX - bounds.minX + 1;
    const bh = bounds.maxY - bounds.minY + 1;
    const avail = Math.max(1, outSize - padding * 2);
    const scale = Math.min(avail / bw, avail / bh);
    const dw = Math.round(bw * scale);
    const dh = Math.round(bh * scale);
    const dx = Math.round((outSize - dw) / 2);
    const dy = Math.round((outSize - dh) / 2);

    centeredCtx.drawImage(
      cellCanvas,
      bounds.minX,
      bounds.minY,
      bw,
      bh,
      dx,
      dy,
      dw,
      dh
    );
  } else {
    const avail = Math.max(1, outSize - padding * 2);
    centeredCtx.drawImage(cellCanvas, 0, 0, workSize, workSize, padding, padding, avail, avail);
  }

  // Step 4: Optional die-cut white border
  if (options.removeBackground && scaledBorder > 0) {
    return applyDieCutWhiteBorder(centeredCanvas, scaledBorder);
  }

  return centeredCanvas;
}

/**
 * Generates preview thumbnails (384px) for all cells in the grid for fast interactive UI.
 */
export async function sliceStickerPreview(
  masterImageUrl: string,
  options: SliceOptions
): Promise<ProcessedSticker[]> {
  const img = await loadImage(masterImageUrl);
  const dims = options.gridSize === "4x4" ? 4 : 3;
  const cellW = img.naturalWidth / dims;
  const cellH = img.naturalHeight / dims;
  const results: ProcessedSticker[] = [];

  for (let i = 0; i < dims * dims; i++) {
    const row = Math.floor(i / dims);
    const col = i % dims;
    const canvas = processSingleCell(
      img,
      col * cellW,
      row * cellH,
      cellW,
      cellH,
      384,
      options
    );
    results.push({
      index: i,
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    });
  }

  return results;
}

function getExportTargetSize(preset: ExportPreset): number {
  if (preset === "wechat") return 240;
  if (preset === "telegram") return 512;
  return 1024;
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
  const cellW = img.naturalWidth / dims;
  const cellH = img.naturalHeight / dims;
  const targetSize = getExportTargetSize(preset);

  const zip = new JSZip();

  for (let i = 0; i < dims * dims; i++) {
    const row = Math.floor(i / dims);
    const col = i % dims;
    const canvas = processSingleCell(
      img,
      col * cellW,
      row * cellH,
      cellW,
      cellH,
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
  const dims = options.gridSize === "4x4" ? 4 : 3;
  const cellW = img.naturalWidth / dims;
  const cellH = img.naturalHeight / dims;
  const row = Math.floor(cellIndex / dims);
  const col = cellIndex % dims;

  const canvas = processSingleCell(
    img,
    col * cellW,
    row * cellH,
    cellW,
    cellH,
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
