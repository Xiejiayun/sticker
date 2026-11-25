import JSZip from "jszip";
import type { AnimationLoopMode, SpriteAlignMode } from "@/config/animations";
import type { GridSize } from "@/db/schema";
import { encodeAnimatedPng } from "./apng-encoder";
import { encodeAnimatedGif, type GifFrameInput } from "./gif-encoder";
import { getGridCellRect } from "./grid";
import {
  computeClipStabilization,
  computeFrameAlphaMetrics,
  computeRhythmFrameDelays,
  computeUniformPlacement,
  expandPlaybackSequence,
  normalizeLineApngTiming,
  type FrameAlphaMetrics,
} from "./sprite-math";
import { loadStickerImage, removeSolidBackgroundOnCanvas } from "./sticker-processor";

export type SpriteExportPlatformId = "wechat" | "line" | "discord" | "slack" | "hd-gif";

export interface SpriteExportPlatformSpec {
  id: SpriteExportPlatformId;
  nameZh: string;
  nameEn: string;
  width: number;
  height: number;
  format: "gif" | "apng";
  maxBytes: number;
  includeThumb120?: boolean;
  summaryZh: string;
  summaryEn: string;
}

export const SPRITE_EXPORT_PLATFORMS: Record<SpriteExportPlatformId, SpriteExportPlatformSpec> = {
  wechat: {
    id: "wechat",
    nameZh: "微信动态表情",
    nameEn: "WeChat Animated GIF",
    width: 240,
    height: 240,
    format: "gif",
    maxBytes: 500 * 1024,
    includeThumb120: true,
    summaryZh: "240×240 透明 GIF (≤500KB · 永久循环) + 120×120 PNG 缩略图",
    summaryEn: "240×240 transparent GIF (≤500KB, infinite loop) + 120×120 PNG thumb",
  },
  line: {
    id: "line",
    nameZh: "LINE 动态贴纸",
    nameEn: "LINE Animated APNG",
    width: 270,
    height: 270,
    format: "apng",
    maxBytes: 1024 * 1024,
    summaryZh: "270×270 全彩透明 APNG (5–20帧 · ≤4秒 · ≤1MB)",
    summaryEn: "270×270 full-color APNG (5–20 frames, ≤4s, ≤1MB)",
  },
  discord: {
    id: "discord",
    nameZh: "Discord 动态 Emoji",
    nameEn: "Discord Animated Emoji",
    width: 128,
    height: 128,
    format: "gif",
    maxBytes: 256 * 1024,
    summaryZh: "128×128 透明 GIF (≤256KB)",
    summaryEn: "128×128 transparent GIF (≤256KB)",
  },
  slack: {
    id: "slack",
    nameZh: "Slack 动态表情",
    nameEn: "Slack Animated Emoji",
    width: 128,
    height: 128,
    format: "gif",
    maxBytes: 127 * 1024,
    summaryZh: "128×128 透明 GIF (严格 <128KB)",
    summaryEn: "128×128 transparent GIF (strictly <128KB)",
  },
  "hd-gif": {
    id: "hd-gif",
    nameZh: "高清社交 GIF",
    nameEn: "HD Social GIF",
    width: 384,
    height: 384,
    format: "gif",
    maxBytes: 1500 * 1024,
    summaryZh: "384×384 高清透明 GIF（适合日常发聊与社媒展示）",
    summaryEn: "384×384 crisp transparent GIF for chat & social sharing",
  },
};

export interface PerFrameOverride {
  enabled?: boolean;
  offsetX?: number; // extra pixel shift in target space (-40..40)
  offsetY?: number;
  scale?: number; // 0.85..1.15
  delayMs?: number; // custom hold duration in ms (overrides fps)
}

export interface SpriteCaptionConfig {
  enabled: boolean;
  text: string;
  style: "bold-pop" | "bubble" | "neon-dark";
  position: "bottom" | "top";
}

