import JSZip from "jszip";
import type { GridSize } from "@/db/schema";
import { renderAnimatedGifWithinBudget, type MotionPreset } from "./animator";
import {
  STORE_PLATFORM_SPECS,
  type DiscordMode,
  type StorePlatformId,
} from "./platform-specs";
import {
  findAlphaBounds,
  loadStickerImage,
  removeSolidBackgroundOnCanvas,
  renderSingleStickerCanvas,
  type SliceOptions,
} from "./sticker-processor";

export type BannerTemplateId = "sunny-pop" | "mint-breeze" | "lavender-dream" | "warm-stage";

export const BANNER_TEMPLATES: Array<{
  id: BannerTemplateId;
  zh: string;
  en: string;
  swatch: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
}> = [
  {
    id: "sunny-pop",
    zh: "暖阳波普",
    en: "Sunny Pop",
    swatch: "#FFD166",
    bgStart: "#FFF3C4",
    bgEnd: "#FFD6A5",
    accent: "#FF8FAB",
  },
  {
    id: "mint-breeze",
    zh: "薄荷微风",
    en: "Mint Breeze",
    swatch: "#2EC4B6",
    bgStart: "#D4FAF4",
    bgEnd: "#B8E1FF",
    accent: "#FFF3C4",
  },
  {
    id: "lavender-dream",
    zh: "甜酷粉紫",
    en: "Sweet Berry",
    swatch: "#FF8FAB",
    bgStart: "#FFE1EA",
    bgEnd: "#E6DCFF",
    accent: "#FFD166",
  },
  {
    id: "warm-stage",
    zh: "奶霜舞台",
    en: "Cream Stage",
    swatch: "#FB5607",
    bgStart: "#FFF8EB",
    bgEnd: "#FFE2D4",
    accent: "#8ECAE6",
  },
];

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: "image/png" | "image/jpeg" | "image/webp",
  quality?: number
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(`${mimeType} encoding failed`))),
      mimeType,
      quality
    );
  });
}

export async function encodePngWithinBudget(
  canvas: HTMLCanvasElement,
  maxBytes: number
): Promise<Blob> {
  const original = await canvasToBlob(canvas, "image/png");
  if (original.size <= maxBytes) return original;

  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return original;
  const srcData = ctx.getImageData(0, 0, w, h).data;

  const scratch = document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  const sCtx = scratch.getContext("2d")!;

  let best = original;
  for (const levels of [64, 32, 24, 16, 12, 8]) {
    const out = sCtx.createImageData(w, h);
    const dst = out.data;
    const step = 255 / (levels - 1);
    for (let i = 0; i < srcData.length; i += 4) {
      const a = srcData[i + 3];
      if (a < 24) {
        dst[i] = 0;
        dst[i + 1] = 0;
        dst[i + 2] = 0;
        dst[i + 3] = 0;
      } else {
        dst[i] = Math.round(Math.round(srcData[i] / step) * step);
        dst[i + 1] = Math.round(Math.round(srcData[i + 1] / step) * step);
        dst[i + 2] = Math.round(Math.round(srcData[i + 2] / step) * step);
        dst[i + 3] = a > 235 ? 255 : Math.round(a / 32) * 32;
      }
    }
    sCtx.putImageData(out, 0, 0);
    const candidate = await canvasToBlob(scratch, "image/png");
    if (candidate.size < best.size) best = candidate;
    if (candidate.size <= maxBytes) {
      scratch.width = 0;
      scratch.height = 0;
      return candidate;
    }
  }

  scratch.width = 0;
  scratch.height = 0;
  return best;
}

