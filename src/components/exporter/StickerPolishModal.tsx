"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  RotateCcw,
  Share2,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import type { GridSize } from "@/db/schema";
import type { MotionPreset } from "@/lib/slicer/animator";
import {
  renderSingleStickerCanvas,
  type CellAdjustment,
  type SliceOptions,
} from "@/lib/slicer/sticker-processor";

export type PreviewBg = "wechat" | "dark" | "checker" | "chat";

interface StickerPolishModalProps {
  isZh: boolean;
  stickerIndex: number | null;
  totalCount: number;
  masterImageUrl: string;
  gridSize: GridSize;
  sliceOptions: SliceOptions;
  motionPreset: MotionPreset;
  caption: string;
  overlayEnabled: boolean;
  previewBg: PreviewBg;
  chatDark: boolean;
  downloading: boolean;
  downloaded: boolean;
  copied: boolean;
  canShare: boolean;
  isCover?: boolean;
  isIcon?: boolean;
  onClose: () => void;
  onSelectIndex: (idx: number) => void;
  onChangePreviewBg: (bg: PreviewBg) => void;
  onToggleChatDark: () => void;
  onUpdateAdjustment: (idx: number, patch: CellAdjustment | null) => void;
  onUpdateCaption: (idx: number, val: string) => void;
  onEnableOverlay: () => void;
  onDownloadSingle: (idx: number) => void;
  onCopySticker: (idx: number) => void;
  onShareSticker: (idx: number) => void;
  onSetAsCover: (idx: number) => void;
  onSetAsIcon: (idx: number) => void;
}

const CHECKER_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
  backgroundColor: "#ffffff",
};

