"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  ArrowLeft,
  Download,
  Loader2,
  Scissors,
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  exportSingleStickerPng,
  exportStickerPackZip,
  sliceStickerPreview,
  type ExportPreset,
  type ProcessedSticker,
} from "@/lib/slicer/sticker-processor";
import type { GridSize, StickerPackStatus, StickerSlotSnapshot } from "@/db/schema";
import { getStylePresetById } from "@/config/styles";
import { getThemePackById } from "@/config/themes";

interface PackDetail {
  id: string;
  status: StickerPackStatus;
  gridSize: GridSize;
  styleId: string;
  themeId: string;
  userPrompt: string;
  slotsConfig: StickerSlotSnapshot[];
  masterImageUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
}

type PreviewBg = "checker" | "wechat" | "dark";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PackExporter({ packId }: { packId: string }) {
  const locale = useLocale();
  const isZh = locale === "zh";

  const [pack, setPack] = useState<PackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive slicer controls
  const [removeBackground, setRemoveBackground] = useState(true);
  const [tolerance, setTolerance] = useState(32);
  const [whiteBorderPx, setWhiteBorderPx] = useState(10);
  const [previewBg, setPreviewBg] = useState<PreviewBg>("checker");
  const [exportPreset, setExportPreset] = useState<ExportPreset>("original");

  const [stickers, setStickers] = useState<ProcessedSticker[]>([]);
  const [masterDims, setMasterDims] = useState<{ w: number; h: number } | null>(null);
  const [slicing, setSlicing] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  // Fetch pack details (and poll if still generating)
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function fetchPack() {
      try {
        const res = await fetch(`/api/packs/${packId}`);
        if (!res.ok) {
          throw new Error(isZh ? "未找到该表情包或无权访问" : "Sticker pack not found");
        }
        const data = (await res.json()) as { pack: PackDetail };
        if (!active) return;
        setPack(data.pack);
        setLoading(false);

        if (data.pack.status === "COMPLETED" || data.pack.status === "FAILED") {
          if (timer) clearInterval(timer);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load pack");
        setLoading(false);
        if (timer) clearInterval(timer);
      }
    }

    fetchPack();
    timer = setInterval(fetchPack, 2500);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [packId, isZh]);

  // Re-slice whenever master image or cutout settings change (debounced)
  useEffect(() => {
    if (!pack || pack.status !== "COMPLETED" || !pack.masterImageUrl) return;

    let cancelled = false;
    const probe = new Image();
    if (!pack.masterImageUrl.startsWith("data:") && !pack.masterImageUrl.startsWith("blob:")) {
      probe.crossOrigin = "anonymous";
    }
    probe.onload = () => {
      if (!cancelled) {
        setMasterDims({ w: probe.naturalWidth, h: probe.naturalHeight });
      }
    };
    probe.src = pack.masterImageUrl;

    const timeout = setTimeout(async () => {
      setSlicing(true);
      try {
        const items = await sliceStickerPreview(pack.masterImageUrl!, {
          gridSize: pack.gridSize,
          removeBackground,
          tolerance,
          whiteBorderPx,
        });
        if (!cancelled) {
          setStickers(items);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Slicing failed");
        }
      } finally {
        if (!cancelled) setSlicing(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [pack, removeBackground, tolerance, whiteBorderPx]);

  async function handleExportZip() {
    if (!pack?.masterImageUrl) return;
    setExportingZip(true);
    try {
      const zipBlob = await exportStickerPackZip(
        pack.masterImageUrl,
        {
          gridSize: pack.gridSize,
          removeBackground,
          tolerance,
          whiteBorderPx,
        },
        exportPreset,
        pack.slotsConfig.map((s) => s.caption)
      );
      triggerDownload(zipBlob, `stickpop_${pack.gridSize}_${exportPreset}_${pack.id.slice(0, 6)}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ZIP export failed");
    } finally {
      setExportingZip(false);
    }
  }

  async function handleDownloadSingle(index: number) {
    if (!pack?.masterImageUrl) return;
    try {
      const blob = await exportSingleStickerPng(
        pack.masterImageUrl,
        index,
        {
          gridSize: pack.gridSize,
          removeBackground,
          tolerance,
          whiteBorderPx,
        },
        exportPreset
      );
      triggerDownload(blob, `sticker_${String(index + 1).padStart(2, "0")}_${exportPreset}.png`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Single sticker export failed");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-5xl items-center justify-center px-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-[#645E78]">
          <Loader2 className="h-5 w-5 animate-spin text-[#FF6B6B]" />
          <span>{isZh ? "加载表情包中..." : "Loading sticker pack..."}</span>
        </div>
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="sticker-card p-8 text-center space-y-4">
          <AlertCircle className="mx-auto h-10 w-10 text-[#EE5253]" />
          <p className="font-black text-lg">{error || (isZh ? "未找到表情包" : "Pack not found")}</p>
          <Link
            href={`/${locale}/packs`}
            className="sticker-btn inline-flex items-center gap-2 bg-white px-5 py-2 text-sm font-extrabold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isZh ? "返回作品库" : "Back to My Packs"}</span>
          </Link>
        </div>
      </div>
    );
  }

  const style = getStylePresetById(pack.styleId);
  const theme = getThemePackById(pack.themeId);

  const previewBgStyle: React.CSSProperties =
    previewBg === "checker"
      ? {
          backgroundImage:
            "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          backgroundColor: "#ffffff",
        }
      : previewBg === "wechat"
        ? { backgroundColor: "#EDEDED" }
        : { backgroundColor: "#1E1B2E" };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/${locale}/packs`}
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645E78] hover:text-[#1E1B2E]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isZh ? "返回我的作品库" : "Back to My Packs"}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Scissors className="h-6 w-6 text-[#FF6B6B]" />
            <span>{isZh ? "实时切图、抠图与多规格导出" : "Live Cutout & Multi-Spec Exporter"}</span>
          </h1>
          <p className="text-xs font-bold text-[#645E78]">
            {pack.gridSize} · {style ? (isZh ? style.nameZh : style.nameEn) : pack.styleId} ·{" "}
            {theme ? (isZh ? theme.nameZh : theme.nameEn) : pack.themeId}
            {masterDims && (
              <span>
                {" "}
                · {isZh ? "原图" : "Sheet"} {masterDims.w}×{masterDims.h}（
                {isZh ? "单格" : "Cell"} {Math.round(masterDims.w / (pack.gridSize === "4x4" ? 4 : 3))}px）
              </span>
            )}
          </p>
        </div>

        {pack.masterImageUrl && (
          <a
            href={pack.masterImageUrl}
            download={`stickpop_4k_sheet_${pack.id.slice(0, 6)}.png`}
            target="_blank"
            rel="noreferrer"
            className="sticker-btn inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-extrabold"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{isZh ? "下载 4K 宫格原图" : "Download 4K Sheet"}</span>
          </a>
        )}
      </div>

      {/* Pending / Failed States */}
      {(pack.status === "PENDING" || pack.status === "PROCESSING") && (
        <div className="sticker-card p-10 text-center space-y-3">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#FF6B6B]" />
          <h2 className="text-xl font-black">
            {isZh ? "AI 正在绘制 4K 1:1 宫格大图，请稍候..." : "Generating your 4K 1:1 sticker sheet..."}
          </h2>
          <p className="text-xs font-medium text-[#645E78]">
            {isZh ? "通常需要 15~45 秒，页面会自动刷新。" : "Usually takes 15–45 seconds. This page auto-refreshes."}
          </p>
        </div>
      )}

      {pack.status === "FAILED" && (
        <div className="sticker-card border-[#EE5253] bg-[#FFF0F0] p-8 text-center space-y-2">
          <AlertCircle className="mx-auto h-9 w-9 text-[#EE5253]" />
          <h2 className="text-lg font-black text-[#EE5253]">
            {isZh ? "生成失败（积分已自动退还）" : "Generation Failed (Credits Auto-Refunded)"}
          </h2>
          {pack.errorMessage && (
            <p className="text-xs font-bold text-[#EE5253]/80">{pack.errorMessage}</p>
          )}
        </div>
      )}

      {/* Completed: Interactive Slicer + Preview Grid */}
      {pack.status === "COMPLETED" && pack.masterImageUrl && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Controls Panel */}
          <aside className="sticker-card p-5 space-y-5 h-fit">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FF6B6B]" />
                <span>{isZh ? "浏览器端实时精修" : "Live Cutout Controls"}</span>
              </h2>
              {slicing && <Loader2 className="h-4 w-4 animate-spin text-[#FF6B6B]" />}
            </div>

            {/* Toggle Background Removal */}
            <label className="flex items-center justify-between rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] px-3.5 py-2.5 cursor-pointer">
              <span className="text-xs font-extrabold">
                {isZh ? "自动扣除纯色背景" : "Remove Solid Background"}
              </span>
              <input
                type="checkbox"
                checked={removeBackground}
                onChange={(e) => setRemoveBackground(e.target.checked)}
                className="h-4 w-4 accent-[#FF6B6B]"
              />
            </label>

            {/* Tolerance Slider */}
            {removeBackground && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span>{isZh ? "抠图容差" : "Cutout Tolerance"}</span>
                  <span>{tolerance}</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={80}
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  className="w-full accent-[#FF6B6B]"
                />
              </div>
            )}

            {/* White Border Slider */}
            {removeBackground && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-extrabold">
                  <span>{isZh ? "贴纸白边粗细" : "Die-Cut White Border"}</span>
                  <span>{whiteBorderPx}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={whiteBorderPx}
                  onChange={(e) => setWhiteBorderPx(Number(e.target.value))}
                  className="w-full accent-[#2EC4B6]"
                />
              </div>
            )}

            {/* Preview Background */}
            <div className="space-y-1.5">
              <div className="text-xs font-extrabold">{isZh ? "预览背景" : "Preview Surface"}</div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "checker", zh: "透明网格", en: "Grid" },
                    { id: "wechat", zh: "微信浅灰", en: "Light" },
                    { id: "dark", zh: "深色聊天", en: "Dark" },
                  ] as const
                ).map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setPreviewBg(bg.id)}
                    className={`rounded-lg border-2 border-[#1E1B2E] py-1.5 text-[11px] font-extrabold cursor-pointer ${
                      previewBg === bg.id ? "bg-[#FFF3C4]" : "bg-white"
                    }`}
                  >
                    {isZh ? bg.zh : bg.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Resolution Preset */}
            <div className="space-y-2 pt-2 border-t border-[#1E1B2E]/15">
              <div className="text-xs font-extrabold">{isZh ? "导出尺寸规格" : "Export Resolution"}</div>
              <div className="space-y-2">
                {(
                  [
                    {
                      id: "original",
                      zh: "原像素无损直切 PNG（1:1 不拉伸）",
                      en: "Native 1:1 Lossless PNG (No Upscale)",
                    },
                    {
                      id: "wechat",
                      zh: "微信表情包规格 (240×240)",
                      en: "WeChat Sticker Spec (240×240)",
                    },
                    {
                      id: "telegram",
                      zh: "Telegram 贴纸规格 (512×512)",
                      en: "Telegram Sticker Spec (512×512)",
                    },
                  ] as const
                ).map((spec) => (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => setExportPreset(spec.id)}
                    className={`flex w-full items-center justify-between rounded-xl border-2 border-[#1E1B2E] px-3 py-2 text-left text-xs font-bold cursor-pointer ${
                      exportPreset === spec.id ? "bg-[#B8F2E6]" : "bg-[#FFFDF7]"
                    }`}
                  >
                    <span>{isZh ? spec.zh : spec.en}</span>
                    {exportPreset === spec.id && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Download All ZIP */}
            <button
              type="button"
              onClick={handleExportZip}
              disabled={exportingZip || slicing}
              className="sticker-btn flex w-full items-center justify-center gap-2 bg-[#FF6B6B] py-3 text-sm font-black text-white cursor-pointer disabled:opacity-60"
            >
              {exportingZip ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isZh ? "正在打包 ZIP..." : "Packaging ZIP..."}</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>{isZh ? "一键打包下载全部贴纸 (ZIP)" : "Download All Stickers (ZIP)"}</span>
                </>
              )}
            </button>
          </aside>

          {/* Sliced Stickers Grid */}
          <div className="sticker-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black">
                {isZh
                  ? `已切分 ${stickers.length} 张贴纸（点击单张可单独下载）`
                  : `Sliced ${stickers.length} stickers (click any to download PNG)`}
              </span>
            </div>

            <div
              className={`grid gap-4 ${
                pack.gridSize === "4x4" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
              }`}
            >
              {stickers.map((sticker) => (
                <button
                  key={sticker.index}
                  type="button"
                  onClick={() => handleDownloadSingle(sticker.index)}
                  className="group relative aspect-square overflow-hidden rounded-2xl border-2 border-[#1E1B2E] p-2 transition-transform hover:-translate-y-0.5 cursor-pointer"
                  style={previewBgStyle}
                  title={isZh ? "点击下载单张透明 PNG" : "Click to download single PNG"}
                >
                  <img
                    src={sticker.dataUrl}
                    alt={`Sticker ${sticker.index + 1}`}
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full border border-[#1E1B2E] bg-white/95 px-2 py-0.5 text-[10px] font-black text-[#1E1B2E] opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="h-3 w-3" />
                    <span>#{sticker.index + 1}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