export async function encodeJpegWithinBudget(
  canvas: HTMLCanvasElement,
  maxBytes: number
): Promise<Blob> {
  const flat = document.createElement("canvas");
  flat.width = canvas.width;
  flat.height = canvas.height;
  const ctx = flat.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, flat.width, flat.height);
  ctx.drawImage(canvas, 0, 0);

  let best: Blob | null = null;
  for (const quality of [0.92, 0.85, 0.78, 0.7, 0.6, 0.5, 0.42]) {
    const candidate = await canvasToBlob(flat, "image/jpeg", quality);
    if (!best || candidate.size < best.size) best = candidate;
    if (candidate.size <= maxBytes) {
      flat.width = 0;
      flat.height = 0;
      return candidate;
    }
  }

  flat.width = 0;
  flat.height = 0;
  return best!;
}

export async function encodeWebpWithinBudget(
  canvas: HTMLCanvasElement,
  maxBytes: number
): Promise<Blob> {
  let best: Blob | null = null;
  for (const quality of [0.92, 0.82, 0.72, 0.62, 0.52, 0.42, 0.34]) {
    const candidate = await canvasToBlob(canvas, "image/webp", quality);
    if (!best || candidate.size < best.size) best = candidate;
    if (candidate.size <= maxBytes) return candidate;
  }
  return best!;
}

function fitCutoutOntoSquareCanvas(img: HTMLImageElement, targetSize: number): HTMLCanvasElement {
  const workSide = Math.min(768, Math.max(targetSize, img.naturalWidth, img.naturalHeight));
  const work = document.createElement("canvas");
  work.width = workSide;
  work.height = workSide;
  const wCtx = work.getContext("2d", { willReadFrequently: true })!;
  const scale = Math.min(workSide / img.naturalWidth, workSide / img.naturalHeight);
  const dw = Math.round(img.naturalWidth * scale);
  const dh = Math.round(img.naturalHeight * scale);
  wCtx.imageSmoothingQuality = "high";
  wCtx.drawImage(img, Math.round((workSide - dw) / 2), Math.round((workSide - dh) / 2), dw, dh);
  removeSolidBackgroundOnCanvas(work, 30);

  const imgData = wCtx.getImageData(0, 0, workSide, workSide);
  const bounds = findAlphaBounds(imgData);

  const out = document.createElement("canvas");
  out.width = targetSize;
  out.height = targetSize;
  const oCtx = out.getContext("2d")!;
  oCtx.imageSmoothingQuality = "high";
  const pad = Math.round(targetSize * 0.06);
  const avail = Math.max(1, targetSize - pad * 2);

  if (bounds) {
    const bw = bounds.maxX - bounds.minX + 1;
    const bh = bounds.maxY - bounds.minY + 1;
    const fit = Math.min(avail / bw, avail / bh);
    const rw = Math.round(bw * fit);
    const rh = Math.round(bh * fit);
    oCtx.drawImage(
      work,
      bounds.minX,
      bounds.minY,
      bw,
      bh,
      Math.round((targetSize - rw) / 2),
      Math.round((targetSize - rh) / 2),
      rw,
      rh
    );
  } else {
    oCtx.drawImage(work, 0, 0, workSide, workSide, pad, pad, avail, avail);
  }

  work.width = 0;
  work.height = 0;
  return out;
}

export async function renderStoreCoverCanvas(params: {
  masterImageUrl: string;
  sliceOptions: SliceOptions;
  coverCellIndex: number;
  aiCoverUrl?: string | null;
  size?: number;
}): Promise<HTMLCanvasElement> {
  const size = params.size ?? 240;
  if (params.aiCoverUrl) {
    const img = await loadStickerImage(params.aiCoverUrl);
    return fitCutoutOntoSquareCanvas(img, size);
  }
  return renderSingleStickerCanvas(
    params.masterImageUrl,
    params.coverCellIndex,
    { ...params.sliceOptions, removeBackground: true, captionOverlay: undefined },
    size
  );
}