export function StickerPolishModal(props: StickerPolishModalProps) {
  const {
    isZh,
    stickerIndex,
    totalCount,
    masterImageUrl,
    sliceOptions,
    motionPreset,
    caption,
    overlayEnabled,
    previewBg,
    chatDark,
    downloading,
    downloaded,
    copied,
    canShare,
    isCover,
    isIcon,
    onClose,
    onSelectIndex,
    onChangePreviewBg,
    onToggleChatDark,
    onUpdateAdjustment,
    onUpdateCaption,
    onEnableOverlay,
    onDownloadSingle,
    onCopySticker,
    onShareSticker,
    onSetAsCover,
    onSetAsIcon,
  } = props;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (stickerIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        onSelectIndex((stickerIndex - 1 + totalCount) % totalCount);
      } else if (e.key === "ArrowRight") {
        onSelectIndex((stickerIndex + 1) % totalCount);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stickerIndex, totalCount, onClose, onSelectIndex]);

  useEffect(() => {
    if (stickerIndex === null) return;
    let cancelled = false;
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const canvas = await renderSingleStickerCanvas(
          masterImageUrl,
          stickerIndex,
          sliceOptions,
          384
        );
        if (!cancelled) {
          setPreviewUrl(canvas.toDataURL("image/png"));
        }
        canvas.width = 0;
        canvas.height = 0;
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 60);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stickerIndex, masterImageUrl, sliceOptions]);

  if (stickerIndex === null) return null;

  const adj: CellAdjustment = sliceOptions.cellAdjustments?.[stickerIndex] ?? {};
  const zoom = adj.zoom ?? 1;
  const offsetX = adj.offsetX ?? 0;
  const offsetY = adj.offsetY ?? 0;
  const hasCellOverride =
    adj.removeBackground !== undefined ||
    adj.tolerance !== undefined ||
    adj.whiteBorderPx !== undefined;
  const cellRemoveBg = adj.removeBackground ?? sliceOptions.removeBackground;
  const cellTolerance = adj.tolerance ?? sliceOptions.tolerance;
  const cellWhiteBorder = adj.whiteBorderPx ?? sliceOptions.whiteBorderPx;
  const hasAnyAdjustment =
    zoom !== 1 || offsetX !== 0 || offsetY !== 0 || hasCellOverride;

  const surfaceStyle: React.CSSProperties =
    previewBg === "checker"
      ? CHECKER_STYLE
      : previewBg === "dark"
        ? { backgroundColor: "#1E1B2E" }
        : previewBg === "chat"
          ? { backgroundColor: chatDark ? "#171923" : "#EDEDED" }
          : { backgroundColor: "#EDEDED" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B2E]/65 p-3 sm:p-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={isZh ? `精修第 ${stickerIndex + 1} 张贴纸` : `Polish sticker #${stickerIndex + 1}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sticker-card relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden bg-[#FFFDF7]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-[#1E1B2E] bg-white px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-2.5 py-0.5 text-xs font-black">
              #{stickerIndex + 1} / {totalCount}
            </span>
            <h3 className="text-sm font-black sm:text-base">
              {isZh ? "单张贴纸精修" : "Sticker Quick Polish"}
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectIndex((stickerIndex - 1 + totalCount) % totalCount)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#1E1B2E] bg-white hover:bg-[#FFF3C4] cursor-pointer"
              aria-label={isZh ? "上一张" : "Previous sticker"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelectIndex((stickerIndex + 1) % totalCount)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#1E1B2E] bg-white hover:bg-[#FFF3C4] cursor-pointer"
              aria-label={isZh ? "下一张" : "Next sticker"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#1E1B2E] bg-[#FFF0F0] text-[#E04848] hover:bg-[#FFE1E1] cursor-pointer"
              aria-label={isZh ? "关闭" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="grid gap-5 overflow-y-auto p-4 sm:grid-cols-[290px_1fr] sm:p-5">
          {/* Left Preview Column */}
          <div className="space-y-3">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-[#1E1B2E]"
              style={surfaceStyle}
            >
              {previewBg === "chat" ? (
                <div className="flex h-full flex-col justify-between p-3.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-extrabold ${
                        chatDark ? "text-white/75" : "text-[#645E78]"
                      }`}
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-[#0F766E]" />
                      {isZh ? "聊天气泡预览" : "Chat Preview"}
                    </span>
                    <button
                      type="button"
                      onClick={onToggleChatDark}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                        chatDark
                          ? "border-white/25 bg-white/10 text-white"
                          : "border-[#1E1B2E]/25 bg-white text-[#1E1B2E]"
                      }`}
                    >
                      {chatDark ? (isZh ? "切浅色" : "Light") : (isZh ? "切深色" : "Dark")}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-start">
                      <div
                        className={`rounded-2xl rounded-tl-sm px-3 py-1.5 text-[11px] font-semibold shadow-sm ${
                          chatDark ? "bg-[#262B3D] text-white/90" : "bg-white text-[#1E1B2E]"
                        }`}
                      >
                        {isZh ? "发个表情包看看！" : "Send that sticker!"}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="h-36 w-36 p-1">
                        {previewUrl && (
                          <img
                            src={previewUrl}
                            alt={`Sticker ${stickerIndex + 1}`}
                            className={`h-full w-full object-contain ${
                              motionPreset !== "none" ? `sticker-anim-${motionPreset}` : ""
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center p-4">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt={`Sticker ${stickerIndex + 1}`}
                      className={`h-full w-full object-contain ${
                        motionPreset !== "none" ? `sticker-anim-${motionPreset}` : ""
                      }`}
                    />
                  )}
                </div>
              )}

              {rendering && (
                <div className="absolute right-2.5 top-2.5 rounded-full bg-white/90 p-1 shadow">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF6B6B]" />
                </div>
              )}
            </div>

            {/* Surface Selector */}
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: "wechat", zh: "微信灰", en: "Light" },
                  { id: "dark", zh: "深色", en: "Dark" },
                  { id: "checker", zh: "透明格", en: "Grid" },
                  { id: "chat", zh: "气泡", en: "Chat" },
                ] as const
              ).map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => onChangePreviewBg(bg.id)}
                  className={`rounded-lg border-2 border-[#1E1B2E] py-1 text-[11px] font-extrabold cursor-pointer ${
                    previewBg === bg.id ? "bg-[#FFF3C4]" : "bg-white"
                  }`}
                >
                  {isZh ? bg.zh : bg.en}
                </button>
              ))}
            </div>

            {/* Quick Export Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onCopySticker(stickerIndex)}
                className={`sticker-btn flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-black cursor-pointer ${
                  copied ? "bg-[#0F766E] text-white" : "bg-white text-[#1E1B2E]"
                }`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? (isZh ? "已复制" : "Copied") : (isZh ? "复制 PNG" : "Copy")}</span>
              </button>

              <button
                type="button"
                onClick={() => onDownloadSingle(stickerIndex)}
                disabled={downloading}
                className={`sticker-btn flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-black cursor-pointer ${
                  downloaded ? "bg-[#0F766E] text-white" : "bg-[#FF6B6B] text-white"
                }`}
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : downloaded ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>{downloaded ? (isZh ? "已保存" : "Saved") : (isZh ? "下载" : "Save")}</span>
              </button>

              {canShare && (
                <button
                  type="button"
                  onClick={() => onShareSticker(stickerIndex)}
                  className="sticker-btn flex h-9 w-9 items-center justify-center bg-white cursor-pointer"
                  aria-label={isZh ? "分享" : "Share"}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Controls Column */}
          <div className="space-y-4">
            {/* 1. Crop & Nudge */}
            <div className="rounded-2xl border-2 border-[#1E1B2E]/15 bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">
                  {isZh ? "裁切框微调（救回切偏/太小的格子）" : "Crop & Position Nudge"}
                </span>
                {hasAnyAdjustment && (
                  <button
                    type="button"
                    onClick={() => onUpdateAdjustment(stickerIndex, null)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#1E1B2E]/25 px-2 py-0.5 text-[11px] font-extrabold text-[#645E78] hover:bg-[#F4EFE6] cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{isZh ? "还原" : "Reset"}</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>{isZh ? "缩放比例" : "Zoom"}</span>
                  <span className="tabular-nums text-[#645E78]">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.4}
                  step={0.02}
                  value={zoom}
                  onChange={(e) =>
                    onUpdateAdjustment(stickerIndex, { ...adj, zoom: Number(e.target.value) })
                  }
                  className="w-full accent-[#FF6B6B] cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isZh ? "左右微移" : "Shift X"}</span>
                      <span className="tabular-nums text-[#645E78]">
                        {Math.round(offsetX * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-0.2}
                      max={0.2}
                      step={0.01}
                      value={offsetX}
                      onChange={(e) =>
                        onUpdateAdjustment(stickerIndex, { ...adj, offsetX: Number(e.target.value) })
                      }
                      className="w-full accent-[#FF6B6B] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span>{isZh ? "上下微移" : "Shift Y"}</span>
                      <span className="tabular-nums text-[#645E78]">
                        {Math.round(offsetY * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-0.2}
                      max={0.2}
                      step={0.01}
                      value={offsetY}
                      onChange={(e) =>
                        onUpdateAdjustment(stickerIndex, { ...adj, offsetY: Number(e.target.value) })
                      }
                      className="w-full accent-[#FF6B6B] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Per-Cell Cutout Override */}
            <div className="rounded-2xl border-2 border-[#1E1B2E]/15 bg-white p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">
                  {isZh ? "本张独立透明底设置" : "Per-Sticker Cutout Override"}
                </span>
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCellOverride}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onUpdateAdjustment(stickerIndex, {
                          ...adj,
                          removeBackground: sliceOptions.removeBackground,
                          tolerance: sliceOptions.tolerance,
                          whiteBorderPx: sliceOptions.whiteBorderPx,
                        });
                      } else {
                        onUpdateAdjustment(stickerIndex, {
                          offsetX: adj.offsetX,
                          offsetY: adj.offsetY,
                          zoom: adj.zoom,
                        });
                      }
                    }}
                    className="h-3.5 w-3.5 accent-[#FF6B6B]"
                  />
                  <span>{isZh ? "独立覆盖" : "Override"}</span>
                </label>
              </div>

              {hasCellOverride ? (
                <div className="space-y-2.5 border-t border-[#1E1B2E]/10 pt-2.5">
                  <label className="flex items-center justify-between text-xs font-bold cursor-pointer">
                    <span>{isZh ? "移除本张纯色背景" : "Remove Solid Background"}</span>
                    <input
                      type="checkbox"
                      checked={cellRemoveBg}
                      onChange={(e) =>
                        onUpdateAdjustment(stickerIndex, {
                          ...adj,
                          removeBackground: e.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-[#FF6B6B]"
                    />
                  </label>
                  {cellRemoveBg && (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>{isZh ? "背景容差" : "Tolerance"}</span>
                          <span className="tabular-nums text-[#645E78]">{cellTolerance}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          value={cellTolerance}
                          onChange={(e) =>
                            onUpdateAdjustment(stickerIndex, {
                              ...adj,
                              tolerance: Number(e.target.value),
                            })
                          }
                          className="w-full accent-[#FF6B6B] cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>{isZh ? "贴纸白边" : "White Border"}</span>
                          <span className="tabular-nums text-[#645E78]">{cellWhiteBorder}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={24}
                          value={cellWhiteBorder}
                          onChange={(e) =>
                            onUpdateAdjustment(stickerIndex, {
                              ...adj,
                              whiteBorderPx: Number(e.target.value),
                            })
                          }
                          className="w-full accent-[#FF6B6B] cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-[#645E78]">
                  {isZh
                    ? "当前跟随全局透明底设置；如果单张浅色衣物/毛发被误抠，可点右上角单独调节容差。"
                    : "Inherits global cutout settings. Enable override if this specific sticker needs a different tolerance."}
                </p>
              )}
            </div>

            {/* 3. Per-Cell Caption Overlay */}
            <div className="rounded-2xl border-2 border-[#1E1B2E]/15 bg-white p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black">
                  <Type className="h-3.5 w-3.5 text-[#E04848]" />
                  <span>{isZh ? "叠加艺术字文案" : "Sticker Text Overlay"}</span>
                </span>
                {!overlayEnabled && (
                  <button
                    type="button"
                    onClick={onEnableOverlay}
                    className="rounded-full border border-[#1E1B2E] bg-[#FFF3C4] px-2.5 py-0.5 text-[11px] font-extrabold cursor-pointer"
                  >
                    {isZh ? "开启显示" : "Enable"}
                  </button>
                )}
              </div>
              <input
                type="text"
                maxLength={14}
                value={caption}
                onChange={(e) => {
                  if (!overlayEnabled && e.target.value.trim()) onEnableOverlay();
                  onUpdateCaption(stickerIndex, e.target.value);
                }}
                placeholder={isZh ? `输入第 ${stickerIndex + 1} 张表情文字` : `Caption for #${stickerIndex + 1}`}
                className="w-full rounded-xl border-2 border-[#1E1B2E]/20 bg-[#FFFDF7] px-3 py-1.5 text-xs font-bold outline-none focus:border-[#1E1B2E]"
              />
            </div>

            {/* 4. Store Companion Shortcuts */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSetAsCover(stickerIndex)}
                className={`flex items-center gap-1.5 rounded-xl border-2 border-[#1E1B2E] px-3 py-1.5 text-xs font-extrabold cursor-pointer ${
                  isCover ? "bg-[#B8F2E6]" : "bg-white hover:bg-[#FFF3C4]"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{isCover ? (isZh ? "当前封面贴纸 ✓" : "Store Cover ✓") : (isZh ? "设为投稿封面" : "Use as Cover")}</span>
              </button>
              <button
                type="button"
                onClick={() => onSetAsIcon(stickerIndex)}
                className={`flex items-center gap-1.5 rounded-xl border-2 border-[#1E1B2E] px-3 py-1.5 text-xs font-extrabold cursor-pointer ${
                  isIcon ? "bg-[#B8F2E6]" : "bg-white hover:bg-[#FFF3C4]"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isIcon ? (isZh ? "当前图标主体 ✓" : "Panel Icon ✓") : (isZh ? "设为图标主体" : "Use as Icon")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