export interface SpriteClipRenderOptions {
  gridSize: GridSize;
  cellIndices: number[];
  removeBackground: boolean;
  tolerance: number;
  whiteBorderPx: number;
  smartSeam: boolean;
  alignMode: SpriteAlignMode;
  fps: number;
  loopMode: AnimationLoopMode;
  holdClimax?: boolean;
  frameOverrides?: Record<number, PerFrameOverride>;
  caption?: SpriteCaptionConfig;
}

export interface RenderedSpriteFrame {
  frameIndex: number; // 0..N-1 inside the clip
  cellIndex: number; // 0..8 or 0..15 in master sheet
  dataUrl: string;
  enabled: boolean;
  delayMs: number;
  autoDx: number;
  autoDy: number;
}

export interface RenderedSpriteClipPreview {
  frames: RenderedSpriteFrame[];
  playbackSequence: number[];
  previewSize: number;
}

function estimateBg(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const samples = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
  let r = 0;
  let g = 0;
  let b = 0;
  let c = 0;
  for (const off of samples) {
    if (data[off + 3] < 200) continue;
    r += data[off];
    g += data[off + 1];
    b += data[off + 2];
    c++;
  }
  return c === 0 ? [255, 255, 255] : [Math.round(r / c), Math.round(g / c), Math.round(b / c)];
}

function computeSpriteSeams(
  img: HTMLImageElement,
  gridSize: GridSize
): { xBounds: number[]; yBounds: number[] } {
  const dims = gridSize === "4x4" ? 4 : 3;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const xBounds = Array.from({ length: dims + 1 }, (_, i) => Math.floor((i * w) / dims));
  const yBounds = Array.from({ length: dims + 1 }, (_, i) => Math.floor((i * h) / dims));

  const aw = Math.min(512, w);
  const ah = Math.min(512, h);
  if (aw < dims * 4 || ah < dims * 4) return { xBounds, yBounds };

  const probe = document.createElement("canvas");
  probe.width = aw;
  probe.height = ah;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { xBounds, yBounds };
  ctx.drawImage(img, 0, 0, aw, ah);
  const { data } = ctx.getImageData(0, 0, aw, ah);
  const [bgR, bgG, bgB] = estimateBg(data, aw, ah);

  const xWin = Math.max(2, Math.round(aw * 0.05));
  for (let c = 1; c < dims; c++) {
    const nom = Math.round((c * aw) / dims);
    let best = nom;
    let bestScore = Infinity;
    for (let ax = Math.max(1, nom - xWin); ax <= Math.min(aw - 2, nom + xWin); ax++) {
      let energy = 0;
      for (let ay = 0; ay < ah; ay++) {
        const o = (ay * aw + ax) * 4;
        if (data[o + 3] < 40) continue;
        const dist = Math.abs(data[o] - bgR) + Math.abs(data[o + 1] - bgG) + Math.abs(data[o + 2] - bgB);
        if (dist > 36) energy += dist;
      }
      const score = energy + Math.abs(ax - nom) * 1.5;
      if (score < bestScore) {
        bestScore = score;
        best = ax;
      }
    }
    xBounds[c] = Math.round((best / aw) * w);
  }

  const yWin = Math.max(2, Math.round(ah * 0.05));
  for (let r = 1; r < dims; r++) {
    const nom = Math.round((r * ah) / dims);
    let best = nom;
    let bestScore = Infinity;
    for (let ay = Math.max(1, nom - yWin); ay <= Math.min(ah - 2, nom + yWin); ay++) {
      let energy = 0;
      for (let ax = 0; ax < aw; ax++) {
        const o = (ay * aw + ax) * 4;
        if (data[o + 3] < 40) continue;
        const dist = Math.abs(data[o] - bgR) + Math.abs(data[o + 1] - bgG) + Math.abs(data[o + 2] - bgB);
        if (dist > 36) energy += dist;
      }
      const score = energy + Math.abs(ay - nom) * 1.5;
      if (score < bestScore) {
        bestScore = score;
        best = ay;
      }
    }
    yBounds[r] = Math.round((best / ah) * h);
  }

  probe.width = 0;
  probe.height = 0;
  return { xBounds, yBounds };
}