export async function renderStoreIconCanvas(params: {
  masterImageUrl: string;
  sliceOptions: SliceOptions;
  iconCellIndex: number;
  aiIconUrl?: string | null;
  width: number;
  height: number;
  headCrop?: boolean;
  focusX?: number; // -0.3 .. 0.3
  focusY?: number; // -0.3 .. 0.3
  zoom?: number;   // 0.8 .. 2.2
}): Promise<HTMLCanvasElement> {
  const sourceCanvas = params.aiIconUrl
    ? fitCutoutOntoSquareCanvas(await loadStickerImage(params.aiIconUrl), 256)
    : await renderSingleStickerCanvas(
        params.masterImageUrl,
        params.iconCellIndex,
        { ...params.sliceOptions, removeBackground: true, captionOverlay: undefined },
        256
      );

  const sCtx = sourceCanvas.getContext("2d", { willReadFrequently: true })!;
  const imgData = sCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const bounds = findAlphaBounds(imgData);

  const out = document.createElement("canvas");
  out.width = params.width;
  out.height = params.height;
  const oCtx = out.getContext("2d")!;
  oCtx.imageSmoothingQuality = "high";

  if (!bounds) {
    const fit = Math.min(params.width / sourceCanvas.width, params.height / sourceCanvas.height);
    const dw = Math.round(sourceCanvas.width * fit);
    const dh = Math.round(sourceCanvas.height * fit);
    oCtx.drawImage(
      sourceCanvas,
      Math.round((params.width - dw) / 2),
      Math.round((params.height - dh) / 2),
      dw,
      dh
    );
    sourceCanvas.width = 0;
    sourceCanvas.height = 0;
    return out;
  }

  const bw = bounds.maxX - bounds.minX + 1;
  const bh = bounds.maxY - bounds.minY + 1;
  const headCrop = params.headCrop ?? true;
  const cropH = headCrop ? Math.max(8, bh * 0.62) : bh;
  const cropW = bw;
  const zoom = Math.max(0.8, Math.min(2.2, params.zoom ?? (headCrop ? 1.05 : 1)));
  const fx = params.focusX ?? 0;
  const fy = params.focusY ?? 0;

  const pad = Math.max(2, Math.round(Math.min(params.width, params.height) * 0.04));
  const availW = Math.max(1, params.width - pad * 2);
  const availH = Math.max(1, params.height - pad * 2);
  const baseScale = Math.min(availW / cropW, availH / cropH) * zoom;
  const dw = Math.round(bw * baseScale);
  const dh = Math.round(bh * baseScale);

  const centerTargetX = params.width / 2 + fx * params.width;
  const cropAnchorY = headCrop ? cropH * 0.5 : bh * 0.5;
  const centerTargetY = params.height / 2 + fy * params.height;
  const dx = Math.round(centerTargetX - (bw * baseScale) / 2);
  const dy = Math.round(centerTargetY - cropAnchorY * baseScale);

  oCtx.drawImage(sourceCanvas, bounds.minX, bounds.minY, bw, bh, dx, dy, dw, dh);
  sourceCanvas.width = 0;
  sourceCanvas.height = 0;
  return out;
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.2, r, 0);
  ctx.quadraticCurveTo(r * 0.2, r * 0.2, 0, r);
  ctx.quadraticCurveTo(-r * 0.2, r * 0.2, -r, 0);
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.2, 0, -r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export async function renderTemplateBannerCanvas(params: {
  masterImageUrl: string;
  sliceOptions: SliceOptions;
  cellIndices: [number, number, number];
  templateId: BannerTemplateId;
  width?: number;
  height?: number;
}): Promise<HTMLCanvasElement> {
  const width = params.width ?? 750;
  const height = params.height ?? 400;
  const tpl = BANNER_TEMPLATES.find((t) => t.id === params.templateId) ?? BANNER_TEMPLATES[0];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Rich contrasting backdrop with zero text (WeChat compliant)
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, tpl.bgStart);
  grad.addColorStop(1, tpl.bgEnd);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Soft decorative geometric backdrop elements
  ctx.fillStyle = `${tpl.accent}55`;
  ctx.beginPath();
  ctx.arc(width * 0.14, height * 0.22, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.87, height * 0.24, 52, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.96, width * 0.56, height * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  drawSparkle(ctx, width * 0.26, height * 0.2, 16, "#FFFFFF");
  drawSparkle(ctx, width * 0.74, height * 0.18, 14, "#FFFFFF");
  drawSparkle(ctx, width * 0.5, height * 0.12, 11, tpl.swatch);

  const cleanOpts: SliceOptions = {
    ...params.sliceOptions,
    removeBackground: true,
    captionOverlay: undefined,
  };

  const placements: Array<{ idx: number; cx: number; cy: number; box: number; rot: number }> = [
    { idx: params.cellIndices[0], cx: width * 0.24, cy: height * 0.56, box: 215, rot: -0.09 },
    { idx: params.cellIndices[2], cx: width * 0.76, cy: height * 0.56, box: 215, rot: 0.09 },
    { idx: params.cellIndices[1], cx: width * 0.5, cy: height * 0.5, box: 270, rot: 0 },
  ];

  for (const p of placements) {
    const stickerCanvas = await renderSingleStickerCanvas(
      params.masterImageUrl,
      p.idx,
      cleanOpts,
      320
    );
    ctx.save();
    ctx.translate(p.cx, p.cy);
    ctx.rotate(p.rot);
    ctx.shadowColor = "rgba(30, 27, 46, 0.12)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.drawImage(stickerCanvas, -p.box / 2, -p.box / 2, p.box, p.box);
    ctx.restore();
    stickerCanvas.width = 0;
    stickerCanvas.height = 0;
  }

  return canvas;
}

