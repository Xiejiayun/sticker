"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Star,
  Type,
} from "lucide-react";
import { BRAND } from "@/config/brand";
import {
  extractAnimatedClipGroups,
  type AnimationLoopMode,
  type SpriteAlignMode,
} from "@/config/animations";
import { getStylePresetById } from "@/config/styles";
import { getThemeDisplayName } from "@/config/themes";
import type { GridSize, StickerPackStatus, StickerSlotSnapshot } from "@/db/schema";
import {
  SPRITE_EXPORT_PLATFORMS,
  exportAllSpriteClipsZip,
  exportSpriteClipForPlatform,
  renderSpriteClipPreview,
  type PerFrameOverride,
  type RenderedSpriteClipPreview,
  type SpriteCaptionConfig,
  type SpriteClipRenderOptions,
  type SpriteExportPlatformId,
} from "@/lib/slicer/sprite-animator";
import type { PreviewBg } from "./StickerPolishModal";

export interface SpritePackDetail {
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

interface ClipEditorState {
  fps: number;
  loopMode: AnimationLoopMode;
  alignMode: SpriteAlignMode;
  coverFrameIndex: number;
  frameOverrides: Record<number, PerFrameOverride>;
  captionEnabled: boolean;
  captionText: string;
  captionStyle: SpriteCaptionConfig["style"];
  captionPosition: SpriteCaptionConfig["position"];
}

const CHECKER_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #e5e5e5 25%, transparent 25%), linear-gradient(-45deg, #e5e5e5 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e5e5 75%), linear-gradient(-45deg, transparent 75%, #e5e5e5 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
  backgroundColor: "#ffffff",
};

const ALIGN_MODES: Array<{ id: SpriteAlignMode; zh: string; en: string; hintZh: string; hintEn: string }> = [
  { id: "ncc", zh: "自动稳像", en: "Auto NCC", hintZh: "互相关搜索消除 AI 帧间微抖动", hintEn: "Auto-cancels AI frame drift" },
  { id: "bottom-center", zh: "锁底对齐", en: "Lock Base", hintZh: "锁死脚底与中轴，适合站立挥手跳舞", hintEn: "Locks feet & center baseline" },
  { id: "centroid", zh: "重心对齐", en: "Centroid", hintZh: "按像素重心对齐，抗挥手外框拉扯", hintEn: "Aligns alpha center of mass" },
  { id: "none", zh: "原始网格", en: "Raw Grid", hintZh: "保留原宫格位置，不做平移稳像", hintEn: "No automatic shift" },
];

