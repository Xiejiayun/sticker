"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { StoreAssetKind } from "@/lib/ai/types";
import { STORE_ASSET_MOODS, type StoreAssetMood } from "@/lib/prompt/asset-builder";
import {
  STORE_PLATFORM_SPECS,
  evaluatePlatformChecklist,
  type DiscordMode,
  type StorePlatformId,
} from "@/lib/slicer/platform-specs";
import type { ProcessedSticker, SliceOptions } from "@/lib/slicer/sticker-processor";
import {
  BANNER_TEMPLATES,
  renderAiBannerCanvas,
  renderStoreCoverCanvas,
  renderStoreIconCanvas,
  renderTemplateBannerCanvas,
  type BannerTemplateId,
} from "@/lib/slicer/store-assets";

const CHECKER_BG: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, #ececec 25%, transparent 25%), linear-gradient(-45deg, #ececec 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ececec 75%), linear-gradient(-45deg, transparent 75%, #ececec 75%)",
  backgroundSize: "12px 12px",
  backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
  backgroundColor: "#ffffff",
};

const PLATFORM_ORDER: StorePlatformId[] = [
  "wechat",
  "line",
  "whatsapp",
  "telegram",
  "discord",
  "slack",
];

interface StoreAssetWorkshopProps {
  packId: string;
  masterImageUrl: string;
  sliceOptions: SliceOptions;
  animated: boolean;
  stickerCount: number;
  stickers: ProcessedSticker[];
  isZh: boolean;
  isSignedIn: boolean;
  assetCreditCost: number;
  platform: StorePlatformId;
  discordMode: DiscordMode;
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
  aiAssets: Partial<Record<StoreAssetKind, string>>;
  onChangePlatform: (p: StorePlatformId) => void;
  onChangeDiscordMode: (m: DiscordMode) => void;
  onChangeCoverCell: (idx: number) => void;
  onChangeIconConfig: (patch: {
    iconCellIndex?: number;
    iconHeadCrop?: boolean;
    iconFocusX?: number;
    iconFocusY?: number;
    iconZoom?: number;
  }) => void;
  onChangeBannerConfig: (patch: {
    bannerCells?: [number, number, number];
    bannerTemplateId?: BannerTemplateId;
  }) => void;
  onChangeUseAi: (kind: StoreAssetKind, useAi: boolean) => void;
  onAiAssetGenerated: (kind: StoreAssetKind, imageUrl: string) => void;
}