function applyWhiteBorderSimple(canvas: HTMLCanvasElement, radiusPx: number): HTMLCanvasElement {
  if (radiusPx <= 0) return canvas;
  const w = canvas.width;
  const h = canvas.height;
  const srcCtx = canvas.getContext("2d", { willReadFrequently: true })!;
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const outCtx = out.getContext("2d")!;
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  // Fast disk dilation for clean sticker outline (great for WeChat dark mode)
  const r = Math.max(1, Math.min(18, Math.round(radiusPx)));
  const rSq = (r + 0.4) * (r + 0.4);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = src[i * 4 + 3] >= 140 ? 1 : 0;
  }

  const offsets: Array<[number, number]> = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= rSq) offsets.push([dx, dy]);
    }
  }

  const dilated = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (!mask[row + x]) continue;
      // Only dilate boundary pixels (huge speedup!)
      const isEdge =
        x === 0 ||
        x === w - 1 ||
        y === 0 ||
        y === h - 1 ||
        !mask[row + x - 1] ||
        !mask[row + x + 1] ||
        !mask[row + x - w] ||
        !mask[row + x + w];
      if (!isEdge) {
        dilated[row + x] = 1;
        continue;
      }
      for (let k = 0; k < offsets.length; k++) {
        const nx = x + offsets[k][0];
        const ny = y + offsets[k][1];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          dilated[ny * w + nx] = 1;
        }
      }
    }
  }

  for (let i = 0; i < w * h; i++) {
    if (dilated[i]) {
      const o = i * 4;
      dst[o] = 255;
      dst[o + 1] = 255;
      dst[o + 2] = 255;
      dst[o + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  outCtx.drawImage(canvas, 0, 0);
  return out;
}

function drawStaticCaptionOnCanvas(
  canvas: HTMLCanvasElement,
  caption: SpriteCaptionConfig | undefined
): void {
  if (!caption?.enabled) return;
  const text = caption.text.trim();
  if (!text) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const maxWidth = w * 0.86;
  let fontSize = Math.max(13, Math.round(Math.min(w, h) * 0.145));
  const fontFamily = '"Plus Jakarta Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  while (fontSize > 11) {
    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 2;
  }

  const metrics = ctx.measureText(text);
  const textW = Math.min(maxWidth, metrics.width);
  const cx = Math.round(w / 2);
  const cy =
    caption.position === "top"
      ? Math.round(Math.max(fontSize * 0.85, h * 0.115))
      : Math.round(Math.min(h - fontSize * 0.85, h * 0.885));

  if (caption.style === "bubble") {
    const padX = Math.max(8, Math.round(fontSize * 0.52));
    const padY = Math.max(4, Math.round(fontSize * 0.28));
    const boxW = textW + padX * 2;
    const boxH = fontSize + padY * 2;
    const bx = Math.round(cx - boxW / 2);
    const by = Math.round(cy - boxH / 2);
    const r = Math.min(Math.round(boxH / 2), boxW / 2);

    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + boxW - r, by);
    ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
    ctx.lineTo(bx + boxW, by + boxH - r);
    ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
    ctx.lineTo(bx + r, by + boxH);
    ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();

    ctx.fillStyle = "#FFFDF7";
    ctx.fill();
    ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.11));
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
    ctx.fillStyle = caption.style === "neon-dark" ? "#FFF3C4" : "#FFFFFF";
    ctx.fillText(text, cx, cy, maxWidth);
  }
  ctx.restore();
}

interface StabilizedClipCanvases {
  canvases: HTMLCanvasElement[];
  autoTransforms: Array<{ dx: number; dy: number }>;
  delaysMs: number[];
  enabledMask: boolean[];
}

