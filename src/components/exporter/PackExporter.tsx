"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  ArrowLeft,
  Download,
  Loader2,
  Scissors,
  Image as ImageIcon,
  AlertCircle,
  Check,
  Copy,
  Share2,
  MessageCircle,
} from "lucide-react";
import {
  exportSingleStickerFile,
  exportSingleStickerPng,
  exportStickerPackZip,
  sliceStickerPreview,
  type ExportPreset,
  type ProcessedSticker,
} from "@/lib/slicer/sticker-processor";
import type { GridSize, StickerPackStatus, StickerSlotSnapshot } from "@/db/schema";
import { getStylePresetById } from "@/config/styles";
import { getThemePackById } from "@/config/themes";
import { BRAND } from "@/config/brand";

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

type PreviewBg = "checker" | "wechat" | "dark" | "chat";

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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preserve the finished artwork by default. Transparency is an optional export.
  const [removeBackground, setRemoveBackground] = useState(false);
  const [tolerance, setTolerance] = useState(32);
  const [whiteBorderPx, setWhiteBorderPx] = useState(0);
  const [previewBg, setPreviewBg] = useState<PreviewBg>("checker");
  const [chatDark, setChatDark] = useState(false);
  const [selectedChatIndex, setSelectedChatIndex] = useState(0);
  const [exportPreset, setExportPreset] = useState<ExportPreset>("original");

  const [stickers, setStickers] = useState<ProcessedSticker[]>([]);
  const [masterDims, setMasterDims] = useState<{ w: number; h: number } | null>(null);
  const [slicing, setSlicing] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadedIndex, setDownloadedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

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
        setLoadError(err instanceof Error ? err.message : "Failed to load pack");
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

  const packStatus = pack?.status ?? null;
  const masterImageUrl = pack?.masterImageUrl ?? null;

  // Probe master image dimensions only when the completed image URL changes
  useEffect(() => {
    if (packStatus !== "COMPLETED" || !masterImageUrl) {
      setMasterDims(null);
      return;
    }

    let cancelled = false;
    const probe = new Image();
    if (!masterImageUrl.startsWith("data:") && !masterImageUrl.startsWith("blob:")) {
      probe.crossOrigin = "anonymous";
    }
    probe.onload = () => {
      if (!cancelled) {
        setMasterDims({ w: probe.naturalWidth, h: probe.naturalHeight });
      }
    };
    probe.src = masterImageUrl;

    return () => {
      cancelled = true;
    };
  }, [packStatus, masterImageUrl]);

  // Re-slice whenever master image or cutout settings change (debounced)
  useEffect(() => {
    if (!pack || pack.status !== "COMPLETED" || !pack.masterImageUrl) return;

    setSlicing(true);
    setError(null);
    let cancelled = false;

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
      triggerDownload(zipBlob, `${BRAND.downloadPrefix}_${pack.gridSize}_${exportPreset}_${pack.id.slice(0, 6)}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ZIP export failed");
    } finally {
      setExportingZip(false);
    }
  }

  async function handleDownloadSingle(index: number) {
    if (!pack?.masterImageUrl) return;
    setDownloadingIndex(index);
    try {
      const { blob, ext } = await exportSingleStickerFile(
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
      triggerDownload(blob, `${BRAND.downloadPrefix}_${String(index + 1).padStart(2, "0")}_${exportPreset}.${ext}`);
      setDownloadedIndex(index);
      setTimeout(() => {
        setDownloadedIndex((prev) => (prev === index ? null : prev));
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Single sticker export failed");
    } finally {
      setDownloadingIndex((prev) => (prev === index ? null : prev));
    }
  }

  async function handleCopySticker(index: number) {
    if (!pack?.masterImageUrl) return;
    setError(null);
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        throw new Error(isZh ? "当前浏览器不支持直接复制图片，请点击下载或长按保存" : "Clipboard image copy is not supported in this browser; please download instead.");
      }
      const pngBlob = await exportSingleStickerPng(
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
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex((prev) => (prev === index ? null : prev));
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isZh ? "复制图片失败，请尝试直接下载" : "Failed to copy image"));
    }
  }

  async function handleShareSticker(index: number) {
    if (!pack?.masterImageUrl || !navigator.share) return;
    setError(null);
    try {
      const { blob, ext } = await exportSingleStickerFile(
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
      const mimeType = ext === "webp" ? "image/webp" : "image/png";
      const file = new File([blob], `${BRAND.downloadPrefix}_${String(index + 1).padStart(2, "0")}.${ext}`, { type: mimeType });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        await handleDownloadSingle(index);
        return;
      }
      await navigator.share({
        files: [file],
        title: isZh ? "贴纸酱表情包" : "StickerJam Sticker",
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : (isZh ? "分享失败" : "Share failed"));
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

  if (loadError || !pack) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="sticker-card p-8 text-center space-y-4">
          <AlertCircle className="mx-auto h-10 w-10 text-[#EE5253]" />
          <p className="font-black text-lg">{loadError || (isZh ? "未找到表情包" : "Pack not found")}</p>
          <Link
            href="/packs"
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
            href="/packs"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-[#645E78] hover:text-[#1E1B2E]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{isZh ? "返回我的作品库" : "Back to My Packs"}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
            <Scissors className="h-6 w-6 text-[#FF6B6B]" />
            <span>{isZh ? "切好每一张，下载就开聊" : "Slice, download, start chatting."}</span>
          </h1>
          <p className="text-xs font-bold text-[#645E78]">
            {pack.gridSize} · {style ? (isZh ? style.nameZh : style.nameEn) : pack.styleId} ·{" "}
            {theme ? (isZh ? theme.nameZh : theme.nameEn) : pack.themeId}
            {masterDims && (
              <span>
                {" "}
                · {isZh ? "原图" : "Sheet"} {masterDims.w}×{masterDims.h}（
                {isZh ? "单格约" : "Cell approx."} {Math.round(masterDims.w / (pack.gridSize === "4x4" ? 4 : 3))}px）
              </span>
            )}
          </p>
        </div>

        {pack.masterImageUrl && (
          <a
            href={pack.masterImageUrl}
            download={`${BRAND.downloadPrefix}_sheet_${pack.id.slice(0, 6)}.png`}
            target="_blank"
            rel="noreferrer"
            className="sticker-btn inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-extrabold"
          >
            <ImageIcon className="h-4 w-4" />
            <span>{isZh ? "保存整张原图" : "Save Full Sheet"}</span>
          </a>
        )}
      </div>

      {/* Pending / Failed States */}
      {(pack.status === "PENDING" || pack.status === "PROCESSING") && (
        <div className="sticker-card p-10 text-center space-y-3">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#FF6B6B]" />
          <h2 className="text-xl font-black">
            {isZh ? "AI 正在绘制 2K 高清 1:1 宫格大图，请稍候..." : "Generating your HD 2K 1:1 sticker sheet..."}
          </h2>
          <p className="text-xs font-medium text-[#645E78]">
            {isZh ? "请保持创作页面打开；生成完成后，这里会自动显示结果。" : "Keep the studio page open; the result will appear here when ready."}
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

      {error && <div role="alert" className="rounded-2xl border-2 border-[#EE5253] bg-[#FFF0F0] p-4 text-sm font-bold text-[#EE5253]">{error}</div>}

      {/* Completed: faithful slicing and download first */}
      {pack.status === "COMPLETED" && pack.masterImageUrl && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Controls Panel */}
          <aside className="sticker-card p-5 space-y-5 h-fit">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-base flex items-center gap-2">
                <Download className="h-4 w-4 text-[#FF6B6B]" />
                <span>{isZh ? "下载你的表情包" : "Download Your Pack"}</span>
              </h2>
              {slicing && <Loader2 className="h-4 w-4 animate-spin text-[#FF6B6B]" />}
            </div>

            <p className="text-sm leading-relaxed text-[#645E78]">
              {isZh ? "已经为你按宫格分好。默认保留原图细节和背景，选好尺寸即可下载。" : "Your sheet is split into cells. Keep the original details and background, choose a size, and download."}
            </p>

            <details className="rounded-xl border border-[#1E1B2E]/20 p-3">
              <summary className="cursor-pointer text-xs font-extrabold">{isZh ? "透明背景（可选）" : "Transparent Background (Optional)"}</summary>
              <label className="mt-3 flex items-center justify-between rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] px-3.5 py-2.5 cursor-pointer">
                <span className="text-xs font-extrabold">
                  {isZh ? "移除纯色背景" : "Remove Solid Background"}
                </span>
                <input
                  type="checkbox"
                  checked={removeBackground}
                  onChange={(e) => setRemoveBackground(e.target.checked)}
                  className="h-4 w-4 accent-[#FF6B6B]"
                />
              </label>
              <p className="mt-2 text-xs leading-relaxed text-[#645E78]">{isZh ? "适合需要透明 PNG 的场景。开启后请检查白色衣物、毛发等浅色细节。" : "For transparent PNGs. Check pale details such as white clothing or fur after enabling."}</p>
              {removeBackground && (
                <div className="mt-3 space-y-3 border-t border-[#1E1B2E]/10 pt-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-[#1E1B2E]">
                      <label htmlFor="cutout-tolerance">{isZh ? "背景容差" : "Color Tolerance"}</label>
                      <span className="tabular-nums text-[#645E78]">{tolerance}</span>
                    </div>
                    <input
                      id="cutout-tolerance"
                      type="range"
                      min={0}
                      max={80}
                      value={tolerance}
                      onChange={(e) => setTolerance(Number(e.target.value))}
                      className="w-full accent-[#FF6B6B] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-[#1E1B2E]">
                      <label htmlFor="cutout-border">{isZh ? "贴纸白边 (px)" : "Die-Cut Border (px)"}</label>
                      <span className="tabular-nums text-[#645E78]">{whiteBorderPx}px</span>
                    </div>
                    <input
                      id="cutout-border"
                      type="range"
                      min={0}
                      max={24}
                      value={whiteBorderPx}
                      onChange={(e) => setWhiteBorderPx(Number(e.target.value))}
                      className="w-full accent-[#FF6B6B] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </details>

            {/* Preview Background */}
            <div className="space-y-1.5">
              <div className="text-xs font-extrabold">{isZh ? "预览背景" : "Preview Surface"}</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "checker", zh: "透明网格", en: "Grid" },
                    { id: "wechat", zh: "微信浅灰", en: "Light" },
                    { id: "dark", zh: "深色聊天", en: "Dark" },
                    { id: "chat", zh: "聊天气泡", en: "Chat" },
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
                      zh: "原像素 PNG · 推荐",
                      en: "Native PNG · Recommended",
                    },
                    {
                      id: "wechat",
                      zh: "微信表情包 (240×240 PNG)",
                      en: "WeChat Sticker (240×240 PNG)",
                    },
                    {
                      id: "telegram",
                      zh: "Telegram 贴纸 (512×512 PNG)",
                      en: "Telegram Sticker (512×512 PNG)",
                    },
                    {
                      id: "whatsapp",
                      zh: "WhatsApp (512×512 <100KB WebP)",
                      en: "WhatsApp (512×512 <100KB WebP)",
                    },
                    {
                      id: "line",
                      zh: "LINE Creators (370×320 + 图标)",
                      en: "LINE Creators (370×320 + Main/Tab)",
                    },
                    {
                      id: "discord",
                      zh: "Discord / Slack (128×128 PNG)",
                      en: "Discord / Slack (128×128 PNG)",
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
                  <span>{isZh ? "下载整套 ZIP" : "Download Full ZIP"}</span>
                </>
              )}
            </button>
          </aside>

          {/* Sliced Stickers Grid */}
          <div className="sticker-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-black">
                {slicing ? (isZh ? "正在按宫格切分..." : "Slicing your sheet...") : isZh
                  ? `已切分 ${stickers.length} 张贴纸（支持下载、复制 PNG 或气泡预览）`
                  : `Sliced ${stickers.length} stickers (download, copy PNG, or preview in chat)`}
              </span>
            </div>

            {previewBg === "chat" && stickers.length > 0 && (
              <div
                className={`rounded-2xl border-2 border-[#1E1B2E] p-4 space-y-3 transition-colors ${
                  chatDark ? "bg-[#171923] text-white" : "bg-[#EDEDED] text-[#1E1B2E]"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-[#0F766E]" />
                    <span>
                      {isZh
                        ? `聊天气泡实战预览 · 当前 #${selectedChatIndex + 1}`
                        : `Live Chat Preview · Sticker #${selectedChatIndex + 1}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setChatDark((d) => !d)}
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold cursor-pointer ${
                      chatDark
                        ? "border-white/25 bg-white/10 text-white"
                        : "border-[#1E1B2E]/25 bg-white text-[#1E1B2E]"
                    }`}
                  >
                    {chatDark ? (isZh ? "切浅色微信" : "Light Mode") : (isZh ? "切深色 TG" : "Dark Mode")}
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-start">
                    <div
                      className={`rounded-2xl rounded-tl-sm px-3.5 py-2 text-xs font-semibold shadow-sm ${
                        chatDark ? "bg-[#262B3D] text-white/90" : "bg-white text-[#1E1B2E]"
                      }`}
                    >
                      {isZh ? "快把你那套新表情包发来看看！" : "Send over one of your new stickers!"}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="h-28 w-28 overflow-hidden rounded-xl p-1">
                      <img
                        src={stickers[selectedChatIndex]?.dataUrl ?? stickers[0]?.dataUrl}
                        alt="Chat sticker preview"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`grid gap-4 ${
                pack.gridSize === "4x4" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
              }`}
            >
              {slicing && stickers.length === 0
                ? Array.from({ length: pack.gridSize === "4x4" ? 16 : 9 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="aspect-square animate-pulse rounded-2xl border-2 border-[#1E1B2E]/20 bg-[#FFF3C4]/40"
                    />
                  ))
                : stickers.map((sticker) => {
                    const isDownloading = downloadingIndex === sticker.index;
                    const isDownloaded = downloadedIndex === sticker.index;
                    const isCopied = copiedIndex === sticker.index;
                    const isChatSelected = previewBg === "chat" && selectedChatIndex === sticker.index;
                    return (
                      <div
                        key={sticker.index}
                        className={`group flex flex-col overflow-hidden rounded-2xl border-2 bg-white transition-transform hover:-translate-y-0.5 ${
                          isChatSelected ? "border-[#E04848] shadow-[3px_3px_0px_#E04848]" : "border-[#1E1B2E]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (previewBg === "chat") {
                              setSelectedChatIndex(sticker.index);
                            } else {
                              handleDownloadSingle(sticker.index);
                            }
                          }}
                          className="relative aspect-square w-full p-2 cursor-pointer"
                          style={previewBg === "chat" ? { backgroundColor: chatDark ? "#171923" : "#EDEDED" } : previewBgStyle}
                          disabled={slicing || exportingZip || isDownloading}
                          title={
                            previewBg === "chat"
                              ? (isZh ? "点击在上方气泡中预览" : "Click to preview in chat")
                              : (isZh ? "点击下载单张" : "Click to download")
                          }
                        >
                          <img
                            src={sticker.dataUrl}
                            alt={`Sticker ${sticker.index + 1}`}
                            className="h-full w-full object-contain"
                          />
                          <span className="absolute left-2 top-2 rounded-full border border-[#1E1B2E]/25 bg-white/90 px-2 py-0.5 text-[10px] font-black text-[#1E1B2E]">
                            #{sticker.index + 1}
                          </span>
                        </button>

                        <div className="flex items-center justify-between gap-1 border-t border-[#1E1B2E]/15 bg-[#FFFDF7] px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(sticker.index)}
                            disabled={slicing || exportingZip || isDownloading}
                            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-extrabold transition-colors cursor-pointer disabled:opacity-60 ${
                              isDownloaded
                                ? "bg-[#0F766E] text-white"
                                : "bg-white text-[#1E1B2E] hover:bg-[#FFF3C4]"
                            }`}
                            title={isZh ? "下载单张" : "Download"}
                          >
                            {isDownloading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isDownloaded ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            <span>{isDownloaded ? (isZh ? "已存" : "Saved") : (isZh ? "下载" : "Save")}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopySticker(sticker.index)}
                            disabled={slicing || exportingZip}
                            className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] font-extrabold transition-colors cursor-pointer disabled:opacity-60 ${
                              isCopied
                                ? "bg-[#0F766E] text-white"
                                : "bg-white text-[#645E78] hover:bg-[#F4EFE6] hover:text-[#1E1B2E]"
                            }`}
                            title={isZh ? "复制透明 PNG 到剪贴板" : "Copy PNG to clipboard"}
                            aria-label={isZh ? "复制图片" : "Copy image"}
                          >
                            {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </button>

                          {canShare && (
                            <button
                              type="button"
                              onClick={() => handleShareSticker(sticker.index)}
                              disabled={slicing || exportingZip}
                              className="flex items-center justify-center rounded-lg bg-white px-2 py-1 text-[11px] font-extrabold text-[#645E78] hover:bg-[#F4EFE6] hover:text-[#1E1B2E] cursor-pointer disabled:opacity-60"
                              title={isZh ? "系统分享 / 存相册" : "Share / Save"}
                              aria-label={isZh ? "分享" : "Share"}
                            >
                              <Share2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