export function StoreAssetWorkshop(props: StoreAssetWorkshopProps) {
  const {
    packId,
    masterImageUrl,
    sliceOptions,
    animated,
    stickerCount,
    stickers,
    isZh,
    isSignedIn,
    assetCreditCost,
    platform,
    discordMode,
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
    aiAssets,
    onChangePlatform,
    onChangeDiscordMode,
    onChangeCoverCell,
    onChangeIconConfig,
    onChangeBannerConfig,
    onChangeUseAi,
    onAiAssetGenerated,
  } = props;

  const spec = STORE_PLATFORM_SPECS[platform];
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);

  const [generatingKind, setGeneratingKind] = useState<StoreAssetKind | null>(null);
  const [assetError, setAssetError] = useState<{ msg: string; needsTopup?: boolean } | null>(null);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [iconPrompt, setIconPrompt] = useState("");
  const [bannerPrompt, setBannerPrompt] = useState("");
  const [bannerMood, setBannerMood] = useState<StoreAssetMood>("auto");
  const [editingBannerSlot, setEditingBannerSlot] = useState<0 | 1 | 2 | null>(null);

  // Render Cover preview
  useEffect(() => {
    if (!spec.cover) {
      setCoverPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const c = await renderStoreCoverCanvas({
          masterImageUrl,
          sliceOptions,
          coverCellIndex,
          aiCoverUrl: useAiCover ? aiAssets.cover : null,
          size: spec.cover!.width,
        });
        if (!cancelled) setCoverPreviewUrl(c.toDataURL("image/png"));
        c.width = 0;
        c.height = 0;
      } catch {
        // Ignore transient preview errors
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [spec.cover, masterImageUrl, sliceOptions, coverCellIndex, useAiCover, aiAssets.cover]);

  // Render Icon preview
  useEffect(() => {
    if (!spec.icon) {
      setIconPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const c = await renderStoreIconCanvas({
          masterImageUrl,
          sliceOptions,
          iconCellIndex,
          aiIconUrl: useAiIcon ? aiAssets.icon : null,
          width: spec.icon!.width,
          height: spec.icon!.height,
          headCrop: iconHeadCrop,
          focusX: iconFocusX,
          focusY: iconFocusY,
          zoom: iconZoom,
        });
        if (!cancelled) setIconPreviewUrl(c.toDataURL("image/png"));
        c.width = 0;
        c.height = 0;
      } catch {
        // Ignore transient preview errors
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    spec.icon,
    masterImageUrl,
    sliceOptions,
    iconCellIndex,
    useAiIcon,
    aiAssets.icon,
    iconHeadCrop,
    iconFocusX,
    iconFocusY,
    iconZoom,
  ]);

  // Render Banner preview
  useEffect(() => {
    if (!spec.banner) {
      setBannerPreviewUrl(null);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const c =
          useAiBanner && aiAssets.banner
            ? await renderAiBannerCanvas({
                aiBannerUrl: aiAssets.banner,
                width: spec.banner!.width,
                height: spec.banner!.height,
              })
            : await renderTemplateBannerCanvas({
                masterImageUrl,
                sliceOptions,
                cellIndices: bannerCells,
                templateId: bannerTemplateId,
                width: spec.banner!.width,
                height: spec.banner!.height,
              });
        if (!cancelled) setBannerPreviewUrl(c.toDataURL("image/jpeg", 0.9));
        c.width = 0;
        c.height = 0;
      } catch {
        // Ignore transient preview errors
      }
    }, 90);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    spec.banner,
    masterImageUrl,
    sliceOptions,
    bannerCells,
    bannerTemplateId,
    useAiBanner,
    aiAssets.banner,
  ]);

  async function handleGenerateAiAsset(kind: StoreAssetKind) {
    if (!isSignedIn) {
      setAssetError({
        msg: isZh ? "请先登录后再使用 AI 精绘配套物料" : "Please sign in to generate AI store assets",
      });
      return;
    }
    setAssetError(null);
    setGeneratingKind(kind);
    const customPrompt =
      kind === "banner" ? bannerPrompt : kind === "icon" ? iconPrompt : coverPrompt;

    try {
      const res = await fetch(`/api/packs/${encodeURIComponent(packId)}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          platform,
          userPrompt: customPrompt.trim(),
          mood: kind === "banner" ? bannerMood : "auto",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        imageUrl?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.imageUrl) {
        if (data.code === "INSUFFICIENT_CREDITS") {
          setAssetError({
            msg: isZh
              ? `积分不足（生成需 ${assetCreditCost} 积分），请先前往充值`
              : `Insufficient credits (needs ${assetCreditCost}).`,
            needsTopup: true,
          });
          return;
        }
        throw new Error(data.error || (isZh ? "生成失败，积分已自动退还" : "Generation failed"));
      }
      onAiAssetGenerated(kind, data.imageUrl);
    } catch (err) {
      setAssetError({
        msg: err instanceof Error ? err.message : isZh ? "生成失败，请重试" : "Failed to generate",
      });
    } finally {
      setGeneratingKind(null);
    }
  }

  const checklist = evaluatePlatformChecklist({
    platform,
    stickerCount,
    removeBackground: sliceOptions.removeBackground,
    animated,
    hasAiCover: Boolean(useAiCover && aiAssets.cover),
    hasAiIcon: Boolean(useAiIcon && aiAssets.icon),
    hasAiBanner: Boolean(useAiBanner && aiAssets.banner),
    discordMode,
  });

  return (
    <div className="space-y-4">
      {/* Platform Selector */}
      <div className="space-y-2">
        <div className="text-xs font-black text-[#1E1B2E]">
          {isZh ? "1. 选择目标投稿平台" : "1. Target Platform"}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PLATFORM_ORDER.map((pid) => {
            const pSpec = STORE_PLATFORM_SPECS[pid];
            const active = platform === pid;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => onChangePlatform(pid)}
                className={`flex flex-col items-start rounded-xl border-2 px-2.5 py-2 text-left transition-all cursor-pointer ${
                  active
                    ? "border-[#1E1B2E] bg-[#B8F2E6] shadow-[2px_2px_0px_#1E1B2E]"
                    : "border-[#1E1B2E]/20 bg-[#FFFDF7] hover:border-[#1E1B2E]"
                }`}
              >
                <span className="text-xs font-black leading-tight text-[#1E1B2E]">
                  {isZh
                    ? pSpec.nameZh
                        .replace("开放平台", "")
                        .replace("自定义表情", "")
                        .replace("贴纸包", "")
                    : pSpec.nameEn}
                </span>
                <span className="mt-0.5 text-[10px] font-bold text-[#645E78]">
                  {isZh ? pSpec.badgeZh : pSpec.badgeEn}
                </span>
              </button>
            );
          })}
        </div>

        <p className="rounded-xl bg-[#F4EFE6] px-3 py-2 text-[11px] font-bold leading-relaxed text-[#645E78]">
          {isZh ? spec.summaryZh : spec.summaryEn}
        </p>

        {platform === "discord" && (
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            {(
              [
                { id: "emoji", zh: "Emoji (128×128)", en: "Emoji (128×128)" },
                { id: "sticker", zh: "服务器贴纸 (320×320)", en: "Sticker (320×320)" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeDiscordMode(m.id)}
                className={`rounded-lg border-2 border-[#1E1B2E] py-1.5 text-[11px] font-extrabold cursor-pointer ${
                  discordMode === m.id ? "bg-[#FFF3C4]" : "bg-white"
                }`}
              >
                {isZh ? m.zh : m.en}
              </button>
            ))}
          </div>
        )}
      </div>

      {assetError && (
        <div
          role="alert"
          className="rounded-xl border-2 border-[#EE5253] bg-[#FFF0F0] p-2.5 text-xs font-bold text-[#EE5253] space-y-1"
        >
          <div>{assetError.msg}</div>
          {assetError.needsTopup && (
            <Link href="/pricing" className="inline-block underline font-black">
              {isZh ? "前往积分充值 →" : "Top up credits →"}
            </Link>
          )}
        </div>
      )}

      {/* Companion Assets Studio */}
      {(spec.cover || spec.icon || spec.banner) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#1E1B2E]">
              {isZh ? "2. 配套资源定制（支持 AI 专属绘制）" : "2. Companion Store Assets"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3C4] px-2 py-0.5 text-[10px] font-black text-[#1E1B2E]">
              <Coins className="h-3 w-3 text-[#FB5607]" />
              {isZh ? `AI 精绘 ${assetCreditCost} 积分/张` : `${assetCreditCost} credits / AI`}
            </span>
          </div>

          {/* A. Store Cover */}
          {spec.cover && (
            <div className="rounded-2xl border-2 border-[#1E1B2E]/20 bg-[#FFFDF7] p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black">
                  {isZh ? spec.cover.labelZh : spec.cover.labelEn}
                </span>
                <div className="flex rounded-lg border border-[#1E1B2E] bg-white p-0.5 text-[10px] font-extrabold">
                  <button
                    type="button"
                    onClick={() => onChangeUseAi("cover", false)}
                    className={`rounded-md px-2 py-0.5 cursor-pointer ${
                      !useAiCover ? "bg-[#FFF3C4]" : "text-[#645E78]"
                    }`}
                  >
                    {isZh ? "挑贴纸" : "Sticker"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeUseAi("cover", true)}
                    className={`rounded-md px-2 py-0.5 cursor-pointer ${
                      useAiCover ? "bg-[#B8F2E6]" : "text-[#645E78]"
                    }`}
                  >
                    ✨ AI
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-[#1E1B2E]"
                  style={CHECKER_BG}
                >
                  {coverPreviewUrl && (
                    <img
                      src={coverPreviewUrl}
                      alt="Store cover preview"
                      className="h-full w-full object-contain p-0.5"
                    />
                  )}
                </div>

                {!useAiCover ? (
                  <div className="flex flex-1 gap-1.5 overflow-x-auto py-1">
                    {stickers.map((s) => (
                      <button
                        key={s.index}
                        type="button"
                        onClick={() => onChangeCoverCell(s.index)}
                        className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 bg-white p-0.5 cursor-pointer ${
                          coverCellIndex === s.index
                            ? "border-[#E04848] ring-2 ring-[#E04848]/30"
                            : "border-[#1E1B2E]/20"
                        }`}
                        title={`#${s.index + 1}`}
                      >
                        <img src={s.dataUrl} alt={`#${s.index + 1}`} className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      maxLength={200}
                      value={coverPrompt}
                      onChange={(e) => setCoverPrompt(e.target.value)}
                      placeholder={isZh ? "补充要求(可选)：如挥手比耶半身像" : "Optional note (e.g. waving half-body)"}
                      className="w-full rounded-lg border border-[#1E1B2E]/25 bg-white px-2.5 py-1 text-[11px] font-semibold outline-none focus:border-[#1E1B2E]"
                    />
                    <button
                      type="button"
                      disabled={generatingKind !== null}
                      onClick={() => handleGenerateAiAsset("cover")}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-[#1E1B2E] bg-[#FFF3C4] py-1 text-[11px] font-black cursor-pointer disabled:opacity-60"
                    >
                      {generatingKind === "cover" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : aiAssets.cover ? (
                        <RefreshCw className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-[#E04848]" />
                      )}
                      <span>
                        {generatingKind === "cover"
                          ? isZh
                            ? "AI 绘制中..."
                            : "Generating..."
                          : aiAssets.cover
                            ? isZh
                              ? `重新 AI 生成 (${assetCreditCost} 积分)`
                              : `Regenerate (${assetCreditCost} cr)`
                            : isZh
                              ? `AI 精绘透明封面 (${assetCreditCost} 积分)`
                              : `Generate AI Cover (${assetCreditCost} cr)`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* B. Chat Panel / Tray Icon */}
          {spec.icon && (
            <div className="rounded-2xl border-2 border-[#1E1B2E]/20 bg-[#FFFDF7] p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black">
                  {isZh ? spec.icon.labelZh : spec.icon.labelEn}
                </span>
                <div className="flex rounded-lg border border-[#1E1B2E] bg-white p-0.5 text-[10px] font-extrabold">
                  <button
                    type="button"
                    onClick={() => onChangeUseAi("icon", false)}
                    className={`rounded-md px-2 py-0.5 cursor-pointer ${
                      !useAiIcon ? "bg-[#FFF3C4]" : "text-[#645E78]"
                    }`}
                  >
                    {isZh ? "贴纸裁切" : "Crop"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeUseAi("icon", true)}
                    className={`rounded-md px-2 py-0.5 cursor-pointer ${
                      useAiIcon ? "bg-[#B8F2E6]" : "text-[#645E78]"
                    }`}
                  >
                    ✨ AI
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {/* Enlarged + 1:1 Real Tab Bar Preview */}
                <div className="flex shrink-0 flex-col items-center gap-1.5">
                  <div
                    className="h-14 w-14 overflow-hidden rounded-xl border-2 border-[#1E1B2E]"
                    style={CHECKER_BG}
                  >
                    {iconPreviewUrl && (
                      <img
                        src={iconPreviewUrl}
                        alt="Icon preview"
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1 rounded-md border border-[#1E1B2E]/20 bg-[#EDEDED] px-1.5 py-0.5">
                    <span className="text-[9px] font-bold text-[#645E78]">1:1</span>
                    {iconPreviewUrl && (
                      <img
                        src={iconPreviewUrl}
                        alt="1:1 icon"
                        style={{
                          width: Math.min(34, Math.round(spec.icon.width * 0.55)),
                          height: Math.min(34, Math.round(spec.icon.height * 0.55)),
                        }}
                        className="object-contain"
                      />
                    )}
                  </div>
                </div>

                {!useAiIcon ? (
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onChangeIconConfig({ iconHeadCrop: true, iconZoom: 1.1 })}
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-extrabold cursor-pointer ${
                          iconHeadCrop
                            ? "border-[#1E1B2E] bg-[#FFF3C4]"
                            : "border-[#1E1B2E]/20 bg-white text-[#645E78]"
                        }`}
                      >
                        {isZh ? "头部特写" : "Head Focus"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeIconConfig({
                            iconHeadCrop: false,
                            iconZoom: 1,
                            iconFocusX: 0,
                            iconFocusY: 0,
                          })
                        }
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-extrabold cursor-pointer ${
                          !iconHeadCrop
                            ? "border-[#1E1B2E] bg-[#FFF3C4]"
                            : "border-[#1E1B2E]/20 bg-white text-[#645E78]"
                        }`}
                      >
                        {isZh ? "整图居中" : "Full Center"}
                      </button>
                    </div>

                    <div className="flex gap-1 overflow-x-auto pb-0.5">
                      {stickers.map((s) => (
                        <button
                          key={s.index}
                          type="button"
                          onClick={() => onChangeIconConfig({ iconCellIndex: s.index })}
                          className={`h-8 w-8 shrink-0 overflow-hidden rounded-md border bg-white p-0.5 cursor-pointer ${
                            iconCellIndex === s.index
                              ? "border-[#E04848] ring-1 ring-[#E04848]"
                              : "border-[#1E1B2E]/20"
                          }`}
                        >
                          <img src={s.dataUrl} alt={`#${s.index + 1}`} className="h-full w-full object-contain" />
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="space-y-0.5 text-[10px] font-bold text-[#645E78]">
                        <span>{isZh ? "缩放" : "Zoom"}</span>
                        <input
                          type="range"
                          min={0.85}
                          max={2}
                          step={0.05}
                          value={iconZoom}
                          onChange={(e) =>
                            onChangeIconConfig({ iconZoom: Number(e.target.value) })
                          }
                          className="w-full accent-[#FF6B6B] cursor-pointer"
                        />
                      </label>
                      <label className="space-y-0.5 text-[10px] font-bold text-[#645E78]">
                        <span>{isZh ? "上下位置" : "Vertical"}</span>
                        <input
                          type="range"
                          min={-0.25}
                          max={0.25}
                          step={0.02}
                          value={iconFocusY}
                          onChange={(e) =>
                            onChangeIconConfig({ iconFocusY: Number(e.target.value) })
                          }
                          className="w-full accent-[#FF6B6B] cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      maxLength={200}
                      value={iconPrompt}
                      onChange={(e) => setIconPrompt(e.target.value)}
                      placeholder={isZh ? "补充要求(可选)：如正面大头特写" : "Optional note (e.g. front face close-up)"}
                      className="w-full rounded-lg border border-[#1E1B2E]/25 bg-white px-2.5 py-1 text-[11px] font-semibold outline-none focus:border-[#1E1B2E]"
                    />
                    <button
                      type="button"
                      disabled={generatingKind !== null}
                      onClick={() => handleGenerateAiAsset("icon")}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-[#1E1B2E] bg-[#FFF3C4] py-1 text-[11px] font-black cursor-pointer disabled:opacity-60"
                    >
                      {generatingKind === "icon" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : aiAssets.icon ? (
                        <RefreshCw className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-[#E04848]" />
                      )}
                      <span>
                        {generatingKind === "icon"
                          ? isZh
                            ? "AI 绘制中..."
                            : "Generating..."
                          : aiAssets.icon
                            ? isZh
                              ? `重新 AI 生成 (${assetCreditCost} 积分)`
                              : `Regenerate (${assetCreditCost} cr)`
                            : isZh
                              ? `AI 精绘大头图标 (${assetCreditCost} 积分)`
                              : `Generate AI Icon (${assetCreditCost} cr)`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* C. WeChat Detail Page Banner (750x400 No Text) */}
          {spec.banner && (
            <div className="rounded-2xl border-2 border-[#1E1B2E]/20 bg-[#FFFDF7] p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black">
                  {isZh ? spec.banner.labelZh : spec.banner.labelEn}
                </span>
                <div className="flex rounded-lg border border-[#1E1B2E] bg-white p-0.5 text-[10px] font-extrabold">
                  <button
                    type="button"
                    onClick={() => onChangeUseAi("banner", false)}
                    className={`rounded-md px-2 py-0.5 cursor-pointer ${
                      !useAiBanner ? "bg-[#FFF3C4]" : "text-[#645E78]"
                    }`}
                  >
                    {isZh ? "免费拼图" : "Template"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeUseAi("banner", true)}
                    className={`rounded-md px-2 py-0.5 cursor-pointer ${
                      useAiBanner ? "bg-[#B8F2E6]" : "text-[#645E78]"
                    }`}
                  >
                    ✨ AI 精绘
                  </button>
                </div>
              </div>

              {/* 15:8 Banner Preview */}
              <div className="relative aspect-[15/8] w-full overflow-hidden rounded-xl border-2 border-[#1E1B2E] bg-white">
                {bannerPreviewUrl ? (
                  <img
                    src={bannerPreviewUrl}
                    alt="Store banner preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-bold text-[#645E78]">
                    {isZh ? "生成预览中..." : "Rendering preview..."}
                  </div>
                )}
              </div>

              {!useAiBanner ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {BANNER_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => onChangeBannerConfig({ bannerTemplateId: tpl.id })}
                          title={isZh ? tpl.zh : tpl.en}
                          className={`h-6 w-6 rounded-full border-2 cursor-pointer ${
                            bannerTemplateId === tpl.id
                              ? "border-[#1E1B2E] scale-110 shadow-[1px_1px_0px_#1E1B2E]"
                              : "border-[#1E1B2E]/30"
                          }`}
                          style={{ backgroundColor: tpl.swatch }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-extrabold">
                      {([0, 1, 2] as const).map((slotPos) => (
                        <button
                          key={slotPos}
                          type="button"
                          onClick={() =>
                            setEditingBannerSlot((cur) => (cur === slotPos ? null : slotPos))
                          }
                          className={`rounded-md border px-1.5 py-0.5 cursor-pointer ${
                            editingBannerSlot === slotPos
                              ? "border-[#E04848] bg-[#FFF0F0] text-[#E04848]"
                              : "border-[#1E1B2E]/25 bg-white text-[#1E1B2E]"
                          }`}
                        >
                          {isZh
                            ? `${slotPos === 0 ? "左" : slotPos === 1 ? "中" : "右"}#${bannerCells[slotPos] + 1}`
                            : `#${bannerCells[slotPos] + 1}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editingBannerSlot !== null && (
                    <div className="flex gap-1 overflow-x-auto rounded-lg border border-[#1E1B2E]/15 bg-white p-1.5">
                      {stickers.map((s) => (
                        <button
                          key={s.index}
                          type="button"
                          onClick={() => {
                            const next: [number, number, number] = [...bannerCells] as [
                              number,
                              number,
                              number,
                            ];
                            next[editingBannerSlot] = s.index;
                            onChangeBannerConfig({ bannerCells: next });
                            setEditingBannerSlot(null);
                          }}
                          className={`h-9 w-9 shrink-0 overflow-hidden rounded-md border p-0.5 cursor-pointer ${
                            bannerCells[editingBannerSlot] === s.index
                              ? "border-[#E04848] bg-[#FFF0F0]"
                              : "border-[#1E1B2E]/20"
                          }`}
                        >
                          <img src={s.dataUrl} alt={`#${s.index + 1}`} className="h-full w-full object-contain" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {STORE_ASSET_MOODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setBannerMood(m.id)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold cursor-pointer ${
                          bannerMood === m.id
                            ? "border-[#1E1B2E] bg-[#FFF3C4]"
                            : "border-[#1E1B2E]/20 bg-white text-[#645E78]"
                        }`}
                      >
                        {isZh ? m.zh : m.en}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    maxLength={400}
                    value={bannerPrompt}
                    onChange={(e) => setBannerPrompt(e.target.value)}
                    placeholder={
                      isZh
                        ? "输入横幅场景想法（可选）：例如在阳光草坪上喝奶茶欢呼；系统会自动保证画面不含文字"
                        : "Optional scene direction (e.g. picnic in a sunny park; no text will be drawn)"
                    }
                    className="w-full resize-none rounded-xl border border-[#1E1B2E]/25 bg-white px-2.5 py-1.5 text-[11px] font-semibold outline-none focus:border-[#1E1B2E]"
                  />

                  <button
                    type="button"
                    disabled={generatingKind !== null}
                    onClick={() => handleGenerateAiAsset("banner")}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-[#1E1B2E] bg-[#FFF3C4] py-1.5 text-xs font-black shadow-[2px_2px_0px_#1E1B2E] cursor-pointer disabled:opacity-60"
                  >
                    {generatingKind === "banner" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : aiAssets.banner ? (
                      <RefreshCw className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-[#E04848]" />
                    )}
                    <span>
                      {generatingKind === "banner"
                        ? isZh
                          ? "AI 正在绘制故事横幅..."
                          : "Generating banner..."
                        : aiAssets.banner
                          ? isZh
                            ? `重新 AI 精绘横幅 (${assetCreditCost} 积分)`
                            : `Regenerate AI Banner (${assetCreditCost} cr)`
                          : isZh
                            ? `AI 结合本套生成横幅 (${assetCreditCost} 积分)`
                            : `Generate AI Banner (${assetCreditCost} cr)`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compliance Checklist */}
      <div className="rounded-2xl border border-[#1E1B2E]/15 bg-[#FFFDF7] p-3 space-y-1.5">
        <div className="text-[11px] font-black text-[#1E1B2E]">
          {isZh ? "投稿过审体检单" : "Submission Checklist"}
        </div>
        {checklist.map((item) => (
          <div key={item.id} className="flex items-start gap-1.5 text-[11px] font-bold leading-snug">
            {item.status === "pass" ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F766E]" />
            ) : item.status === "warn" ? (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D97706]" />
            ) : (
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#3B82F6]" />
            )}
            <span
              className={
                item.status === "warn"
                  ? "text-[#92400E]"
                  : item.status === "pass"
                    ? "text-[#1E1B2E]"
                    : "text-[#645E78]"
              }
            >
              {isZh ? item.labelZh : item.labelEn}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
