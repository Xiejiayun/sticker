"use client";

import { Dices, Film, RefreshCw, RotateCcw } from "lucide-react";
import {
  ANIMATED_ACTION_PRESETS,
  ANIMATED_THEME_PACKS,
  getAnimatedActionPresetById,
  getAnimatedThemePackById,
  getFramesPerStickerForQuality,
  getRecommendedFpsForFrameCount,
  getRecommendedLoopModeForFrameCount,
  planAnimatedBatchJobs,
  type AnimatedClipConfig,
  type AnimatedPackCount,
  type AnimatedQualityTier,
  type AnimatedThemePackId,
} from "@/config/animations";
import type { CaptionMode } from "@/db/schema";

interface AnimatedSpriteStudioSectionProps {
  isZh: boolean;
  count: AnimatedPackCount;
  quality: AnimatedQualityTier;
  themePackId: AnimatedThemePackId;
  captionMode: CaptionMode;
  clips: AnimatedClipConfig[];
  cost3x3: number;
  cost4x4: number;
  onChangeCount: (next: AnimatedPackCount) => void;
  onChangeQuality: (next: AnimatedQualityTier) => void;
  onSelectThemePack: (next: AnimatedThemePackId) => void;
  onChangeCaptionMode: (next: CaptionMode) => void;
  onUpdateClip: (clipIdx: number, patch: Partial<AnimatedClipConfig>) => void;
  onShuffleClips: () => void;
  onResetClips: () => void;
}

const COUNT_OPTIONS: Array<{
  value: AnimatedPackCount;
  badgeZh?: string;
  badgeEn?: string;
  hintZh: string;
  hintEn: string;
}> = [
  { value: 1, hintZh: "单品精做", hintEn: "Single hero" },
  { value: 4, badgeZh: "推荐", badgeEn: "Popular", hintZh: "轻享小套", hintEn: "Mini pack" },
  { value: 8, hintZh: "LINE 标准档", hintEn: "LINE 8-pack" },
  { value: 16, badgeZh: "微信专辑", badgeEn: "Full Album", hintZh: "16张完整套", hintEn: "Full 16-pack" },
];

const QUALITY_OPTIONS: Array<{
  id: AnimatedQualityTier;
  badgeZh?: string;
  badgeEn?: string;
  titleZh: string;
  titleEn: string;
  descZh: string;
  descEn: string;
}> = [
  {
    id: "smooth-8",
    badgeZh: "推荐",
    badgeEn: "Recommended",
    titleZh: "✨ 流畅 8 帧",
    titleEn: "✨ Smooth 8 Frames",
    descZh: "动作自然流畅（约 1.3s/轮），流畅度与积分最平衡",
    descEn: "Natural fluid motion (~1.3s loop), best balance of quality & credits",
  },
  {
    id: "ultra-16",
    badgeZh: "最丝滑",
    badgeEn: "Smoothest",
    titleZh: "💎 超丝滑 16 帧",
    titleEn: "💎 Ultra 16 Frames",
    descZh: "电影级细腻渐变（约 2.0s/轮），每个动图单独精绘",
    descEn: "Ultra-fluid 2s animation with delicate frame-to-frame steps",
  },
  {
    id: "lite-4",
    badgeZh: "省积分",
    badgeEn: "Budget",
    titleZh: "⚡ 轻量 4 帧",
    titleEn: "⚡ Lite 4 Frames",
    descZh: "轻快魔性循环（往返 6 帧约 1.5s），批量铺量最省",
    descEn: "Snappy 4-frame loop (6f ping-pong ~1.5s), lowest credit cost",
  },
];

