"use client";

import {
  planAnimatedBatchJobs,
  type AnimatedPackCount,
  type AnimatedQualityTier,
} from "@/config/animations";
import type { CaptionMode } from "@/db/schema";

interface AnimatedSpriteStudioSectionProps {
  isZh: boolean;
  count: AnimatedPackCount;
  quality: AnimatedQualityTier;
  captionMode: CaptionMode;
  cost3x3: number;
  cost4x4: number;
  onChangeCount: (next: AnimatedPackCount) => void;
  onChangeQuality: (next: AnimatedQualityTier) => void;
  onChangeCaptionMode: (next: CaptionMode) => void;
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
  captionMode,
  cost3x3,
  cost4x4,
  onChangeCount,
  onChangeQuality,
  onChangeCaptionMode,
}: AnimatedSpriteStudioSectionProps) {
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

  return (
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
  );
}