async function buildStabilizedClipCanvases(
  masterImageUrl: string,
  options: SpriteClipRenderOptions,
  targetW: number,
  targetH: number
): Promise<StabilizedClipCanvases> {
  const img = await loadStickerImage(masterImageUrl);
  const dims = options.gridSize === "4x4" ? 4 : 3;
  const seams = options.smartSeam ? computeSpriteSeams(img, options.gridSize) : null;

  // Step 1: Extract raw cells and remove background per frame
  const rawCanvases: HTMLCanvasElement[] = [];
  const metricsList: FrameAlphaMetrics[] = [];

  for (const cellIndex of options.cellIndices) {
    const col = cellIndex % dims;
    const row = Math.floor(cellIndex / dims);
    const rect = seams
      ? {
          x: seams.xBounds[col],
          y: seams.yBounds[row],
          width: Math.max(1, seams.xBounds[col + 1] - seams.xBounds[col]),
          height: Math.max(1, seams.yBounds[row + 1] - seams.yBounds[row]),
        }
      : getGridCellRect(img.naturalWidth, img.naturalHeight, options.gridSize, cellIndex);

    const c = document.createElement("canvas");
    c.width = rect.width;
    c.height = rect.height;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

    if (options.removeBackground) {
      removeSolidBackgroundOnCanvas(c, options.tolerance);
    }

    const imgData = ctx.getImageData(0, 0, c.width, c.height);
    metricsList.push(computeFrameAlphaMetrics(imgData.data, c.width, c.height));
    rawCanvases.push(c);
  }

  // Step 2: Cross-frame stabilization & uniform union scale
  const enabledMask = options.cellIndices.map(
    (_, fIdx) => options.frameOverrides?.[fIdx]?.enabled !== false
  );
  const plan = computeClipStabilization(metricsList, options.alignMode, enabledMask);

  const minOut = Math.min(targetW, targetH);
  const scaledBorder = options.removeBackground
    ? Math.round((options.whiteBorderPx / 512) * minOut)
    : 0;
  const padPx = Math.round(minOut * 0.06) + scaledBorder;
  const placement = computeUniformPlacement(plan.unionBounds, targetW, targetH, padPx);

  const explicitDelays: Record<number, number | undefined> = {};
  if (options.frameOverrides) {
    for (const [k, v] of Object.entries(options.frameOverrides)) {
      if (typeof v?.delayMs === "number") explicitDelays[Number(k)] = v.delayMs;
    }
  }
  const delaysMs = computeRhythmFrameDelays(
    rawCanvases.length,
    options.fps,
    Boolean(options.holdClimax),
    explicitDelays
  );
  const outCanvases: HTMLCanvasElement[] = [];

  for (let fIdx = 0; fIdx < rawCanvases.length; fIdx++) {
    const raw = rawCanvases[fIdx];
    const autoT = plan.transforms[fIdx];
    const ov = options.frameOverrides?.[fIdx];
    const userScale = Math.max(0.85, Math.min(1.15, ov?.scale ?? 1));
    const userDx = Math.max(-48, Math.min(48, ov?.offsetX ?? 0)) * (targetW / 240);
    const userDy = Math.max(-48, Math.min(48, ov?.offsetY ?? 0)) * (targetH / 240);

    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = targetW;
    frameCanvas.height = targetH;
    const ctx = frameCanvas.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (!options.removeBackground) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, targetW, targetH);
    }

    const dstX = placement.offsetX + autoT.dx * placement.scale;
    const dstY = placement.offsetY + autoT.dy * placement.scale;
    const dstW = raw.width * placement.scale;
    const dstH = raw.height * placement.scale;

    ctx.save();
    ctx.translate(targetW / 2 + userDx, targetH / 2 + userDy);
    if (userScale !== 1) ctx.scale(userScale, userScale);
    ctx.translate(-targetW / 2, -targetH / 2);
    ctx.drawImage(raw, 0, 0, raw.width, raw.height, dstX, dstY, dstW, dstH);
    ctx.restore();

    raw.width = 0;
    raw.height = 0;

    let finalCanvas = frameCanvas;
    if (scaledBorder > 0) {
      const bordered = applyWhiteBorderSimple(frameCanvas, scaledBorder);
      frameCanvas.width = 0;
      frameCanvas.height = 0;
      finalCanvas = bordered;
    }

    // Draw crisp static caption on top (zero flicker across frames!)
    drawStaticCaptionOnCanvas(finalCanvas, options.caption);
    outCanvases.push(finalCanvas);
  }

  return {
    canvases: outCanvases,
    autoTransforms: plan.transforms,
    delaysMs,
    enabledMask,
  };
}