export function AnimatedSpriteStudioSection({
  isZh,
  count,
  quality,
  themePackId,
  captionMode,
  clips,
  cost3x3,
  cost4x4,
  onChangeCount,
  onChangeQuality,
  onSelectThemePack,
  onChangeCaptionMode,
  onUpdateClip,
  onShuffleClips,
  onResetClips,
}: AnimatedSpriteStudioSectionProps) {
  const framesPerClip = getFramesPerStickerForQuality(count, quality);
  const activeTheme =
    themePackId !== "anim-custom" ? getAnimatedThemePackById(themePackId) : undefined;

  function getCreditsFor(c: AnimatedPackCount, q: AnimatedQualityTier) {
    return planAnimatedBatchJobs({
      count: c,
      quality: q,
      captionMode,
      clips: [],
      cost3x3,
      cost4x4,
    }).totalCredits;
  }

  function handleSelectPresetForClip(clipIdx: number, presetId: string) {
    if (presetId === "custom") {
      onUpdateClip(clipIdx, {
        actionId: "custom",
        customAction: clips[clipIdx]?.customAction ?? "",
      });
      return;
    }
    const preset = getAnimatedActionPresetById(presetId);
    if (!preset) return;
    onUpdateClip(clipIdx, {
      actionId: preset.id,
      customAction: "",
      caption:
        captionMode === "none"
          ? ""
          : captionMode === "zh"
            ? preset.captionZh
            : preset.captionEn,
      fps: getRecommendedFpsForFrameCount(framesPerClip, preset.defaultFps),
      loopMode: getRecommendedLoopModeForFrameCount(framesPerClip, preset.defaultLoopMode),
    });
  }

  function handleCycleClipPreset(clipIdx: number) {
    const cur = clips[clipIdx];
    const curIdx = ANIMATED_ACTION_PRESETS.findIndex((p) => p.id === cur?.actionId);
    const next = ANIMATED_ACTION_PRESETS[(curIdx + 1) % ANIMATED_ACTION_PRESETS.length];
    handleSelectPresetForClip(clipIdx, next.id);
  }

  return (
    <>
      {/* Step 3: How many animated stickers + Smoothness + Caption Language */}
      <section className="sticker-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-[#8ECAE6] text-xs font-black">
              3
            </span>
            <h2 className="text-lg font-black">
              {isZh ? "制作数量与流畅度" : "Sticker Count & Smoothness"}
            </h2>
          </div>
          <span className="rounded-full border border-[#0F766E]/35 bg-[#E8FAF8] px-3 py-1 text-[11px] font-extrabold text-[#0F766E]">
            {isZh
              ? "自动支持微信 GIF (≤500KB) + 缩略图 · LINE APNG 一键打包"
              : "Auto WeChat GIF (≤500KB) + Thumbs · LINE APNG Ready"}
          </span>
        </div>

        {/* 3.1 Count Picker */}
        <div className="space-y-2">
          <div className="text-xs font-extrabold text-[#1E1B2E]">
            {isZh ? "这一次要做几个动图？" : "How many animated stickers do you want to make?"}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COUNT_OPTIONS.map((opt) => {
              const active = count === opt.value;
              const credits = getCreditsFor(opt.value, quality);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeCount(opt.value)}
                  className={`sticker-panel relative flex flex-col justify-between p-3.5 text-left cursor-pointer ${
                    active ? "sticker-panel-active" : "bg-[#FFFDF7] hover:bg-white"
                  }`}
                >
                  {opt.badgeZh && (
                    <span
                      className={`absolute right-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-black text-white ${
                        opt.value === 4 ? "bg-[#E04848]" : "bg-[#0F766E]"
                      }`}
                    >
                      {isZh ? opt.badgeZh : opt.badgeEn}
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[#1E1B2E]">{opt.value}</span>
                    <span className="text-xs font-black text-[#1E1B2E]">
                      {isZh ? "个动图" : opt.value === 1 ? "sticker" : "stickers"}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-[#645E78]">{isZh ? opt.hintZh : opt.hintEn}</span>
                    <span className="text-[#0F766E]">
                      {credits} {isZh ? "积分" : "cr"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3.2 Smoothness & Caption Language */}
        <div className="grid gap-5 lg:grid-cols-[1fr_270px]">
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-[#1E1B2E]">
              {isZh ? "动图流畅度（帧数）" : "Animation Smoothness"}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {QUALITY_OPTIONS.map((opt) => {
                const active = quality === opt.id;
                const credits = getCreditsFor(count, opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeQuality(opt.id)}
                    className={`sticker-panel relative flex flex-col justify-between p-3 text-left cursor-pointer ${
                      active ? "sticker-panel-active" : "bg-[#FFFDF7] hover:bg-white"
                    }`}
                  >
                    {opt.badgeZh && (
                      <span className="absolute right-2 top-2 rounded-full bg-[#1E1B2E] px-2 py-0.5 text-[9px] font-black text-white">
                        {isZh ? opt.badgeZh : opt.badgeEn}
                      </span>
                    )}
                    <div className="text-xs font-black text-[#1E1B2E] pr-10">
                      {isZh ? opt.titleZh : opt.titleEn}
                    </div>
                    <p className="mt-1 text-[11px] font-medium text-[#645E78]">
                      {isZh ? opt.descZh : opt.descEn}
                    </p>
                    <div className="mt-2 text-[11px] font-black text-[#0F766E]">
                      {isZh ? `本套 ${credits} 积分` : `${credits} credits total`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-extrabold text-[#1E1B2E]">
              {isZh ? "配文花字（无闪烁叠加）" : "Overlay Captions"}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "none", zh: "无文字", en: "None" },
                  { id: "zh", zh: "中文", en: "ZH" },
                  { id: "en", zh: "英文", en: "EN" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeCaptionMode(mode.id)}
                  className={`sticker-panel py-3 text-center text-xs font-black cursor-pointer ${
                    captionMode === mode.id
                      ? "!border-[#1E1B2E] !bg-[#0F766E] text-white shadow-[2px_2px_0px_#1E1B2E]"
                      : "bg-[#FFFDF7] text-[#1E1B2E]"
                  }`}
                >
                  {isZh ? mode.zh : mode.en}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-medium text-[#645E78]">
              {isZh
                ? "AI 只画纯动作，文字在导出时无闪烁叠加，随时可改字。"
                : "AI draws clean motion; text overlays flicker-free in Exporter."}
            </p>
          </div>
        </div>
      </section>

      {/* Step 4: Action Theme Pack & Per-Sticker Cards */}
      <section className="sticker-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-[#B8F2E6] text-xs font-black">
              4
            </span>
            <h2 className="text-lg font-black">
              {isZh
                ? `选择动作主题与逐个微调（共 ${count} 个动图）`
                : `Choose Action Theme & Customize (${count} ${count === 1 ? "Sticker" : "Stickers"})`}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onShuffleClips}
              className="flex items-center gap-1.5 rounded-full border-2 border-[#FB5607]/40 bg-[#FFF3C4] px-3 py-1 text-xs font-extrabold text-[#1E1B2E] hover:border-[#FB5607] hover:bg-[#FFE891] cursor-pointer"
            >
              <Dices className="h-3.5 w-3.5 text-[#FB5607]" />
              <span>{isZh ? "随机混搭" : "Shuffle Mix"}</span>
            </button>

            <button
              type="button"
              onClick={onResetClips}
              className="flex items-center gap-1.5 rounded-full border border-[#1E1B2E]/25 bg-white px-3 py-1 text-xs font-bold hover:border-[#1E1B2E] hover:bg-[#FFF3C4] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isZh ? "恢复主题默认" : "Reset Theme"}</span>
            </button>
          </div>
        </div>

        {/* Theme Tabs */}
        <div className="flex flex-wrap gap-2">
          {ANIMATED_THEME_PACKS.map((theme) => {
            const active = themePackId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectThemePack(theme.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors cursor-pointer ${
                  active
                    ? "border-2 border-[#1E1B2E] bg-[#1E1B2E] text-white"
                    : "border border-[#1E1B2E]/20 bg-[#F4EFE6] text-[#1E1B2E] hover:bg-[#FFF3C4]"
                }`}
              >
                <span>{theme.emoji}</span>
                <span>{isZh ? theme.nameZh : theme.nameEn}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onSelectThemePack("anim-custom")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold transition-colors cursor-pointer ${
              themePackId === "anim-custom"
                ? "border-2 border-[#1E1B2E] bg-[#1E1B2E] text-white"
                : "border-2 border-dashed border-[#0F766E]/55 bg-[#E8FAF8] text-[#0F766E] hover:border-[#0F766E] hover:bg-[#D1F5EF]"
            }`}
          >
            <span>✨</span>
            <span>{isZh ? "自由自定义" : "Custom"}</span>
          </button>
        </div>

        {/* Theme Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1E1B2E]/10 bg-[#FAF8F3] px-3.5 py-2 text-[11px] font-semibold text-[#645E78]">
          <span>
            {activeTheme
              ? `${activeTheme.emoji} ${isZh ? activeTheme.descriptionZh : activeTheme.descriptionEn}`
              : isZh
                ? "✨ 自由模式：为每个动图填写想做的连续动作，或下拉挑选精选预设"
                : "✨ Custom mode: describe any looping motion per sticker, or pick from presets"}
          </span>
          <span className="text-[#0F766E]">
            {isZh
              ? `每个动图 ${framesPerClip} 帧 · 可逐个下拉换动作或改文字`
              : `${framesPerClip} frames each · Swap any action or edit caption below`}
          </span>
        </div>

        {/* Clean N-Sticker Editable Grid (just like Static Slot Grid!) */}
        <div
          className={`grid gap-3 ${
            count === 1
              ? "max-w-md"
              : count === 4
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                : "grid-cols-2 sm:grid-cols-4"
          }`}
        >
          {clips.slice(0, count).map((clip, idx) => {
            const preset = clip.actionId ? getAnimatedActionPresetById(clip.actionId) : undefined;
            const isCustom = !preset;

            return (
              <div key={idx} className="sticker-panel bg-[#FFFDF7] p-3 space-y-2">
                <div className="flex items-center justify-between gap-1 text-[11px] font-black text-[#645E78]">
                  <span className="inline-flex items-center gap-1 text-[#1E1B2E]">
                    <Film className="h-3.5 w-3.5 text-[#E04848]" />
                    <span>#{idx + 1}</span>
                    {preset && <span>{preset.emoji}</span>}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCycleClipPreset(idx)}
                    title={isZh ? "随机换一个动作" : "Cycle action"}
                    aria-label={isZh ? `换第 ${idx + 1} 个动图动作` : `Change action #${idx + 1}`}
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-[#1E1B2E]/15 bg-white text-[#645E78] hover:border-[#0F766E] hover:text-[#0F766E] cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>

                {/* One-click Action Preset Dropdown */}
                <select
                  value={preset ? preset.id : "custom"}
                  onChange={(e) => handleSelectPresetForClip(idx, e.target.value)}
                  aria-label={isZh ? `第 ${idx + 1} 个动图动作` : `Action for sticker #${idx + 1}`}
                  className="w-full rounded-lg border border-[#1E1B2E]/25 bg-white px-2 py-1.5 text-xs font-extrabold text-[#1E1B2E] outline-none focus:border-[#1E1B2E] cursor-pointer"
                >
                  {ANIMATED_ACTION_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji} {isZh ? p.nameZh : p.nameEn}
                    </option>
                  ))}
                  <option value="custom">
                    ✨ {isZh ? "自定义动作..." : "Custom motion..."}
                  </option>
                </select>

                {/* Custom Action Input (shown when custom is chosen, or always optional quick-override) */}
                {isCustom && (
                  <input
                    type="text"
                    maxLength={60}
                    value={clip.customAction ?? ""}
                    onChange={(e) =>
                      onUpdateClip(idx, {
                        actionId: "custom",
                        customAction: e.target.value,
                      })
                    }
                    placeholder={
                      isZh
                        ? "输入连续动作，如：抱奶茶开心摇头..."
                        : "Describe looping motion..."
                    }
                    className="w-full rounded-lg border border-[#0F766E]/45 bg-white px-2.5 py-1.5 text-[11px] font-semibold outline-none focus:border-[#0F766E]"
                  />
                )}

                {captionMode !== "none" && (
                  <input
                    type="text"
                    maxLength={12}
                    value={clip.caption}
                    onChange={(e) => onUpdateClip(idx, { caption: e.target.value })}
                    placeholder={isZh ? "输入短文案" : "Short text"}
                    className="w-full rounded-lg border border-[#1E1B2E]/25 bg-white px-2.5 py-1 text-xs font-extrabold text-[#1E1B2E] outline-none focus:border-[#1E1B2E] focus:bg-[#FFF3C4]/40"
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