export async function renderAiBannerCanvas(params: {
  aiBannerUrl: string;
  width?: number;
  height?: number;
}): Promise<HTMLCanvasElement> {
  const width = params.width ?? 750;
  const height = params.height ?? 400;
  const img = await loadStickerImage(params.aiBannerUrl);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";

  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const dw = Math.round(img.naturalWidth * scale);
  const dh = Math.round(img.naturalHeight * scale);
  ctx.drawImage(img, Math.round((width - dw) / 2), Math.round((height - dh) / 2), dw, dh);
  return canvas;
}

export interface StoreExportResult {
  blob: Blob;
  filename: string;
  fileCount: number;
  maxFileBytes: number;
  allWithinLimits: boolean;
}

function buildReadme(
  platform: StorePlatformId,
  stickerCount: number,
  animated: boolean,
  discordMode: DiscordMode
): string {
  const spec = STORE_PLATFORM_SPECS[platform];
  if (platform === "wechat") {
    return [
      "=== 微信表情开放平台 (sticker.weixin.qq.com) 投稿文件对照指南 ===",
      "",
      `1. 01_表情主图_240x240/ : ${stickerCount} 张 ${animated ? "GIF (永久循环，≤100KB)" : "PNG (透明底，≤100KB)"}，对应微信后台「表情主图」`,
      `2. 02_表情缩略图_120x120/ : ${stickerCount} 张 PNG (120×120 透明底，≤50KB)，与主图 01~${String(stickerCount).padStart(2, "0")} 一一对应`,
      "3. 03_表情封面_240x240.png : 透明底半身/全身封面图 (240×240，≤80KB)",
      "4. 04_聊天页图标_50x50.png : 透明底正面图标 (50×50，≤30KB)",
      "5. 05_详情页横幅_750x400.jpg : 详情页横幅 (750×400 无文字，≤80KB)",
      "",
      "注意：微信表情专辑要求整套为 16 或 24 张；如当前为 9 张（3×3），可用于「表情单品」投稿。",
    ].join("\n");
  }
  if (platform === "line") {
    return [
      "=== LINE Creators Market Submission Guide ===",
      `1. stickers/ : ${stickerCount} transparent PNGs (370×320 max, even pixels, ≤1MB). LINE accepts sets of 8, 16, 24, 32, or 40.`,
      "2. main_240x240.png : Main store image (240×240 transparent PNG).",
      "3. tab_96x74.png : Chat room tab icon (96×74 transparent PNG).",
    ].join("\n");
  }
  if (platform === "whatsapp") {
    return [
      "=== WhatsApp Sticker Pack Guide ===",
      `1. stickers/ : ${stickerCount} transparent WebP files (512×512, ≤100KB each).`,
      "2. tray_icon_96x96.png : Pack tray icon (96×96 transparent PNG, ≤50KB).",
    ].join("\n");
  }
  if (platform === "telegram") {
    return [
      "=== Telegram Stickers (@Stickers Bot) Guide ===",
      `1. stickers/ : ${stickerCount} transparent PNG files (512×512, ≤512KB).`,
      "2. pack_icon_100x100.png : Optional pack icon (100×100 transparent PNG).",
    ].join("\n");
  }
  return [
    `=== ${spec.nameEn} Export Guide ===`,
    platform === "discord" && discordMode === "sticker"
      ? `Server Stickers: 320×320 ${animated ? "GIF" : "PNG"} (≤512KB)`
      : `Custom Emoji: 128×128 ${animated ? "GIF" : "PNG"} (≤${Math.round(spec.stickerMaxBytes / 1024)}KB)`,
  ].join("\n");
}

