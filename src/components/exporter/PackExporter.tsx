"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageCircle,
  Plus,
  Scissors,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Store,
  Type,
} from "lucide-react";
import { BRAND } from "@/config/brand";
import { isAnimatedSpriteThemeId } from "@/config/animations";
import { getStylePresetById } from "@/config/styles";
import { getThemeDisplayName } from "@/config/themes";
import type { GridSize, StickerPackStatus, StickerSlotSnapshot } from "@/db/schema";
import { SpritePackExporter } from "./SpritePackExporter";
import type { StoreAssetKind } from "@/lib/ai/types";
import { useSession } from "@/lib/auth-client";
import {
  MOTION_PRESETS,
  exportAnimatedPackZip,
  exportSingleAnimatedGif,
  type MotionPreset,
} from "@/lib/slicer/animator";
import {
  STORE_PLATFORM_SPECS,
  type DiscordMode,
  type StorePlatformId,
} from "@/lib/slicer/platform-specs";
import {
  exportSingleStickerFile,
  exportSingleStickerPng,
  exportStickerPackZip,
  sliceStickerPreview,
  type CaptionOverlayOptions,
  type CellAdjustment,
  type ExportPreset,
  type ProcessedSticker,
  type SliceOptions,
} from "@/lib/slicer/sticker-processor";
import {
  exportStoreSubmissionZip,
  type BannerTemplateId,
  type StoreExportResult,
} from "@/lib/slicer/store-assets";
import { StickerPolishModal, type PreviewBg } from "./StickerPolishModal";
import { StoreAssetWorkshop } from "./StoreAssetWorkshop";

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

type ExportMode = "chat" | "store";
type OpenPopover = "cutout" | "caption" | "motion" | null;

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