/**
 * Renders stabilized preview frames for interactive playback & Onion-Skin inspection.
 */
export async function renderSpriteClipPreview(
  masterImageUrl: string,
  options: SpriteClipRenderOptions,
  previewSize = 280
): Promise<RenderedSpriteClipPreview> {
  const built = await buildStabilizedClipCanvases(
    masterImageUrl,
    options,
    previewSize,
    previewSize
  );

  const frames: RenderedSpriteFrame[] = built.canvases.map((canvas, fIdx) => {
    const dataUrl = canvas.toDataURL("image/png");
    canvas.width = 0;
    canvas.height = 0;
    return {
      frameIndex: fIdx,
      cellIndex: options.cellIndices[fIdx],
      dataUrl,
      enabled: built.enabledMask[fIdx],
      delayMs: built.delaysMs[fIdx],
      autoDx: built.autoTransforms[fIdx].dx,
      autoDy: built.autoTransforms[fIdx].dy,
    };
  });

  const playbackSequence = expandPlaybackSequence(
    frames.length,
    options.loopMode,
    built.enabledMask
  );

  return {
    frames,
    playbackSequence,
    previewSize,
  };
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG encoding failed"))),
      "image/png"
    );
  });
}

export interface ExportedSpriteAnimation {
  blob: Blob;
  ext: "gif" | "png";
  mimeType: "image/gif" | "image/png";
  width: number;
  height: number;
  frameCount: number;
  bytes: number;
  withinBudget: boolean;
  thumbnailBlob?: Blob; // 120x120 PNG thumbnail for WeChat
}

/**
 * Exports a stabilized animated sticker in the target platform format (GIF or APNG),
 * automatically fitting within platform byte budgets and generating companion 120x120 thumbnails for WeChat.
 */
export async function exportSpriteClipForPlatform(
  masterImageUrl: string,
  options: SpriteClipRenderOptions,
  platformId: SpriteExportPlatformId,
  coverFrameIndex = 0
): Promise<ExportedSpriteAnimation> {
  const spec = SPRITE_EXPORT_PLATFORMS[platformId];
  const built = await buildStabilizedClipCanvases(
    masterImageUrl,
    options,
    spec.width,
    spec.height
  );

  const sequence = expandPlaybackSequence(
    built.canvases.length,
    options.loopMode,
    built.enabledMask
  );

  // Extract RGBA buffers once for all frames in clip
  const rgbaByFrame = built.canvases.map((canvas) => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    return new Uint8ClampedArray(ctx.getImageData(0, 0, spec.width, spec.height).data);
  });

  // Optional 120x120 WeChat static PNG thumbnail from chosen cover frame
  let thumbnailBlob: Blob | undefined;
  if (spec.includeThumb120) {
    const safeCoverIdx =
      coverFrameIndex >= 0 && coverFrameIndex < built.canvases.length
        ? coverFrameIndex
        : sequence[0] ?? 0;
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = 120;
    thumbCanvas.height = 120;
    const tCtx = thumbCanvas.getContext("2d")!;
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = "high";
    tCtx.drawImage(built.canvases[safeCoverIdx], 0, 0, 120, 120);
    thumbnailBlob = await canvasToPngBlob(thumbCanvas);
    thumbCanvas.width = 0;
    thumbCanvas.height = 0;
  }

  // Release canvases promptly
  for (const c of built.canvases) {
    c.width = 0;
    c.height = 0;
  }

  if (spec.format === "apng") {
    const linePlan = normalizeLineApngTiming(sequence, built.delaysMs);
    const apngFrames = linePlan.sequence.map((fIdx, pos) => ({
      rgba: rgbaByFrame[fIdx],
      delayMs: linePlan.delaysMs[pos],
    }));

    const bytes = await encodeAnimatedPng(spec.width, spec.height, apngFrames, {
      numPlays: linePlan.numPlays,
    });
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "image/png" });
    return {
      blob,
      ext: "png",
      mimeType: "image/png",
      width: spec.width,
      height: spec.height,
      frameCount: apngFrames.length,
      bytes: blob.size,
      withinBudget: blob.size <= spec.maxBytes,
      thumbnailBlob,
    };
  }

  // GIF89a with adaptive color-table compression to respect WeChat 500KB / Discord 256KB / Slack 128KB
  const makeGifFrames = (seq: number[]): GifFrameInput[] =>
    seq.map((fIdx) => ({
      rgba: rgbaByFrame[fIdx],
      delayCs: Math.max(2, Math.round((built.delaysMs[fIdx] ?? 100) / 10)),
    }));

  const gifFrames = makeGifFrames(sequence);
  let bestBytes = encodeAnimatedGif(spec.width, spec.height, gifFrames, { maxColors: 255 });

  if (bestBytes.byteLength > spec.maxBytes) {
    for (const maxColors of [160, 112, 80, 56, 40, 28]) {
      const candidate = encodeAnimatedGif(spec.width, spec.height, gifFrames, { maxColors });
      if (candidate.byteLength < bestBytes.byteLength) bestBytes = candidate;
      if (candidate.byteLength <= spec.maxBytes) break;
    }
  }

  // Last-resort stride reduction if still above strict budget (e.g. Slack 128KB with 16 pingpong frames)
  if (bestBytes.byteLength > spec.maxBytes && sequence.length > 6) {
    const decimated = sequence.filter((_, idx) => idx % 2 === 0);
    const decimatedFrames = decimated.map((fIdx) => ({
      rgba: rgbaByFrame[fIdx],
      delayCs: Math.max(4, Math.round(((built.delaysMs[fIdx] ?? 100) * 1.8) / 10)),
    }));
    const candidate = encodeAnimatedGif(spec.width, spec.height, decimatedFrames, {
      maxColors: 64,
    });
    if (candidate.byteLength < bestBytes.byteLength) {
      bestBytes = candidate;
    }
  }

  const blob = new Blob([bestBytes.buffer as ArrayBuffer], { type: "image/gif" });
  return {
    blob,
    ext: "gif",
    mimeType: "image/gif",
    width: spec.width,
    height: spec.height,
    frameCount: gifFrames.length,
    bytes: blob.size,
    withinBudget: blob.size <= spec.maxBytes,
    thumbnailBlob,
  };
}