export async function exportStoreSubmissionZip(params: {
  packId: string;
  masterImageUrl: string;
  gridSize: GridSize;
  sliceOptions: SliceOptions;
  platform: StorePlatformId;
  discordMode?: DiscordMode;
  motionPreset: MotionPreset;
  coverCellIndex: number;
  iconCellIndex: number;
  iconHeadCrop: boolean;
  iconFocusX: number;
  iconFocusY: number;
  iconZoom: number;
  bannerCells: [number, number, number];
  bannerTemplateId: BannerTemplateId;
  useAiCover: boolean;
  useAiIcon: boolean;
  useAiBanner: boolean;
  aiCoverUrl?: string | null;
  aiIconUrl?: string | null;
  aiBannerUrl?: string | null;
}): Promise<StoreExportResult> {
  const spec = STORE_PLATFORM_SPECS[params.platform];
  const dims = params.gridSize === "4x4" ? 4 : 3;
  const count = dims * dims;
  const discordMode = params.discordMode ?? "emoji";
  const animated = params.motionPreset !== "none" && spec.animatedFormat === "gif";
  const stickerW =
    params.platform === "discord" && discordMode === "sticker" ? 320 : spec.stickerWidth;
  const stickerH =
    params.platform === "discord" && discordMode === "sticker" ? 320 : spec.stickerHeight;
  const stickerMaxBytes =
    params.platform === "discord" && discordMode === "sticker"
      ? 512 * 1024
      : animated && spec.animatedMaxBytes
        ? spec.animatedMaxBytes
        : spec.stickerMaxBytes;

  const zip = new JSZip();
  let fileCount = 0;
  let maxFileBytes = 0;
  let allWithinLimits = true;

  const addBlob = (path: string, blob: Blob, limitBytes: number) => {
    zip.file(path, blob);
    fileCount++;
    if (blob.size > maxFileBytes) maxFileBytes = blob.size;
    if (blob.size > limitBytes) allWithinLimits = false;
  };

  const mainFolder = params.platform === "wechat" ? "01_表情主图_240x240" : "stickers";

  for (let i = 0; i < count; i++) {
    const num = String(i + 1).padStart(2, "0");
    const cellCanvas = await renderSingleStickerCanvas(
      params.masterImageUrl,
      i,
      params.sliceOptions,
      { width: stickerW, height: stickerH }
    );

    if (animated) {
      const gifBlob = renderAnimatedGifWithinBudget(cellCanvas, params.motionPreset, {
        size: stickerW,
        maxBytes: stickerMaxBytes,
      });
      addBlob(`${mainFolder}/${num}.gif`, gifBlob, stickerMaxBytes);
    } else if (spec.stickerFormat === "webp") {
      const webpBlob = await encodeWebpWithinBudget(cellCanvas, stickerMaxBytes);
      addBlob(`${mainFolder}/${num}.webp`, webpBlob, stickerMaxBytes);
    } else {
      const pngBlob = await encodePngWithinBudget(cellCanvas, stickerMaxBytes);
      addBlob(`${mainFolder}/${num}.png`, pngBlob, stickerMaxBytes);
    }
    cellCanvas.width = 0;
    cellCanvas.height = 0;

    if (spec.thumbnails) {
      const thumbCanvas = await renderSingleStickerCanvas(
        params.masterImageUrl,
        i,
        { ...params.sliceOptions, captionOverlay: undefined },
        { width: spec.thumbnails.width, height: spec.thumbnails.height }
      );
      const thumbBlob = await encodePngWithinBudget(thumbCanvas, spec.thumbnails.maxBytes);
      thumbCanvas.width = 0;
      thumbCanvas.height = 0;
      addBlob(`02_表情缩略图_120x120/${num}.png`, thumbBlob, spec.thumbnails.maxBytes);
    }
  }

  if (spec.cover) {
    const coverCanvas = await renderStoreCoverCanvas({
      masterImageUrl: params.masterImageUrl,
      sliceOptions: params.sliceOptions,
      coverCellIndex: params.coverCellIndex,
      aiCoverUrl: params.useAiCover ? params.aiCoverUrl : null,
      size: spec.cover.width,
    });
    const coverBlob = await encodePngWithinBudget(coverCanvas, spec.cover.maxBytes);
    coverCanvas.width = 0;
    coverCanvas.height = 0;
    const coverName =
      params.platform === "wechat" ? "03_表情封面_240x240.png" : "main_240x240.png";
    addBlob(coverName, coverBlob, spec.cover.maxBytes);
  }

  if (spec.icon) {
    const iconCanvas = await renderStoreIconCanvas({
      masterImageUrl: params.masterImageUrl,
      sliceOptions: params.sliceOptions,
      iconCellIndex: params.iconCellIndex,
      aiIconUrl: params.useAiIcon ? params.aiIconUrl : null,
      width: spec.icon.width,
      height: spec.icon.height,
      headCrop: params.iconHeadCrop,
      focusX: params.iconFocusX,
      focusY: params.iconFocusY,
      zoom: params.iconZoom,
    });
    const iconBlob = await encodePngWithinBudget(iconCanvas, spec.icon.maxBytes);
    iconCanvas.width = 0;
    iconCanvas.height = 0;
    const iconName =
      params.platform === "wechat"
        ? "04_聊天页图标_50x50.png"
        : params.platform === "line"
          ? "tab_96x74.png"
          : params.platform === "whatsapp"
            ? "tray_icon_96x96.png"
            : "pack_icon_100x100.png";
    addBlob(iconName, iconBlob, spec.icon.maxBytes);
  }

  if (spec.banner) {
    const bannerCanvas =
      params.useAiBanner && params.aiBannerUrl
        ? await renderAiBannerCanvas({
            aiBannerUrl: params.aiBannerUrl,
            width: spec.banner.width,
            height: spec.banner.height,
          })
        : await renderTemplateBannerCanvas({
            masterImageUrl: params.masterImageUrl,
            sliceOptions: params.sliceOptions,
            cellIndices: params.bannerCells,
            templateId: params.bannerTemplateId,
            width: spec.banner.width,
            height: spec.banner.height,
          });
    const bannerBlob = await encodeJpegWithinBudget(bannerCanvas, spec.banner.maxBytes);
    bannerCanvas.width = 0;
    bannerCanvas.height = 0;
    addBlob("05_详情页横幅_750x400.jpg", bannerBlob, spec.banner.maxBytes);
  }

  const readmeName = params.platform === "wechat" ? "投稿指南_README.txt" : "README.txt";
  zip.file(readmeName, buildReadme(params.platform, count, animated, discordMode));

  const blob = await zip.generateAsync({ type: "blob" });
  const suffix =
    params.platform === "discord" ? `discord_${discordMode}` : params.platform;
  return {
    blob,
    filename: `stickerjam_${suffix}_store_${params.packId.slice(0, 6)}.zip`,
    fileCount,
    maxFileBytes,
    allWithinLimits,
  };
}
