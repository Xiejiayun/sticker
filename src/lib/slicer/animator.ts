import JSZip from "jszip";
import { encodeAnimatedGif, type GifFrameInput } from "./gif-encoder";
import { renderSingleStickerCanvas, type SliceOptions } from "./sticker-processor";

export type MotionPreset = "none" | "bounce" | "wiggle" | "heartbeat" | "shake" | "float";

export const MOTION_PRESETS: Array<{
  id: MotionPreset;
  zh: string;
  en: string;
}> = [
  { id: "none", zh: "静态原图", en: "Static" },
  { id: "bounce", zh: "元气弹跳", en: "Bounce" },
  { id: "wiggle", zh: "俏皮摇摆", en: "Wiggle" },
  { id: "heartbeat", zh: "怦然心跳", en: "Heartbeat" },
  { id: "shake", zh: "震惊抖动", en: "Shake" },
  { id: "float", zh: "软萌漂浮", en: "Float" },
];

export interface RenderAnimatedGifOptions {
  size?: number;
  frames?: number;
  delayCs?: number;
}

function getFrameTransform(
  motion: MotionPreset,
  progress: number, // [0, 1)
  size: number
): { tx: number; ty: number; scaleX: number; scaleY: number; rotRad: number } {
  const theta = progress * Math.PI * 2;
  switch (motion) {
    case "bounce": {
      const bounce = Math.abs(Math.sin(theta));
      const squash = Math.cos(theta * 2) * 0.04;
      return {
        tx: 0,
        ty: (0.5 - bounce) * size * 0.14,
        scaleX: 0.86 - squash,
        scaleY: 0.86 + squash,
        rotRad: 0,
      };
    }
    case "wiggle":
      return {
        tx: 0,
        ty: 0,
        scaleX: 0.86,
        scaleY: 0.86,
        rotRad: Math.sin(theta) * (10 * Math.PI / 180),
      };
    case "heartbeat": {
      const pulse = Math.pow(Math.max(0, Math.sin(theta)), 3);
      const s = 0.82 + pulse * 0.14;
      return { tx: 0, ty: 0, scaleX: s, scaleY: s, rotRad: 0 };
    }
    case "shake": {
      const sx = Math.sin(theta * 3) * size * 0.045;
      const sy = Math.cos(theta * 2) * size * 0.025;
      return {
        tx: sx,
        ty: sy,
        scaleX: 0.86,
        scaleY: 0.86,
        rotRad: Math.sin(theta * 3) * (3 * Math.PI / 180),
      };
    }
    case "float":
      return {
        tx: Math.cos(theta) * size * 0.025,
        ty: Math.sin(theta) * size * 0.06,
        scaleX: 0.86,
        scaleY: 0.86,
        rotRad: Math.sin(theta) * (3 * Math.PI / 180),
      };
    case "none":
    default:
      return { tx: 0, ty: 0, scaleX: 1, scaleY: 1, rotRad: 0 };
  }
}

export function renderAnimatedStickerGif(
  sourceCanvas: HTMLCanvasElement,
  motion: MotionPreset,
  { size = 240, frames = 12, delayCs = 8 }: RenderAnimatedGifOptions = {}
): Blob {
  const frameCanvas = document.createElement("canvas");
  frameCanvas.width = size;
  frameCanvas.height = size;
  const ctx = frameCanvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const scaleToFit = Math.min(1, size / sourceCanvas.width, size / sourceCanvas.height);
  const baseW = sourceCanvas.width * scaleToFit;
  const baseH = sourceCanvas.height * scaleToFit;

  const gifFrames: GifFrameInput[] = [];
  for (let i = 0; i < frames; i++) {
    const progress = i / frames;
    const tr = getFrameTransform(motion, progress, size);

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2 + tr.tx, size / 2 + tr.ty);
    if (tr.rotRad !== 0) ctx.rotate(tr.rotRad);
    ctx.scale(tr.scaleX, tr.scaleY);
    ctx.drawImage(sourceCanvas, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.restore();

    const imgData = ctx.getImageData(0, 0, size, size);
    gifFrames.push({ rgba: new Uint8ClampedArray(imgData.data), delayCs });
  }

  frameCanvas.width = 0;
  frameCanvas.height = 0;

  const bytes = encodeAnimatedGif(size, size, gifFrames);
  return new Blob([bytes.buffer as ArrayBuffer], { type: "image/gif" });
}

export async function exportSingleAnimatedGif(
  masterImageUrl: string,
  cellIndex: number,
  options: SliceOptions,
  motion: MotionPreset,
  size = 240
): Promise<Blob> {
  const cellCanvas = await renderSingleStickerCanvas(masterImageUrl, cellIndex, options, size);
  const blob = renderAnimatedStickerGif(cellCanvas, motion, { size });
  cellCanvas.width = 0;
  cellCanvas.height = 0;
  return blob;
}

export async function exportAnimatedPackZip(
  masterImageUrl: string,
  options: SliceOptions,
  motion: MotionPreset,
  captions?: string[],
  size = 240
): Promise<Blob> {
  const dims = options.gridSize === "4x4" ? 4 : 3;
  const cellCount = dims * dims;
  const zip = new JSZip();

  for (let i = 0; i < cellCount; i++) {
    const cellCanvas = await renderSingleStickerCanvas(masterImageUrl, i, options, size);
    const gifBlob = renderAnimatedStickerGif(cellCanvas, motion, { size });
    cellCanvas.width = 0;
    cellCanvas.height = 0;

    const num = String(i + 1).padStart(2, "0");
    const safeCaption = captions?.[i]
      ? `_${captions[i].replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "").slice(0, 10)}`
      : "";
    zip.file(`sticker_${num}${safeCaption}.gif`, gifBlob);
  }

  return zip.generateAsync({ type: "blob" });
}