export function PackExporter({
  packId,
  justCompleted = false,
  onStartNew,
}: {
  packId: string;
  justCompleted?: boolean;
  onStartNew?: () => void;
}) {
  const locale = useLocale();
  const isZh = locale === "zh";
  const { data: session } = useSession();

  const [pack, setPack] = useState<PackDetail | null>(null);
  const [setPacks, setSetPacks] = useState<PackDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Canvas & slicing controls
  const [removeBackground, setRemoveBackground] = useState(false);
  const [tolerance, setTolerance] = useState(32);
  const [whiteBorderPx, setWhiteBorderPx] = useState(0);
  const [smartSeam, setSmartSeam] = useState(true);
  const [autoCenter, setAutoCenter] = useState(true);
  const [cellAdjustments, setCellAdjustments] = useState<Record<number, CellAdjustment>>({});

  // Caption overlay
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState<CaptionOverlayOptions["style"]>("bold-pop");
  const [overlayPosition, setOverlayPosition] = useState<CaptionOverlayOptions["position"]>("bottom");
  const [overlayCaptions, setOverlayCaptions] = useState<string[]>([]);

  // Preview & motion
  const [previewBg, setPreviewBg] = useState<PreviewBg>("wechat");
  const [chatDark, setChatDark] = useState(false);
  const [selectedChatIndex, setSelectedChatIndex] = useState(0);
  const [motionPreset, setMotionPreset] = useState<MotionPreset>("none");
  const [openPopover, setOpenPopover] = useState<OpenPopover>(null);
  const [polishIndex, setPolishIndex] = useState<number | null>(null);

  // Export mode & store pack state
  const [exportMode, setExportMode] = useState<ExportMode>("chat");
  const [storePlatform, setStorePlatform] = useState<StorePlatformId>("wechat");
  const [discordMode, setDiscordMode] = useState<DiscordMode>("emoji");
  const [coverCellIndex, setCoverCellIndex] = useState(0);
  const [iconCellIndex, setIconCellIndex] = useState(0);
  const [iconHeadCrop, setIconHeadCrop] = useState(true);
  const [iconFocusX, setIconFocusX] = useState(0);
  const [iconFocusY, setIconFocusY] = useState(0);
  const [iconZoom, setIconZoom] = useState(1.1);
  const [bannerCells, setBannerCells] = useState<[number, number, number]>([0, 1, 2]);
  const [bannerTemplateId, setBannerTemplateId] = useState<BannerTemplateId>("sunny-pop");
  const [useAiCover, setUseAiCover] = useState(false);
  const [useAiIcon, setUseAiIcon] = useState(false);
  const [useAiBanner, setUseAiBanner] = useState(false);
  const [aiAssets, setAiAssets] = useState<Partial<Record<StoreAssetKind, string>>>({});
  const [assetCreditCost, setAssetCreditCost] = useState(5);

  const [stickers, setStickers] = useState<ProcessedSticker[]>([]);
  const [masterDims, setMasterDims] = useState<{ w: number; h: number } | null>(null);
  const [slicing, setSlicing] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [lastStoreResult, setLastStoreResult] = useState<StoreExportResult | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadedIndex, setDownloadedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (justCompleted) {
      window.scrollTo({ top: 0 });
    }
  }, [justCompleted]);

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
        const data = (await res.json()) as { pack: PackDetail; packs?: PackDetail[] };
        if (!active) return;
        const resolvedSet =
          Array.isArray(data.packs) && data.packs.length > 0 ? data.packs : [data.pack];
        setPack(data.pack);
        setSetPacks(resolvedSet);
        setOverlayCaptions((prev) =>
          prev.length > 0 ? prev : data.pack.slotsConfig.map((s) => s.caption)
        );
        if (data.pack.gridSize === "4x4") {
          setBannerCells((prev) => (prev[0] === 0 && prev[1] === 1 && prev[2] === 2 ? [0, 4, 6] : prev));
        }
        setLoading(false);

        const allSettled = resolvedSet.every(
          (item) => item.status === "COMPLETED" || item.status === "FAILED"
        );
        if (allSettled) {
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

  const packThemeId = pack?.themeId ?? null;
  const isAnimatedPack = Boolean(packThemeId && isAnimatedSpriteThemeId(packThemeId));

  // Load any previously generated AI store assets for this pack (static packs only)
  useEffect(() => {
    if (!packThemeId || isAnimatedPack) return;
    let active = true;
    async function fetchAssets() {
      try {
        const res = await fetch(`/api/packs/${encodeURIComponent(packId)}/assets`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          assets?: Partial<Record<StoreAssetKind, string>>;
          creditCost?: number;
        };
        if (!active) return;
        if (typeof data.creditCost === "number") setAssetCreditCost(data.creditCost);
        if (data.assets) {
          setAiAssets(data.assets);
          if (data.assets.cover) setUseAiCover(true);
          if (data.assets.icon) setUseAiIcon(true);
          if (data.assets.banner) setUseAiBanner(true);
        }
      } catch {
        // Optional endpoint failure should not block slicing
      }
    }
    fetchAssets();
    return () => {
      active = false;
    };
  }, [packId, packThemeId, isAnimatedPack]);

  const packStatus = pack?.status ?? null;
  const masterImageUrl = pack?.masterImageUrl ?? null;

  useEffect(() => {
    if (isAnimatedPack || packStatus !== "COMPLETED" || !masterImageUrl) {
      setMasterDims(null);
      return;
    }
    let cancelled = false;
    const probe = new Image();
    if (!masterImageUrl.startsWith("data:") && !masterImageUrl.startsWith("blob:")) {
      probe.crossOrigin = "anonymous";
    }
    probe.onload = () => {
      if (!cancelled) setMasterDims({ w: probe.naturalWidth, h: probe.naturalHeight });
    };
    probe.src = masterImageUrl;
    return () => {
      cancelled = true;
    };
  }, [isAnimatedPack, packStatus, masterImageUrl]);

  function buildSliceOptions(gridSize: GridSize): SliceOptions {
    return {
      gridSize,
      removeBackground,
      tolerance,
      whiteBorderPx,
      smartSeam,
      autoCenter,
      cellAdjustments,
      captionOverlay: overlayEnabled
        ? {
            enabled: true,
            style: overlayStyle,
            position: overlayPosition,
            captions: overlayCaptions,
          }
        : undefined,
    };
  }

  // Re-slice previews whenever master image or settings change (static packs only)
  useEffect(() => {
    if (!pack || isAnimatedPack || pack.status !== "COMPLETED" || !pack.masterImageUrl) return;
    setSlicing(true);
    setError(null);
    let cancelled = false;

    const timeout = setTimeout(async () => {
      try {
        const items = await sliceStickerPreview(
          pack.masterImageUrl!,
          buildSliceOptions(pack.gridSize)
        );
        if (!cancelled) setStickers(items);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Slicing failed");
      } finally {
        if (!cancelled) setSlicing(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pack,
    removeBackground,
    tolerance,
    whiteBorderPx,
    smartSeam,
    autoCenter,
    cellAdjustments,
    overlayEnabled,
    overlayStyle,
    overlayPosition,
    overlayCaptions,
  ]);

  function toggleTransparentBackground(next: boolean) {
    setRemoveBackground(next);
    setPreviewBg((cur) => {
      if (next && cur === "wechat") return "checker";
      if (!next && cur === "checker") return "wechat";
      return cur;
    });
  }

  function handleEnterStoreMode() {
    setExportMode("store");
    if (STORE_PLATFORM_SPECS[storePlatform].requiresTransparency && !removeBackground) {
      toggleTransparentBackground(true);
    }
  }

  function handleChangeStorePlatform(nextPlatform: StorePlatformId) {
    setStorePlatform(nextPlatform);
    setLastStoreResult(null);
    if (STORE_PLATFORM_SPECS[nextPlatform].requiresTransparency && !removeBackground) {
      toggleTransparentBackground(true);
    }
  }

  function getSingleExportPreset(): ExportPreset {
    if (exportMode === "chat") return "original";
    if (storePlatform === "discord") {
      return discordMode === "sticker" ? "discord-sticker" : "discord";
    }
    return storePlatform;
  }

  async function handleExportZip() {
    if (!pack?.masterImageUrl) return;
    setExportingZip(true);
    setError(null);
    setLastStoreResult(null);
    try {
      const sliceOpts = buildSliceOptions(pack.gridSize);
      const captionsForNames = overlayEnabled
        ? overlayCaptions
        : pack.slotsConfig.map((s) => s.caption);

      if (exportMode === "store") {
        const result = await exportStoreSubmissionZip({
          packId: pack.id,
          masterImageUrl: pack.masterImageUrl,
          gridSize: pack.gridSize,
          sliceOptions: sliceOpts,
          platform: storePlatform,
          discordMode,
          motionPreset,
          coverCellIndex,
          iconCellIndex,
          iconHeadCrop,
          iconFocusX,
          iconFocusY,
          iconZoom,
          bannerCells,
          bannerTemplateId,
          useAiCover,
          useAiIcon,
          useAiBanner,
          aiCoverUrl: aiAssets.cover,
          aiIconUrl: aiAssets.icon,
          aiBannerUrl: aiAssets.banner,
        });
        setLastStoreResult(result);
        triggerDownload(result.blob, result.filename);
      } else if (motionPreset !== "none") {
        const zipBlob = await exportAnimatedPackZip(
          pack.masterImageUrl,
          sliceOpts,
          motionPreset,
          captionsForNames
        );
        triggerDownload(
          zipBlob,
          `${BRAND.downloadPrefix}_${pack.gridSize}_gif_${motionPreset}_${pack.id.slice(0, 6)}.zip`
        );
      } else {
        const zipBlob = await exportStickerPackZip(
          pack.masterImageUrl,
          sliceOpts,
          "original",
          captionsForNames
        );
        triggerDownload(
          zipBlob,
          `${BRAND.downloadPrefix}_${pack.gridSize}_png_${pack.id.slice(0, 6)}.zip`
        );
      }
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
      const sliceOpts = buildSliceOptions(pack.gridSize);
      const preset = getSingleExportPreset();
      const spec = STORE_PLATFORM_SPECS[storePlatform];
      const useGif =
        motionPreset !== "none" &&
        (exportMode === "chat" || spec.animatedFormat === "gif");

      if (useGif) {
        const gifSize =
          exportMode === "store"
            ? storePlatform === "discord" && discordMode === "sticker"
              ? 320
              : spec.stickerWidth
            : 240;
        const maxBytes =
          exportMode === "store" ? spec.animatedMaxBytes ?? undefined : undefined;
        const gifBlob = await exportSingleAnimatedGif(
          pack.masterImageUrl,
          index,
          sliceOpts,
          motionPreset,
          gifSize,
          maxBytes
        );
        triggerDownload(
          gifBlob,
          `${BRAND.downloadPrefix}_${String(index + 1).padStart(2, "0")}_${motionPreset}.gif`
        );
      } else {
        const { blob, ext } = await exportSingleStickerFile(
          pack.masterImageUrl,
          index,
          sliceOpts,
          preset
        );
        triggerDownload(
          blob,
          `${BRAND.downloadPrefix}_${String(index + 1).padStart(2, "0")}_${preset}.${ext}`
        );
      }
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
        throw new Error(
          isZh
            ? "当前浏览器不支持直接复制图片，请点击下载或长按保存"
            : "Clipboard image copy is not supported in this browser; please download instead."
        );
      }
      const pngBlob = await exportSingleStickerPng(
        pack.masterImageUrl,
        index,
        buildSliceOptions(pack.gridSize),
        getSingleExportPreset()
      );
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex((prev) => (prev === index ? null : prev));
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : isZh ? "复制图片失败，请尝试直接下载" : "Failed to copy image"
      );
    }
  }

  async function handleShareSticker(index: number) {
    if (!pack?.masterImageUrl || !navigator.share) return;
    setError(null);
    try {
      const { blob, ext } = await exportSingleStickerFile(
        pack.masterImageUrl,
        index,
        buildSliceOptions(pack.gridSize),
        getSingleExportPreset()
      );
      const mimeType = ext === "webp" ? "image/webp" : "image/png";
      const file = new File(
        [blob],
        `${BRAND.downloadPrefix}_${String(index + 1).padStart(2, "0")}.${ext}`,
        { type: mimeType }
      );
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
      setError(err instanceof Error ? err.message : isZh ? "分享失败" : "Share failed");
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

  if (isAnimatedSpriteThemeId(pack.themeId)) {
    const completedSetPacks = setPacks.filter(
      (item) => item.status === "COMPLETED" && Boolean(item.masterImageUrl)
    );
    if (completedSetPacks.length > 0) {
      return (
        <SpritePackExporter
          pack={completedSetPacks[0]}
          packs={completedSetPacks}
          justCompleted={justCompleted}
          onStartNew={onStartNew}
        />
      );
    }
  }

  const style = getStylePresetById(pack.styleId);
  const themeDisplayName = getThemeDisplayName(pack.themeId, isZh);
  const totalCount = pack.gridSize === "4x4" ? 16 : 9;
  const activeStoreSpec = STORE_PLATFORM_SPECS[storePlatform];
  const storeAnimatedConflict =
    exportMode === "store" && motionPreset !== "none" && activeStoreSpec.animatedFormat === null;

  const previewBgStyle: React.CSSProperties =
    previewBg === "checker"
      ? {
          backgroundImage:
            "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          backgroundColor: "#ffffff",
        }
      : previewBg === "dark"
        ? { backgroundColor: "#1E1B2E" }
        : { backgroundColor: "#EDEDED" };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-5 pb-20">
      {/* Celebratory Direct-Entry Banner when arriving straight from Studio generation */}
      {justCompleted && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#0F766E] bg-[#E8FAF8] px-4 py-2.5 text-xs sm:text-sm font-extrabold text-[#0F766E]"
          data-testid="generation-complete"
          role="status"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {isZh
              ? "成图已自动切分就绪！直接复制单张发聊，点图片精修，或切到右侧「平台投稿包」一键配齐物料。"
              : "Sheet sliced & ready! Copy any sticker, click to polish, or switch to Store Submission Pack."}
          </span>
          {onStartNew && (
            <button
              type="button"
              onClick={onStartNew}
              className="inline-flex items-center gap-1 rounded-full border border-[#0F766E] bg-white px-3 py-1 text-xs font-black text-[#0F766E] hover:bg-[#D4FAF4] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isZh ? "创作新的一套" : "Create Another"}</span>
            </button>
          )}
        </div>
      )}

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
            <span>{isZh ? "切好每一张，下载就开聊" : "Slice, polish, and share anywhere."}</span>
          </h1>
          <p className="text-xs font-bold text-[#645E78]">
            {pack.gridSize} ({totalCount}{isZh ? "张" : ""}) · {style ? (isZh ? style.nameZh : style.nameEn) : pack.styleId} ·{" "}
            {themeDisplayName}
            {masterDims && (
              <span>
                {" "}
                · {isZh ? "原图" : "Sheet"} {masterDims.w}×{masterDims.h}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pack.masterImageUrl && (
            <a
              href={pack.masterImageUrl}
              download={`${BRAND.downloadPrefix}_sheet_${pack.id.slice(0, 6)}.png`}
              target="_blank"
              rel="noreferrer"
              className="sticker-btn inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-extrabold"
            >
              <ImageIcon className="h-4 w-4" />
              <span>{isZh ? "保存整张原图" : "Save Sheet"}</span>
            </a>
          )}
        </div>
      </div>

      {/* Pending / Failed States */}
      {(pack.status === "PENDING" || pack.status === "PROCESSING") && (
        <div className="sticker-card p-10 text-center space-y-3">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#FF6B6B]" />
          <h2 className="text-xl font-black">
            {isZh ? "AI 正在绘制高清 1:1 宫格大图，请稍候..." : "Generating your HD 1:1 sticker sheet..."}
          </h2>
          <p className="text-xs font-medium text-[#645E78]">
            {isZh ? "请保持页面打开，生成完成后会自动呈现。" : "Keep this page open; results appear automatically."}
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

      {error && (
        <div role="alert" className="rounded-2xl border-2 border-[#EE5253] bg-[#FFF0F0] p-4 text-sm font-bold text-[#EE5253]">
          {error}
        </div>
      )}

      {/* Main Two-Column Workbench: Left Canvas + Right Export Drawer */}
      {pack.status === "COMPLETED" && pack.masterImageUrl && (
        <div className="grid gap-6 lg:grid-cols-[1fr_370px] items-start">
          {/* Left Canvas Column */}
          <div className="sticker-card p-4 sm:p-5 space-y-4">
            {/* Compact Canvas Toolbar */}
            <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-[#1E1B2E]/10 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Pill 1: Cutout / Smart Seam */}
                <div className="relative">
                  <div className="flex items-center overflow-hidden rounded-full border-2 border-[#1E1B2E] bg-white">
                    <button
                      type="button"
                      onClick={() => toggleTransparentBackground(!removeBackground)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold cursor-pointer ${
                        removeBackground ? "bg-[#B8F2E6]" : "bg-white hover:bg-[#FFFDF7]"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>{isZh ? "透明底" : "Cutout"}</span>
                      <span className="text-[10px] font-black text-[#0F766E]">
                        {removeBackground ? "ON" : "OFF"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenPopover((p) => (p === "cutout" ? null : "cutout"))}
                      className="border-l border-[#1E1B2E]/20 px-2 py-1 hover:bg-[#FFF3C4] cursor-pointer"
                      aria-label={isZh ? "切图与抠图参数" : "Cutout settings"}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {openPopover === "cutout" && (
                    <div className="sticker-card absolute left-0 top-10 z-30 w-64 p-3.5 space-y-3 bg-white">
                      <label className="flex items-center justify-between text-xs font-extrabold cursor-pointer">
                        <span>{isZh ? "智能寻缝（防切边）" : "Smart Seam Slicing"}</span>
                        <input
                          type="checkbox"
                          checked={smartSeam}
                          onChange={(e) => setSmartSeam(e.target.checked)}
                          className="h-4 w-4 accent-[#FF6B6B]"
                        />
                      </label>
                      <label className="flex items-center justify-between text-xs font-extrabold cursor-pointer">
                        <span>{isZh ? "自动重心居中" : "Auto Center Subject"}</span>
                        <input
                          type="checkbox"
                          checked={autoCenter}
                          onChange={(e) => setAutoCenter(e.target.checked)}
                          className="h-4 w-4 accent-[#FF6B6B]"
                        />
                      </label>
                      <label className="flex items-center justify-between text-xs font-extrabold cursor-pointer border-t border-[#1E1B2E]/10 pt-2">
                        <span>{isZh ? "移除纯色背景" : "Transparent Cutout"}</span>
                        <input
                          type="checkbox"
                          checked={removeBackground}
                          onChange={(e) => toggleTransparentBackground(e.target.checked)}
                          className="h-4 w-4 accent-[#FF6B6B]"
                        />
                      </label>
                      {removeBackground && (
                        <>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span>{isZh ? "背景容差" : "Tolerance"}</span>
                              <span className="tabular-nums text-[#645E78]">{tolerance}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={80}
                              value={tolerance}
                              onChange={(e) => setTolerance(Number(e.target.value))}
                              className="w-full accent-[#FF6B6B] cursor-pointer"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span>{isZh ? "贴纸白边 (px)" : "White Border"}</span>
                              <span className="tabular-nums text-[#645E78]">{whiteBorderPx}px</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={24}
                              value={whiteBorderPx}
                              onChange={(e) => setWhiteBorderPx(Number(e.target.value))}
                              className="w-full accent-[#FF6B6B] cursor-pointer"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Pill 2: Caption Overlay */}
                <div className="relative">
                  <div className="flex items-center overflow-hidden rounded-full border-2 border-[#1E1B2E] bg-white">
                    <button
                      type="button"
                      onClick={() => setOverlayEnabled((v) => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold cursor-pointer ${
                        overlayEnabled ? "bg-[#FFF3C4]" : "bg-white hover:bg-[#FFFDF7]"
                      }`}
                    >
                      <Type className="h-3.5 w-3.5 text-[#E04848]" />
                      <span>{isZh ? "艺术字" : "Text"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenPopover((p) => (p === "caption" ? null : "caption"))}
                      className="border-l border-[#1E1B2E]/20 px-2 py-1 hover:bg-[#FFF3C4] cursor-pointer"
                      aria-label={isZh ? "艺术字样式" : "Caption style"}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {openPopover === "caption" && (
                    <div className="sticker-card absolute left-0 top-10 z-30 w-64 p-3.5 space-y-3 bg-white">
                      <label className="flex items-center justify-between text-xs font-extrabold cursor-pointer">
                        <span>{isZh ? "启用叠加艺术字" : "Enable Caption Overlay"}</span>
                        <input
                          type="checkbox"
                          checked={overlayEnabled}
                          onChange={(e) => setOverlayEnabled(e.target.checked)}
                          className="h-4 w-4 accent-[#E04848]"
                        />
                      </label>
                      <div className="space-y-1">
                        <div className="text-[11px] font-extrabold">{isZh ? "字体样式" : "Style"}</div>
                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              { id: "bold-pop", zh: "波普", en: "Pop" },
                              { id: "bubble", zh: "气泡", en: "Pill" },
                              { id: "neon-dark", zh: "亮黄", en: "Yellow" },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setOverlayEnabled(true);
                                setOverlayStyle(st.id);
                              }}
                              className={`rounded-lg border border-[#1E1B2E] py-1 text-[11px] font-extrabold cursor-pointer ${
                                overlayStyle === st.id ? "bg-[#FFF3C4]" : "bg-white"
                              }`}
                            >
                              {isZh ? st.zh : st.en}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[11px] font-extrabold">{isZh ? "显示位置" : "Position"}</div>
                        <div className="grid grid-cols-2 gap-1">
                          {(
                            [
                              { id: "bottom", zh: "底部", en: "Bottom" },
                              { id: "top", zh: "顶部", en: "Top" },
                            ] as const
                          ).map((pos) => (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => {
                                setOverlayEnabled(true);
                                setOverlayPosition(pos.id);
                              }}
                              className={`rounded-lg border border-[#1E1B2E] py-1 text-[11px] font-extrabold cursor-pointer ${
                                overlayPosition === pos.id ? "bg-[#B8F2E6]" : "bg-white"
                              }`}
                            >
                              {isZh ? pos.zh : pos.en}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-[#645E78]">
                        {isZh ? "点击任意贴纸即可修改单张文案。" : "Click any sticker below to edit its text."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Pill 3: Animated Motion */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPopover((p) => (p === "motion" ? null : "motion"))}
                    className={`flex items-center gap-1.5 rounded-full border-2 border-[#1E1B2E] px-3 py-1 text-xs font-extrabold cursor-pointer ${
                      motionPreset !== "none" ? "bg-[#FFF3C4]" : "bg-white hover:bg-[#FFFDF7]"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#E04848]" />
                    <span>
                      {isZh
                        ? MOTION_PRESETS.find((m) => m.id === motionPreset)?.zh ?? "静态"
                        : MOTION_PRESETS.find((m) => m.id === motionPreset)?.en ?? "Static"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>

                  {openPopover === "motion" && (
                    <div className="sticker-card absolute left-0 top-10 z-30 w-60 p-3 space-y-2 bg-white">
                      <div className="text-[11px] font-black">{isZh ? "选择动态效果 (GIF)" : "Motion Effect (GIF)"}</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {MOTION_PRESETS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setMotionPreset(m.id);
                              setOpenPopover(null);
                            }}
                            className={`rounded-lg border border-[#1E1B2E] py-1.5 text-[11px] font-extrabold cursor-pointer ${
                              motionPreset === m.id ? "bg-[#FFF3C4]" : "bg-white hover:bg-[#FFFDF7]"
                            }`}
                          >
                            {isZh ? m.zh : m.en}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {storeAnimatedConflict && (
                  <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[10px] font-extrabold text-[#92400E]">
                    {isZh ? `${activeStoreSpec.nameZh}投稿包当前仅导出静态` : `${activeStoreSpec.nameEn} exports static`}
                  </span>
                )}
              </div>

              {/* Right Preview Surface Switcher */}
              <div className="flex items-center gap-1">
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
                    onClick={() => setPreviewBg(bg.id)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-extrabold cursor-pointer ${
                      previewBg === bg.id
                        ? "border-[#1E1B2E] bg-[#FFF3C4]"
                        : "border-[#1E1B2E]/20 bg-white text-[#645E78] hover:border-[#1E1B2E]"
                    }`}
                  >
                    {isZh ? bg.zh : bg.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Chat Bubble Strip (when "气泡" preview is active) */}
            {previewBg === "chat" && stickers.length > 0 && (
              <div
                className={`rounded-2xl border-2 border-[#1E1B2E] p-4 space-y-2.5 transition-colors ${
                  chatDark ? "bg-[#171923] text-white" : "bg-[#EDEDED] text-[#1E1B2E]"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-extrabold">
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4 text-[#0F766E]" />
                    <span>
                      {isZh
                        ? `聊天气泡实战预览 · #${selectedChatIndex + 1}`
                        : `Chat Preview · Sticker #${selectedChatIndex + 1}`}
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

                <div className="space-y-2">
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
                        className={`h-full w-full object-contain ${
                          motionPreset !== "none" ? `sticker-anim-${motionPreset}` : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Hint */}
            <div className="flex items-center justify-between text-xs font-bold text-[#645E78]">
              <span>
                {slicing
                  ? isZh
                    ? "正在智能切分贴纸..."
                    : "Slicing stickers..."
                  : isZh
                    ? `共 ${stickers.length} 张 · 点击任意图片可精修裁切 / 改字`
                    : `${stickers.length} stickers · Click any image to polish crop or text`}
              </span>
              {slicing && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF6B6B]" />}
            </div>

            {/* Sliced Stickers Grid */}
            <div
              className={`grid gap-3.5 ${
                pack.gridSize === "4x4" ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
              }`}
            >
              {slicing && stickers.length === 0
                ? Array.from({ length: totalCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className="aspect-square animate-pulse rounded-2xl border-2 border-[#1E1B2E]/20 bg-[#FFF3C4]/40"
                    />
                  ))
                : stickers.map((sticker) => {
                    const isDownloading = downloadingIndex === sticker.index;
                    const isDownloaded = downloadedIndex === sticker.index;
                    const isCopied = copiedIndex === sticker.index;
                    const isAdjusted = Boolean(cellAdjustments[sticker.index]);
                    const isChatSelected =
                      previewBg === "chat" && selectedChatIndex === sticker.index;

                    return (
                      <div
                        key={sticker.index}
                        className={`group flex flex-col overflow-hidden rounded-2xl border-2 bg-white transition-transform hover:-translate-y-0.5 ${
                          isChatSelected
                            ? "border-[#E04848] shadow-[3px_3px_0px_#E04848]"
                            : "border-[#1E1B2E]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChatIndex(sticker.index);
                            setPolishIndex(sticker.index);
                          }}
                          className="relative aspect-square w-full p-2 cursor-pointer"
                          style={
                            previewBg === "chat"
                              ? { backgroundColor: chatDark ? "#171923" : "#EDEDED" }
                              : previewBgStyle
                          }
                          title={isZh ? "点击打开单张精修" : "Click to polish"}
                        >
                          <img
                            src={sticker.dataUrl}
                            alt={`Sticker ${sticker.index + 1}`}
                            className={`h-full w-full object-contain ${
                              motionPreset !== "none" ? `sticker-anim-${motionPreset}` : ""
                            }`}
                          />
                          <span className="absolute left-2 top-2 rounded-full border border-[#1E1B2E]/25 bg-white/90 px-2 py-0.5 text-[10px] font-black text-[#1E1B2E]">
                            #{sticker.index + 1}
                          </span>
                          {isAdjusted && (
                            <span
                              className="absolute right-2 top-2 rounded-full bg-[#FFF3C4] border border-[#1E1B2E] px-1.5 py-0.5 text-[9px] font-black"
                              title={isZh ? "已单张精修" : "Polished"}
                            >
                              <SlidersHorizontal className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-[#1E1B2E]/80 px-2 py-0.5 text-[10px] font-extrabold text-white opacity-0 transition-opacity group-hover:opacity-100">
                            {isZh ? "精修" : "Polish"}
                          </span>
                        </button>

                        <div className="flex items-center justify-between gap-1 border-t border-[#1E1B2E]/15 bg-[#FFFDF7] px-1.5 py-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopySticker(sticker.index)}
                            disabled={slicing || exportingZip}
                            className={`flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 py-1.5 text-[11px] leading-none font-extrabold transition-colors cursor-pointer disabled:opacity-60 ${
                              isCopied
                                ? "bg-[#0F766E] text-white"
                                : "bg-white text-[#1E1B2E] hover:bg-[#FFF3C4]"
                            }`}
                            title={isZh ? "复制 PNG 到剪贴板" : "Copy PNG"}
                          >
                            {isCopied ? (
                              <Check className="h-3 w-3 shrink-0" />
                            ) : (
                              <Copy className="h-3 w-3 shrink-0" />
                            )}
                            <span>{isCopied ? (isZh ? "已复制" : "Copied") : (isZh ? "复制" : "Copy")}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadSingle(sticker.index)}
                            disabled={slicing || exportingZip || isDownloading}
                            className={`flex min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 py-1.5 text-[11px] leading-none font-extrabold transition-colors cursor-pointer disabled:opacity-60 ${
                              isDownloaded
                                ? "bg-[#0F766E] text-white"
                                : "bg-white text-[#1E1B2E] hover:bg-[#B8F2E6]"
                            }`}
                            title={isZh ? "下载单张" : "Download"}
                          >
                            {isDownloading ? (
                              <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                            ) : isDownloaded ? (
                              <Check className="h-3 w-3 shrink-0" />
                            ) : (
                              <Download className="h-3 w-3 shrink-0" />
                            )}
                            <span>{isDownloaded ? (isZh ? "已存" : "Saved") : (isZh ? "下载" : "Save")}</span>
                          </button>

                          {canShare && (
                            <button
                              type="button"
                              onClick={() => handleShareSticker(sticker.index)}
                              disabled={slicing || exportingZip}
                              className="flex shrink-0 items-center justify-center rounded-lg bg-white px-1.5 py-1.5 text-[11px] font-extrabold text-[#645E78] hover:bg-[#F4EFE6] hover:text-[#1E1B2E] cursor-pointer disabled:opacity-60"
                              title={isZh ? "系统分享 / 存相册" : "Share / Save"}
                              aria-label={isZh ? "分享" : "Share"}
                            >
                              <Share2 className="h-3 w-3 shrink-0" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>

          {/* Right Sticky Export Column */}
          <aside className="sticker-card p-5 space-y-5 lg:sticky lg:top-6 h-fit">
            {/* Intent Mode Segmented Control */}
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl border-2 border-[#1E1B2E] bg-[#F4EFE6] p-1">
              <button
                type="button"
                onClick={() => setExportMode("chat")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
                  exportMode === "chat"
                    ? "bg-white text-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E]"
                    : "text-[#645E78] hover:text-[#1E1B2E]"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5 text-[#0F766E]" />
                <span>{isZh ? "日常发聊" : "Quick Chat"}</span>
              </button>
              <button
                type="button"
                onClick={handleEnterStoreMode}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
                  exportMode === "store"
                    ? "bg-white text-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E]"
                    : "text-[#645E78] hover:text-[#1E1B2E]"
                }`}
              >
                <Store className="h-3.5 w-3.5 text-[#E04848]" />
                <span>{isZh ? "平台投稿包" : "Store Pack"}</span>
              </button>
            </div>

            {exportMode === "chat" ? (
              <div className="space-y-4">
                <p className="text-xs font-bold leading-relaxed text-[#645E78]">
                  {isZh
                    ? "直接发微信、QQ、飞书群聊。保持最高清原像素，无需理会商店审核规格。"
                    : "Ready for everyday messaging. High-res stickers with zero platform complexity."}
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setMotionPreset("none")}
                    className={`flex w-full items-center justify-between rounded-2xl border-2 border-[#1E1B2E] p-3 text-left cursor-pointer ${
                      motionPreset === "none" ? "bg-[#B8F2E6]" : "bg-[#FFFDF7]"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black">
                        {isZh ? "高清原像素 PNG（推荐）" : "Native HD PNG (Recommended)"}
                      </div>
                      <div className="text-[11px] font-bold text-[#645E78]">
                        {removeBackground
                          ? isZh
                            ? "透明无底，发聊天清晰锐利"
                            : "Transparent cutout, ultra sharp"
                          : isZh
                            ? "保留原图细节与纯色背景"
                            : "Preserves original artwork details"}
                      </div>
                    </div>
                    {motionPreset === "none" && <Check className="h-4 w-4 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMotionPreset((m) => (m === "none" ? "bounce" : m))}
                    className={`flex w-full items-center justify-between rounded-2xl border-2 border-[#1E1B2E] p-3 text-left cursor-pointer ${
                      motionPreset !== "none" ? "bg-[#FFF3C4]" : "bg-[#FFFDF7]"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black">
                        {isZh ? "动态表情包 GIF（240×240）" : "Animated Sticker GIF (240×240)"}
                      </div>
                      <div className="text-[11px] font-bold text-[#645E78]">
                        {isZh ? "自适应色彩调色板，循环播放" : "Adaptive palette, looping GIF"}
                      </div>
                    </div>
                    {motionPreset !== "none" && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                </div>

                {motionPreset !== "none" && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {MOTION_PRESETS.filter((m) => m.id !== "none").map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMotionPreset(m.id)}
                        className={`rounded-xl border border-[#1E1B2E] py-1.5 text-[11px] font-extrabold cursor-pointer ${
                          motionPreset === m.id
                            ? "bg-[#FFF3C4] shadow-[2px_2px_0px_#1E1B2E]"
                            : "bg-white"
                        }`}
                      >
                        {isZh ? m.zh : m.en}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExportZip}
                  disabled={exportingZip || slicing}
                  className="sticker-btn flex w-full items-center justify-center gap-2 bg-[#FF6B6B] py-3.5 text-sm font-black text-white cursor-pointer disabled:opacity-60"
                >
                  {exportingZip ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isZh ? "正在打包 ZIP..." : "Packaging ZIP..."}</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>
                        {motionPreset !== "none"
                          ? isZh
                            ? `下载整套动图 GIF (${totalCount}张)`
                            : `Download GIF ZIP (${totalCount})`
                          : isZh
                            ? `下载整套高清 PNG (${totalCount}张)`
                            : `Download HD PNG ZIP (${totalCount})`}
                      </span>
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] font-bold text-[#645E78]">
                  {isZh
                    ? "小技巧：电脑微信聊天下直接点卡片「复制」就能 Ctrl+V 发送"
                    : "Tip: Click Copy on any card to paste straight into chat."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <StoreAssetWorkshop
                  packId={pack.id}
                  masterImageUrl={pack.masterImageUrl}
                  sliceOptions={buildSliceOptions(pack.gridSize)}
                  animated={motionPreset !== "none"}
                  stickerCount={totalCount}
                  stickers={stickers}
                  isZh={isZh}
                  isSignedIn={Boolean(session?.user)}
                  assetCreditCost={assetCreditCost}
                  platform={storePlatform}
                  discordMode={discordMode}
                  coverCellIndex={coverCellIndex}
                  iconCellIndex={iconCellIndex}
                  iconHeadCrop={iconHeadCrop}
                  iconFocusX={iconFocusX}
                  iconFocusY={iconFocusY}
                  iconZoom={iconZoom}
                  bannerCells={bannerCells}
                  bannerTemplateId={bannerTemplateId}
                  useAiCover={useAiCover}
                  useAiIcon={useAiIcon}
                  useAiBanner={useAiBanner}
                  aiAssets={aiAssets}
                  onChangePlatform={handleChangeStorePlatform}
                  onChangeDiscordMode={setDiscordMode}
                  onChangeCoverCell={(idx) => {
                    setCoverCellIndex(idx);
                    setUseAiCover(false);
                  }}
                  onChangeIconConfig={(patch) => {
                    if (patch.iconCellIndex !== undefined) {
                      setIconCellIndex(patch.iconCellIndex);
                      setUseAiIcon(false);
                    }
                    if (patch.iconHeadCrop !== undefined) setIconHeadCrop(patch.iconHeadCrop);
                    if (patch.iconFocusX !== undefined) setIconFocusX(patch.iconFocusX);
                    if (patch.iconFocusY !== undefined) setIconFocusY(patch.iconFocusY);
                    if (patch.iconZoom !== undefined) setIconZoom(patch.iconZoom);
                  }}
                  onChangeBannerConfig={(patch) => {
                    if (patch.bannerCells !== undefined) setBannerCells(patch.bannerCells);
                    if (patch.bannerTemplateId !== undefined)
                      setBannerTemplateId(patch.bannerTemplateId);
                    setUseAiBanner(false);
                  }}
                  onChangeUseAi={(kind, val) => {
                    if (kind === "cover") setUseAiCover(val);
                    else if (kind === "icon") setUseAiIcon(val);
                    else setUseAiBanner(val);
                  }}
                  onAiAssetGenerated={(kind, imageUrl) => {
                    setAiAssets((prev) => ({ ...prev, [kind]: imageUrl }));
                    if (kind === "cover") setUseAiCover(true);
                    else if (kind === "icon") setUseAiIcon(true);
                    else setUseAiBanner(true);
                  }}
                />

                <button
                  type="button"
                  onClick={handleExportZip}
                  disabled={exportingZip || slicing}
                  className="sticker-btn flex w-full items-center justify-center gap-2 bg-[#FF6B6B] py-3.5 text-sm font-black text-white cursor-pointer disabled:opacity-60"
                >
                  {exportingZip ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isZh ? "正在按平台规范打包压缩..." : "Compressing & Packaging..."}</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>
                        {isZh
                          ? `导出${activeStoreSpec.nameZh.replace("开放平台", "")}规范包`
                          : `Export ${activeStoreSpec.nameEn} Bundle`}
                      </span>
                    </>
                  )}
                </button>

                {lastStoreResult && (
                  <div className="rounded-xl border border-[#0F766E]/35 bg-[#E8FAF8] px-3 py-2 text-[11px] font-bold text-[#0F766E]">
                    {isZh
                      ? `已导出 ${lastStoreResult.fileCount} 个文件 · 单文件最大 ${Math.round(lastStoreResult.maxFileBytes / 1024)}KB${lastStoreResult.allWithinLimits ? " · 全部符合体积上限 ✅" : ""}`
                      : `Exported ${lastStoreResult.fileCount} files · Max ${Math.round(lastStoreResult.maxFileBytes / 1024)}KB`}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Per-Sticker Quick Polish Modal */}
      {pack.status === "COMPLETED" && pack.masterImageUrl && (
        <StickerPolishModal
          isZh={isZh}
          stickerIndex={polishIndex}
          totalCount={totalCount}
          masterImageUrl={pack.masterImageUrl}
          gridSize={pack.gridSize}
          sliceOptions={buildSliceOptions(pack.gridSize)}
          motionPreset={motionPreset}
          caption={polishIndex !== null ? (overlayCaptions[polishIndex] ?? "") : ""}
          overlayEnabled={overlayEnabled}
          previewBg={previewBg}
          chatDark={chatDark}
          downloading={polishIndex !== null && downloadingIndex === polishIndex}
          downloaded={polishIndex !== null && downloadedIndex === polishIndex}
          copied={polishIndex !== null && copiedIndex === polishIndex}
          canShare={canShare}
          isCover={polishIndex !== null && !useAiCover && coverCellIndex === polishIndex}
          isIcon={polishIndex !== null && !useAiIcon && iconCellIndex === polishIndex}
          onClose={() => setPolishIndex(null)}
          onSelectIndex={(idx) => {
            setPolishIndex(idx);
            setSelectedChatIndex(idx);
          }}
          onChangePreviewBg={setPreviewBg}
          onToggleChatDark={() => setChatDark((d) => !d)}
          onUpdateAdjustment={(idx, patch) => {
            setCellAdjustments((prev) => {
              const next = { ...prev };
              if (patch === null) {
                delete next[idx];
              } else {
                next[idx] = patch;
              }
              return next;
            });
          }}
          onUpdateCaption={(idx, val) => {
            setOverlayCaptions((prev) => {
              const next = [...prev];
              next[idx] = val;
              return next;
            });
          }}
          onEnableOverlay={() => setOverlayEnabled(true)}
          onDownloadSingle={handleDownloadSingle}
          onCopySticker={handleCopySticker}
          onShareSticker={handleShareSticker}
          onSetAsCover={(idx) => {
            setCoverCellIndex(idx);
            setUseAiCover(false);
          }}
          onSetAsIcon={(idx) => {
            setIconCellIndex(idx);
            setUseAiIcon(false);
          }}
        />
      )}
    </div>
  );
}