const PLATFORM_ORDER: SpriteExportPlatformId[] = ["wechat", "line", "discord", "slack", "hd-gif"];

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

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function SpritePackExporter({
  pack,
  justCompleted = false,
  onStartNew,
}: {
  pack: SpritePackDetail;
  justCompleted?: boolean;
  onStartNew?: () => void;
}) {
  const locale = useLocale();
  const isZh = locale === "zh";

  const clipGroups = useMemo(
    () => extractAnimatedClipGroups(pack.themeId, pack.gridSize, pack.slotsConfig),
    [pack.themeId, pack.gridSize, pack.slotsConfig]
  );

  // Global cutout & seam controls (transparent + subtle 4px white border ON by default for WeChat dark mode!)
  const [removeBackground, setRemoveBackground] = useState(true);
  const [tolerance, setTolerance] = useState(32);
  const [whiteBorderPx, setWhiteBorderPx] = useState(4);
  const [smartSeam, setSmartSeam] = useState(true);

  // Preview stage surface & playback
  const [previewBg, setPreviewBg] = useState<PreviewBg>("chat");
  const [chatDark, setChatDark] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [inspectFrameIdx, setInspectFrameIdx] = useState<number | null>(null);
  const [showOnionSkin, setShowOnionSkin] = useState(true);
  const [exportPlatform, setExportPlatform] = useState<SpriteExportPlatformId>("wechat");

  // Per-clip editor states
  const [clipStates, setClipStates] = useState<ClipEditorState[]>(() =>
    clipGroups.map((g) => ({
      fps: g.defaultFps,
      loopMode: g.defaultLoopMode,
      alignMode: "ncc",
      coverFrameIndex: 0,
      frameOverrides: {},
      captionEnabled: Boolean(g.caption.trim()),
      captionText: g.caption,
      captionStyle: "bold-pop",
      captionPosition: "bottom",
    }))
  );

  // Rendered previews per clip
  const [previews, setPreviews] = useState<Array<RenderedSpriteClipPreview | null>>([]);
  const [rendering, setRendering] = useState(true);
  const [playTick, setPlayTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportingSingle, setExportingSingle] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [lastExportReport, setLastExportReport] = useState<{
    filename: string;
    bytes: number;
    frameCount: number;
    withinBudget: boolean;
    hasThumb?: boolean;
  } | null>(null);

  const safeGroupIdx = Math.min(activeGroupIdx, Math.max(0, clipGroups.length - 1));
  const activeGroup = clipGroups[safeGroupIdx] ?? clipGroups[0];
  const activeState = clipStates[safeGroupIdx] ?? clipStates[0];
  const activePreview = previews[safeGroupIdx] ?? null;

  function updateActiveClip(patch: Partial<ClipEditorState>) {
    setClipStates((prev) =>
      prev.map((st, idx) => (idx === safeGroupIdx ? { ...st, ...patch } : st))
    );
  }

  function updateFrameOverride(frameIdx: number, patch: PerFrameOverride | null) {
    setClipStates((prev) =>
      prev.map((st, idx) => {
        if (idx !== safeGroupIdx) return st;
        const nextOverrides = { ...st.frameOverrides };
        if (patch === null) {
          delete nextOverrides[frameIdx];
        } else {
          nextOverrides[frameIdx] = { ...nextOverrides[frameIdx], ...patch };
        }
        return { ...st, frameOverrides: nextOverrides };
      })
    );
  }

  function buildClipOptions(groupIndex: number): SpriteClipRenderOptions {
    const group = clipGroups[groupIndex];
    const st = clipStates[groupIndex];
    return {
      gridSize: pack.gridSize,
      cellIndices: group.cellIndices,
      removeBackground,
      tolerance,
      whiteBorderPx,
      smartSeam,
      alignMode: st.alignMode,
      fps: st.fps,
      loopMode: st.loopMode,
      frameOverrides: st.frameOverrides,
      caption: st.captionEnabled
        ? {
            enabled: true,
            text: st.captionText,
            style: st.captionStyle,
            position: st.captionPosition,
          }
        : undefined,
    };
  }

  // Re-render stabilized clip previews whenever sheet or settings change
  useEffect(() => {
    if (!pack.masterImageUrl) return;
    let cancelled = false;
    setRendering(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const rendered = await Promise.all(
          clipGroups.map((_, gIdx) =>
            renderSpriteClipPreview(
              pack.masterImageUrl!,
              buildClipOptions(gIdx),
              clipGroups.length > 1 ? 240 : 300
            )
          )
        );
        if (!cancelled) setPreviews(rendered);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to slice sprite sheet");
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.masterImageUrl, pack.gridSize, removeBackground, tolerance, whiteBorderPx, smartSeam, clipStates]);

  // Real-time frame animation clock (uses active clip's per-frame delay when playing)
  useEffect(() => {
    if (!playing || inspectFrameIdx !== null) return;
    const seq = activePreview?.playbackSequence;
    const activeFramePos = seq && seq.length > 0 ? seq[playTick % seq.length] : 0;
    const delayMs =
      activePreview?.frames[activeFramePos]?.delayMs ??
      Math.max(50, Math.round(1000 / Math.max(4, activeState?.fps ?? 8)));

    const timer = setTimeout(() => {
      setPlayTick((t) => t + 1);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [playing, inspectFrameIdx, playTick, activePreview, activeState?.fps]);

  const activeSequence = activePreview?.playbackSequence ?? [];
  const currentFrameIdx =
    inspectFrameIdx !== null
      ? inspectFrameIdx
      : activeSequence.length > 0
        ? activeSequence[playTick % activeSequence.length]
        : 0;

  const prevEnabledFrameIdx = useMemo(() => {
    if (!activePreview || activePreview.frames.length < 2) return null;
    const enabled = activePreview.frames.filter((f) => f.enabled).map((f) => f.frameIndex);
    if (enabled.length < 2) return null;
    const pos = enabled.indexOf(currentFrameIdx);
    if (pos <= 0) return enabled[enabled.length - 1];
    return enabled[pos - 1];
  }, [activePreview, currentFrameIdx]);

  async function handleDownloadCurrentClip() {
    if (!pack.masterImageUrl) return;
    setExportingSingle(true);
    setError(null);
    setLastExportReport(null);
    try {
      const opts = buildClipOptions(safeGroupIdx);
      const exported = await exportSpriteClipForPlatform(
        pack.masterImageUrl,
        opts,
        exportPlatform,
        activeState.coverFrameIndex
      );
      const safeTitle = (activeState.captionText || activeGroup.titleZh)
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, "")
        .slice(0, 12);
      const filename = `${BRAND.downloadPrefix}_anim_${exportPlatform}_${safeGroupIdx + 1}${safeTitle ? `_${safeTitle}` : ""}.${exported.ext}`;
      triggerDownload(exported.blob, filename);
      setLastExportReport({
        filename,
        bytes: exported.bytes,
        frameCount: exported.frameCount,
        withinBudget: exported.withinBudget,
        hasThumb: Boolean(exported.thumbnailBlob),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingSingle(false);
    }
  }

  async function handleDownloadWeChatThumb() {
    if (!pack.masterImageUrl) return;
    setExportingSingle(true);
    setError(null);
    try {
      const opts = buildClipOptions(safeGroupIdx);
      const exported = await exportSpriteClipForPlatform(
        pack.masterImageUrl,
        opts,
        "wechat",
        activeState.coverFrameIndex
      );
      if (exported.thumbnailBlob) {
        triggerDownload(
          exported.thumbnailBlob,
          `${BRAND.downloadPrefix}_thumb_120x120_${safeGroupIdx + 1}.png`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thumbnail export failed");
    } finally {
      setExportingSingle(false);
    }
  }

  async function handleDownloadAllZip() {
    if (!pack.masterImageUrl) return;
    setExportingZip(true);
    setError(null);
    setLastExportReport(null);
    try {
      const clipInputs = clipGroups.map((g, idx) => ({
        name: clipStates[idx]?.captionText || (isZh ? g.titleZh : g.titleEn),
        options: buildClipOptions(idx),
        coverFrameIndex: clipStates[idx]?.coverFrameIndex ?? 0,
      }));
      const { blob, summary } = await exportAllSpriteClipsZip(
        pack.masterImageUrl,
        clipInputs,
        exportPlatform
      );
      const filename = `${BRAND.downloadPrefix}_animated_${exportPlatform}_${clipGroups.length}clips_${pack.id.slice(0, 6)}.zip`;
      triggerDownload(blob, filename);
      const totalBytes = summary.reduce((s, item) => s + item.bytes, 0);
      setLastExportReport({
        filename,
        bytes: totalBytes,
        frameCount: summary[0]?.frameCount ?? activeSequence.length,
        withinBudget: summary.every((item) => item.withinBudget),
        hasThumb: exportPlatform === "wechat",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ZIP export failed");
    } finally {
      setExportingZip(false);
    }
  }

  const style = getStylePresetById(pack.styleId);
  const themeDisplayName = getThemeDisplayName(pack.themeId, isZh);
  const activeSpec = SPRITE_EXPORT_PLATFORMS[exportPlatform];
  const cycleDurationSec = useMemo(() => {
    if (!activePreview || activeSequence.length === 0) return 0;
    const ms = activeSequence.reduce(
      (sum, fIdx) => sum + (activePreview.frames[fIdx]?.delayMs ?? 100),
      0
    );
    return ms / 1000;
  }, [activePreview, activeSequence]);

  const surfaceStyle: React.CSSProperties =
    previewBg === "checker"
      ? CHECKER_STYLE
      : previewBg === "dark"
        ? { backgroundColor: "#1E1B2E" }
        : previewBg === "chat"
          ? { backgroundColor: chatDark ? "#171923" : "#EDEDED" }
          : { backgroundColor: "#EDEDED" };

  const inspectedOverride =
    inspectFrameIdx !== null ? activeState.frameOverrides[inspectFrameIdx] ?? {} : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-5 pb-20">
      {justCompleted && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-[#0F766E] bg-[#E8FAF8] px-4 py-2.5 text-xs sm:text-sm font-extrabold text-[#0F766E]"
          data-testid="generation-complete"
          role="status"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {isZh
              ? `逐帧动图已自动切分并完成稳像对齐！共 ${clipGroups.length} 个真动图，可直接导出微信 GIF（≤500KB）或 LINE APNG。`
              : `Sprite sheet sliced & auto-stabilized into ${clipGroups.length} animated sticker(s)! Ready for WeChat GIF & LINE APNG export.`}
          </span>
          {onStartNew && (
            <button
              type="button"
              onClick={onStartNew}
              className="inline-flex items-center gap-1 rounded-full border border-[#0F766E] bg-white px-3 py-1 text-xs font-black text-[#0F766E] hover:bg-[#D4FAF4] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isZh ? "再画一套动图" : "Create Another"}</span>
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
            <Film className="h-6 w-6 text-[#E04848]" />
            <span>{isZh ? "AI 逐帧动图稳像与导出工坊" : "Animated Sprite Stabilizer & Exporter"}</span>
          </h1>
          <p className="text-xs font-bold text-[#645E78]">
            {style ? (isZh ? style.nameZh : style.nameEn) : pack.styleId} · {themeDisplayName} ·{" "}
            {clipGroups.length > 1
              ? isZh
                ? "4 个独立 4 帧动图"
                : "4 independent 4-frame clips"
              : isZh
                ? "1 个 9 帧精绘长动图"
                : "1 smooth 9-frame clip"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pack.masterImageUrl && (
            <a
              href={pack.masterImageUrl}
              download={`${BRAND.downloadPrefix}_spritesheet_${pack.id.slice(0, 6)}.png`}
              target="_blank"
              rel="noreferrer"
              className="sticker-btn inline-flex items-center gap-2 bg-white px-4 py-2 text-xs font-extrabold"
            >
              <ImageIcon className="h-4 w-4" />
              <span>{isZh ? "保存序列帧原图" : "Save Sprite Sheet"}</span>
            </a>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border-2 border-[#C93636] bg-[#FFF0F0] p-4 text-sm font-bold text-[#C93636]">
          {error}
        </div>
      )}

      {/* Quad Selector Grid (for 4x4 4-in-1 packs) */}
      {clipGroups.length > 1 && (
        <div className="sticker-card p-4 space-y-3 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-[#1E1B2E]">
              {isZh ? "🎬 本次 4 合 1 生成的 4 个动图（点击切换精修）" : "🎬 4 Animated Stickers in This Sheet (Click to Edit)"}
            </span>
            <span className="text-[11px] font-bold text-[#0F766E]">
              {isZh ? "每个均已独立稳像，可单张导出或右侧一键打包" : "Each stabilized independently · Export individually or as ZIP"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {clipGroups.map((group, idx) => {
              const p = previews[idx];
              const seq = p?.playbackSequence ?? [];
              const fIdx = seq.length > 0 ? seq[playTick % seq.length] : 0;
              const imgUrl = p?.frames[fIdx]?.dataUrl;
              const selected = idx === safeGroupIdx;
              return (
                <button
                  key={group.groupIndex}
                  type="button"
                  onClick={() => {
                    setActiveGroupIdx(idx);
                    setInspectFrameIdx(null);
                  }}
                  className={`sticker-panel p-2.5 text-left transition-all cursor-pointer ${
                    selected ? "sticker-panel-active -translate-y-0.5" : "bg-[#FFFDF7] hover:bg-white"
                  }`}
                >
                  <div
                    className="relative aspect-square w-full overflow-hidden rounded-xl border border-[#1E1B2E]/20 flex items-center justify-center p-2"
                    style={previewBg === "dark" ? { backgroundColor: "#1E1B2E" } : previewBg === "checker" ? CHECKER_STYLE : { backgroundColor: "#EDEDED" }}
                  >
                    {imgUrl ? (
                      <img src={imgUrl} alt={group.titleEn} className="h-full w-full object-contain" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-[#E04848]" />
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-black border border-[#1E1B2E]/30">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-black">
                      {group.emoji} {isZh ? group.titleZh : group.titleEn}
                    </span>
                    <span className="shrink-0 text-[10px] font-extrabold text-[#0F766E]">
                      {seq.length || group.cellIndices.length}{isZh ? "帧" : "f"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Two-Column Workbench */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* Left Column: Stage + Stabilizer + Filmstrip */}
        <div className="space-y-5">
          {/* Live Stage Card */}
          <div className="sticker-card p-4 sm:p-5 space-y-4 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E1B2E]/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-2.5 py-0.5 text-xs font-black">
                  {activeGroup.emoji} {isZh ? activeGroup.titleZh : activeGroup.titleEn}
                </span>
                <span className="text-xs font-bold text-[#645E78] tabular-nums">
                  {activeSequence.length} {isZh ? "帧" : "frames"} · {activeState.fps} FPS · {cycleDurationSec.toFixed(2)}s
                </span>
              </div>

              {/* Surface switcher */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "chat", zh: "气泡", en: "Chat" },
                    { id: "wechat", zh: "微信灰", en: "Light" },
                    { id: "dark", zh: "深色", en: "Dark" },
                    { id: "checker", zh: "透明格", en: "Grid" },
                  ] as const
                ).map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setPreviewBg(bg.id)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-extrabold cursor-pointer ${
                      previewBg === bg.id
                        ? "border-[#1E1B2E] bg-[#FFF3C4]"
                        : "border-[#1E1B2E]/20 bg-white hover:bg-[#FAF8F3]"
                    }`}
                  >
                    {isZh ? bg.zh : bg.en}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[280px_1fr] items-start">
              {/* Preview Box */}
              <div className="space-y-2.5">
                <div
                  className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-[#1E1B2E]"
                  style={surfaceStyle}
                >
                  {previewBg === "chat" && inspectFrameIdx === null ? (
                    <div className="flex h-full flex-col justify-between p-3.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-extrabold ${
                            chatDark ? "text-white/75" : "text-[#645E78]"
                          }`}
                        >
                          <MessageCircle className="h-3.5 w-3.5 text-[#0F766E]" />
                          {isZh ? "微信聊天实景" : "Chat Preview"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setChatDark((d) => !d)}
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
                            {isZh ? "新做的动图发来看看！" : "Drop that animated sticker!"}
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="h-36 w-36 p-1">
                            {activePreview?.frames[currentFrameIdx]?.dataUrl && (
                              <img
                                src={activePreview.frames[currentFrameIdx].dataUrl}
                                alt="Animated Preview"
                                className="h-full w-full object-contain"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex h-full w-full items-center justify-center p-4">
                      {/* Onion-skin ghost of previous frame when inspecting */}
                      {inspectFrameIdx !== null &&
                        showOnionSkin &&
                        prevEnabledFrameIdx !== null &&
                        activePreview?.frames[prevEnabledFrameIdx]?.dataUrl && (
                          <img
                            src={activePreview.frames[prevEnabledFrameIdx].dataUrl}
                            alt="Previous frame onion skin"
                            className="pointer-events-none absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] object-contain opacity-30 mix-blend-multiply"
                          />
                        )}
                      {activePreview?.frames[currentFrameIdx]?.dataUrl && (
                        <img
                          src={activePreview.frames[currentFrameIdx].dataUrl}
                          alt="Current frame"
                          className="relative z-10 h-full w-full object-contain"
                        />
                      )}
                    </div>
                  )}

                  {rendering && (
                    <div className="absolute right-2.5 top-2.5 rounded-full bg-white/95 p-1.5 shadow">
                      <Loader2 className="h-4 w-4 animate-spin text-[#E04848]" />
                    </div>
                  )}

                  <span className="absolute bottom-2 left-2 rounded-full bg-[#1E1B2E]/80 px-2 py-0.5 text-[10px] font-black text-white tabular-nums">
                    {inspectFrameIdx !== null
                      ? `${isZh ? "精修第" : "Edit F"}${inspectFrameIdx + 1}`
                      : `F${currentFrameIdx + 1}/${activeGroup.cellIndices.length}`}
                  </span>
                </div>

                {/* Play/Pause & Onion-skin bar */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (inspectFrameIdx !== null) {
                        setInspectFrameIdx(null);
                        setPlaying(true);
                      } else {
                        setPlaying((p) => !p);
                      }
                    }}
                    className="sticker-btn flex flex-1 items-center justify-center gap-1.5 bg-[#FFF3C4] py-1.5 text-xs font-black cursor-pointer"
                  >
                    {playing && inspectFrameIdx === null ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        <span>{isZh ? "暂停播放" : "Pause"}</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>{isZh ? "播放预览" : "Play Loop"}</span>
                      </>
                    )}
                  </button>

                  {inspectFrameIdx !== null && (
                    <button
                      type="button"
                      onClick={() => setShowOnionSkin((v) => !v)}
                      className={`rounded-full border-2 border-[#1E1B2E] px-3 py-1.5 text-xs font-extrabold cursor-pointer ${
                        showOnionSkin ? "bg-[#B8F2E6]" : "bg-white"
                      }`}
                    >
                      {isZh ? "洋葱皮" : "Onion"}
                    </button>
                  )}
                </div>
              </div>

              {/* Right Controls Inside Stage Card */}
              <div className="space-y-4">
                {/* 1. Alignment & Stabilization */}
                <div className="rounded-2xl border border-[#1E1B2E]/15 bg-[#FAF8F3] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-[#0F766E]" />
                      <span>{isZh ? "跨帧稳像对齐（防鬼畜抖动）" : "Cross-Frame Stabilizer"}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {ALIGN_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateActiveClip({ alignMode: m.id })}
                        title={isZh ? m.hintZh : m.hintEn}
                        className={`rounded-xl border px-2 py-1.5 text-[11px] font-extrabold cursor-pointer transition-colors ${
                          activeState.alignMode === m.id
                            ? "border-2 border-[#1E1B2E] bg-[#0F766E] text-white"
                            : "border-[#1E1B2E]/20 bg-white text-[#1E1B2E] hover:bg-[#FFF3C4]"
                        }`}
                      >
                        {isZh ? m.zh : m.en}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] font-medium text-[#645E78]">
                    {isZh
                      ? ALIGN_MODES.find((m) => m.id === activeState.alignMode)?.hintZh
                      : ALIGN_MODES.find((m) => m.id === activeState.alignMode)?.hintEn}
                  </p>
                </div>

                {/* 2. Speed (FPS) & Loop Mode */}
                <div className="rounded-2xl border border-[#1E1B2E]/15 bg-[#FAF8F3] p-3.5 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-black">
                      <span>{isZh ? "播放帧率（FPS）" : "Playback Speed (FPS)"}</span>
                      <span className="tabular-nums text-[#E04848]">{activeState.fps} FPS</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={16}
                      step={1}
                      value={activeState.fps}
                      onChange={(e) => updateActiveClip({ fps: Number(e.target.value) })}
                      className="w-full accent-[#E04848] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-bold text-[#645E78]">
                      <span>4 FPS ({isZh ? "慢速呆萌" : "Slow"})</span>
                      <span>8–10 FPS ({isZh ? "微信推荐" : "WeChat Ideal"})</span>
                      <span>16 FPS ({isZh ? "魔性加速" : "Fast"})</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => updateActiveClip({ loopMode: "loop" })}
                      className={`rounded-xl border py-1.5 text-xs font-extrabold cursor-pointer ${
                        activeState.loopMode === "loop"
                          ? "border-2 border-[#1E1B2E] bg-[#FFF3C4]"
                          : "border-[#1E1B2E]/20 bg-white text-[#645E78]"
                      }`}
                    >
                      🔁 {isZh ? "正向循环 (1→N)" : "Forward Loop"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateActiveClip({ loopMode: "pingpong" })}
                      className={`rounded-xl border py-1.5 text-xs font-extrabold cursor-pointer ${
                        activeState.loopMode === "pingpong"
                          ? "border-2 border-[#1E1B2E] bg-[#FFF3C4]"
                          : "border-[#1E1B2E]/20 bg-white text-[#645E78]"
                      }`}
                    >
                      ↔️ {isZh ? "往返丝滑 (Ping-Pong)" : "Ping-Pong Loop"}
                    </button>
                  </div>
                </div>

                {/* 3. Cutout & Dark-Mode White Border */}
                <div className="rounded-2xl border border-[#1E1B2E]/15 bg-[#FAF8F3] p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs font-black cursor-pointer">
                      <Layers className="h-3.5 w-3.5 text-[#0F766E]" />
                      <input
                        type="checkbox"
                        checked={removeBackground}
                        onChange={(e) => setRemoveBackground(e.target.checked)}
                        className="h-4 w-4 accent-[#E04848]"
                      />
                      <span>{isZh ? "透明背景抠图" : "Transparent Cutout"}</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#645E78] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smartSeam}
                        onChange={(e) => setSmartSeam(e.target.checked)}
                        className="h-3.5 w-3.5 accent-[#0F766E]"
                      />
                      <span>{isZh ? "智能寻缝" : "Smart Seam"}</span>
                    </label>
                  </div>

                  {removeBackground && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>{isZh ? "抠图容差" : "Tolerance"}</span>
                          <span className="tabular-nums text-[#645E78]">{tolerance}</span>
                        </div>
                        <input
                          type="range"
                          min={8}
                          max={72}
                          value={tolerance}
                          onChange={(e) => setTolerance(Number(e.target.value))}
                          className="w-full accent-[#E04848] cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>{isZh ? "深色模式白边" : "White Rim"}</span>
                          <span className="tabular-nums text-[#645E78]">{whiteBorderPx}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={16}
                          value={whiteBorderPx}
                          onChange={(e) => setWhiteBorderPx(Number(e.target.value))}
                          className="w-full accent-[#E04848] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Zero-Flicker Static Caption Layer */}
                <div className="rounded-2xl border border-[#1E1B2E]/15 bg-[#FAF8F3] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-black cursor-pointer">
                      <Type className="h-3.5 w-3.5 text-[#E04848]" />
                      <input
                        type="checkbox"
                        checked={activeState.captionEnabled}
                        onChange={(e) => updateActiveClip({ captionEnabled: e.target.checked })}
                        className="h-4 w-4 accent-[#E04848]"
                      />
                      <span>{isZh ? "叠加无闪烁花字" : "Flicker-Free Text Overlay"}</span>
                    </label>
                    <div className="flex items-center gap-1">
                      {(["bold-pop", "bubble", "neon-dark"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => updateActiveClip({ captionStyle: st, captionEnabled: true })}
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-extrabold cursor-pointer ${
                            activeState.captionStyle === st
                              ? "border-[#1E1B2E] bg-[#FFF3C4]"
                              : "border-[#1E1B2E]/20 bg-white"
                          }`}
                        >
                          {st === "bold-pop"
                            ? isZh ? "白字" : "Pop"
                            : st === "bubble"
                              ? isZh ? "气泡" : "Pill"
                              : isZh ? "亮黄" : "Gold"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    maxLength={12}
                    value={activeState.captionText}
                    onChange={(e) =>
                      updateActiveClip({
                        captionText: e.target.value,
                        captionEnabled: e.target.value.trim().length > 0 ? true : activeState.captionEnabled,
                      })
                    }
                    placeholder={isZh ? "输入表情文字（纯前端叠加，绝不闪烁乱码）" : "Optional crisp caption..."}
                    className="w-full rounded-xl border border-[#1E1B2E]/25 bg-white px-3 py-1.5 text-xs font-bold outline-none focus:border-[#1E1B2E]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filmstrip & Per-Frame Onion-Skin Fine-Tuning */}
          <div className="sticker-card p-4 sm:p-5 space-y-4 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black">
                  {isZh ? "🎞️ 逐帧时间轴（点任意帧开启洋葱皮微调，或隐藏画崩废帧）" : "🎞️ Frame Filmstrip (Click to Polish with Onion-Skin or Skip Bad Frames)"}
                </h2>
                <p className="text-[11px] font-medium text-[#645E78]">
                  {isZh
                    ? "星标帧将作为微信 120×120 静态缩略图与 LINE 商城封面帧。"
                    : "The starred frame is used for WeChat 120×120 thumbnails & LINE preview."}
                </p>
              </div>
              {inspectFrameIdx !== null && (
                <button
                  type="button"
                  onClick={() => setInspectFrameIdx(null)}
                  className="rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-3 py-1 text-xs font-black cursor-pointer"
                >
                  {isZh ? "退出单帧精修 · 恢复播放" : "Done Editing · Resume"}
                </button>
              )}
            </div>

            <div className={`grid gap-2.5 ${activeGroup.cellIndices.length > 4 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
              {(activePreview?.frames ?? []).map((frame) => {
                const isInspected = inspectFrameIdx === frame.frameIndex;
                const isPlayingNow = inspectFrameIdx === null && currentFrameIdx === frame.frameIndex;
                const isCover = activeState.coverFrameIndex === frame.frameIndex;
                return (
                  <div
                    key={frame.frameIndex}
                    className={`rounded-xl border-2 p-2 space-y-1.5 transition-all ${
                      isInspected
                        ? "border-[#E04848] bg-[#FFF0F0]"
                        : isPlayingNow
                          ? "border-[#0F766E] bg-[#E8FAF8]"
                          : frame.enabled
                            ? "border-[#1E1B2E]/20 bg-[#FFFDF7]"
                            : "border-dashed border-[#1E1B2E]/20 bg-neutral-100 opacity-55"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setInspectFrameIdx(isInspected ? null : frame.frameIndex)}
                      className="relative block aspect-square w-full overflow-hidden rounded-lg border border-[#1E1B2E]/15 cursor-pointer"
                      style={CHECKER_STYLE}
                    >
                      <img
                        src={frame.dataUrl}
                        alt={`Frame ${frame.frameIndex + 1}`}
                        className="h-full w-full object-contain p-1"
                      />
                      <span className="absolute left-1 top-1 rounded bg-[#1E1B2E]/80 px-1.5 py-0.5 text-[10px] font-black text-white">
                        F{frame.frameIndex + 1}
                      </span>
                    </button>

                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateFrameOverride(frame.frameIndex, { enabled: !frame.enabled })
                        }
                        title={frame.enabled ? (isZh ? "跳过此帧" : "Skip frame") : (isZh ? "启用此帧" : "Enable frame")}
                        className="inline-flex items-center gap-1 rounded-md border border-[#1E1B2E]/20 bg-white px-1.5 py-0.5 text-[10px] font-bold hover:bg-[#FFF3C4] cursor-pointer"
                      >
                        {frame.enabled ? <Eye className="h-3 w-3 text-[#0F766E]" /> : <EyeOff className="h-3 w-3 text-[#C93636]" />}
                        <span>{frame.enabled ? (isZh ? "启用" : "On") : (isZh ? "跳过" : "Off")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateActiveClip({ coverFrameIndex: frame.frameIndex })}
                        title={isZh ? "设为缩略图封面帧" : "Set as thumbnail frame"}
                        className={`rounded-md border p-1 cursor-pointer ${
                          isCover
                            ? "border-[#1E1B2E] bg-[#FFD166] text-[#1E1B2E]"
                            : "border-[#1E1B2E]/20 bg-white text-[#645E78] hover:text-[#1E1B2E]"
                        }`}
                      >
                        <Star className="h-3 w-3" fill={isCover ? "currentColor" : "none"} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Per-Frame Micro-Adjustment Panel */}
            {inspectFrameIdx !== null && inspectedOverride && (
              <div className="rounded-2xl border-2 border-[#E04848]/40 bg-[#FFFDF7] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#E04848]">
                    {isZh
                      ? `🧅 第 ${inspectFrameIdx + 1} 帧洋葱皮微调（叠加前序帧残影对齐）`
                      : `🧅 Frame #${inspectFrameIdx + 1} Onion-Skin Micro-Nudge`}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateFrameOverride(inspectFrameIdx, null)}
                    className="inline-flex items-center gap-1 rounded-full border border-[#1E1B2E]/25 bg-white px-2.5 py-0.5 text-[11px] font-bold hover:bg-[#FFF3C4] cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>{isZh ? "重置本帧" : "Reset Frame"}</span>
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span>{isZh ? "左右微移" : "Shift X"}</span>
                      <span className="tabular-nums">{inspectedOverride.offsetX ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={30}
                      step={1}
                      value={inspectedOverride.offsetX ?? 0}
                      onChange={(e) =>
                        updateFrameOverride(inspectFrameIdx, { offsetX: Number(e.target.value) })
                      }
                      className="w-full accent-[#E04848] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span>{isZh ? "上下微移" : "Shift Y"}</span>
                      <span className="tabular-nums">{inspectedOverride.offsetY ?? 0}px</span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={30}
                      step={1}
                      value={inspectedOverride.offsetY ?? 0}
                      onChange={(e) =>
                        updateFrameOverride(inspectFrameIdx, { offsetY: Number(e.target.value) })
                      }
                      className="w-full accent-[#E04848] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span>{isZh ? "微缩放" : "Scale"}</span>
                      <span className="tabular-nums">
                        {Math.round((inspectedOverride.scale ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.85}
                      max={1.15}
                      step={0.01}
                      value={inspectedOverride.scale ?? 1}
                      onChange={(e) =>
                        updateFrameOverride(inspectFrameIdx, { scale: Number(e.target.value) })
                      }
                      className="w-full accent-[#E04848] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span>{isZh ? "停留时长" : "Hold ms"}</span>
                      <span className="tabular-nums">
                        {inspectedOverride.delayMs ?? Math.round(1000 / activeState.fps)}ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={500}
                      step={20}
                      value={inspectedOverride.delayMs ?? Math.round(1000 / activeState.fps)}
                      onChange={(e) =>
                        updateFrameOverride(inspectFrameIdx, { delayMs: Number(e.target.value) })
                      }
                      className="w-full accent-[#E04848] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Multi-Platform Export Drawer */}
        <aside className="sticker-card p-4 sm:p-5 space-y-4 bg-white lg:sticky lg:top-20">
          <div className="space-y-1">
            <h2 className="text-base font-black flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#E04848]" />
              <span>{isZh ? "动图多平台合规导出" : "Animated Platform Export"}</span>
            </h2>
            <p className="text-[11px] font-medium text-[#645E78]">
              {isZh
                ? "自动按目标平台校准分辨率、循环方式、帧数与体积上限（零算力纯本地编码）。"
                : "Auto-fits resolution, loop flags, frame timing, and byte budget locally in your browser."}
            </p>
          </div>

          {/* Platform Cards */}
          <div className="space-y-2">
            {PLATFORM_ORDER.map((pid) => {
              const spec = SPRITE_EXPORT_PLATFORMS[pid];
              const active = exportPlatform === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => {
                    setExportPlatform(pid);
                    setLastExportReport(null);
                  }}
                  className={`w-full rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${
                    active
                      ? "border-[#1E1B2E] bg-[#FFF3C4] shadow-[2px_2px_0px_#1E1B2E]"
                      : "border-[#1E1B2E]/15 bg-[#FFFDF7] hover:border-[#1E1B2E]/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black">
                      {isZh ? spec.nameZh : spec.nameEn}
                    </span>
                    <span className="rounded-full bg-white border border-[#1E1B2E]/20 px-2 py-0.5 text-[10px] font-black uppercase">
                      {spec.format} · {spec.width}×{spec.height}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-[#645E78]">
                    {isZh ? spec.summaryZh : spec.summaryEn}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Spec Readiness Badges */}
          <div className="rounded-xl border border-[#0F766E]/25 bg-[#E8FAF8] p-3 space-y-1.5 text-[11px] font-bold text-[#0F766E]">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>
                {isZh
                  ? `输出规格：${activeSpec.width}×${activeSpec.height} ${activeSpec.format.toUpperCase()} · 自动压缩 ≤ ${Math.round(activeSpec.maxBytes / 1024)}KB`
                  : `Output: ${activeSpec.width}×${activeSpec.height} ${activeSpec.format.toUpperCase()} · auto-fit ≤ ${Math.round(activeSpec.maxBytes / 1024)}KB`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>
                {exportPlatform === "line"
                  ? isZh
                    ? "LINE APNG 自动确保 5~20 帧且总时长 ≤4 秒（4帧自动往返补足）"
                    : "LINE APNG auto-ensures 5–20 frames & ≤4s duration"
                  : isZh
                    ? `永久循环播放（Loop=0）· 当前 ${activeSequence.length} 帧 (${cycleDurationSec.toFixed(2)}s)`
                    : `Infinite loop (Loop=0) · ${activeSequence.length} frames (${cycleDurationSec.toFixed(2)}s)`}
              </span>
            </div>
            {exportPlatform === "wechat" && (
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {isZh
                    ? "配套自动生成 120×120 PNG 静态缩略图 + 深色模式白边优化"
                    : "Includes 120×120 PNG thumbnail & dark-mode white outline"}
                </span>
              </div>
            )}
          </div>

          {/* Export Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleDownloadCurrentClip}
              disabled={exportingSingle || exportingZip || rendering}
              className="sticker-btn flex w-full items-center justify-center gap-2 bg-[#E04848] py-3 text-sm font-black text-white cursor-pointer disabled:opacity-60"
            >
              {exportingSingle ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>
                {isZh
                  ? `导出当前动图 (${activeSpec.format.toUpperCase()})`
                  : `Download Clip (${activeSpec.format.toUpperCase()})`}
              </span>
            </button>

            {exportPlatform === "wechat" && (
              <button
                type="button"
                onClick={handleDownloadWeChatThumb}
                disabled={exportingSingle || exportingZip || rendering}
                className="sticker-btn flex w-full items-center justify-center gap-2 bg-white py-2.5 text-xs font-extrabold text-[#1E1B2E] cursor-pointer disabled:opacity-60"
              >
                <ImageIcon className="h-3.5 w-3.5 text-[#0F766E]" />
                <span>{isZh ? "单独下载 120×120 微信缩略图 (PNG)" : "Download 120×120 WeChat Thumb (PNG)"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={exportingSingle || exportingZip || rendering}
              className="sticker-btn flex w-full items-center justify-center gap-2 bg-[#FFF3C4] py-2.5 text-xs font-black text-[#1E1B2E] cursor-pointer disabled:opacity-60"
            >
              {exportingZip ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>
                {clipGroups.length > 1
                  ? isZh
                    ? `一键打包全部 ${clipGroups.length} 个动图${exportPlatform === "wechat" ? " + 缩略图" : ""} (ZIP)`
                    : `Download All ${clipGroups.length} Clips (ZIP)`
                  : isZh
                    ? `打包动图${exportPlatform === "wechat" ? " + 120×120 缩略图" : ""} (ZIP)`
                    : `Download Complete Bundle (ZIP)`}
              </span>
            </button>
          </div>

          {lastExportReport && (
            <div className="rounded-xl border-2 border-[#0F766E] bg-[#E8FAF8] p-3 text-xs font-bold text-[#0F766E] space-y-1">
              <div className="flex items-center gap-1.5 font-black">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{isZh ? "导出成功！" : "Exported successfully!"}</span>
              </div>
              <p className="text-[11px] break-all">
                {lastExportReport.filename} · {formatKb(lastExportReport.bytes)} ·{" "}
                {lastExportReport.frameCount} {isZh ? "帧" : "frames"} ·{" "}
                {lastExportReport.withinBudget
                  ? isZh ? "符合体积限制 ✓" : "Within budget ✓"
                  : isZh ? "略超预算，建议调低 FPS 或跳过 1–2 帧" : "Slightly over budget; lower FPS or skip a frame"}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