/**
 * Exports all animated clips in a sprite pack (1 clip for 3x3, 4 clips for 4x4 quad) as a structured ZIP.
 */
export async function exportAllSpriteClipsZip(
  masterImageUrl: string,
  clips: Array<{
    name: string;
    masterImageUrl?: string;
    options: SpriteClipRenderOptions;
    coverFrameIndex?: number;
  }>,
  platformId: SpriteExportPlatformId
): Promise<{ blob: Blob; summary: Array<{ name: string; bytes: number; frameCount: number; withinBudget: boolean }> }> {
  const zip = new JSZip();
  const summary: Array<{ name: string; bytes: number; frameCount: number; withinBudget: boolean }> = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const sourceUrl = clip.masterImageUrl || masterImageUrl;
    const exported = await exportSpriteClipForPlatform(
      sourceUrl,
      clip.options,
      platformId,
      clip.coverFrameIndex ?? 0
    );
    const num = String(i + 1).padStart(2, "0");
    const safeName = clip.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "").slice(0, 12);
    const baseName = `animated_${num}${safeName ? `_${safeName}` : ""}`;

    if (platformId === "wechat") {
      zip.file(`01_主图_240x240_GIF/${baseName}.gif`, exported.blob);
      if (exported.thumbnailBlob) {
        zip.file(`02_缩略图_120x120_PNG/${baseName}_thumb.png`, exported.thumbnailBlob);
      }
    } else if (platformId === "line") {
      zip.file(`LINE_APNG_270x270/${baseName}.png`, exported.blob);
    } else {
      zip.file(`${baseName}.${exported.ext}`, exported.blob);
    }

    summary.push({
      name: `${baseName}.${exported.ext}`,
      bytes: exported.bytes,
      frameCount: exported.frameCount,
      withinBudget: exported.withinBudget,
    });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, summary };
}
