"use client";

import { useMemo, useState } from "react";
import { Dices, Film, Grid3x3, LayoutGrid, Sparkles } from "lucide-react";
import {
  ANIMATED_ACTION_PRESETS,
  ANIMATION_CATEGORIES,
  buildPresetBeatSequence,
  getAnimatedActionPresetById,
  getRecommendedFpsForFrameCount,
  getRecommendedLoopModeForFrameCount,
  type AnimatedClipConfig,
  type AnimatedSpriteLayoutKind,
  type AnimationActionCategory,
} from "@/config/animations";
import type { CaptionMode } from "@/db/schema";

export type AnimatedSpriteLayout = AnimatedSpriteLayoutKind;

interface AnimatedSpriteStudioSectionProps {
  isZh: boolean;
  layout: AnimatedSpriteLayout;
  captionMode: CaptionMode;
  clips: AnimatedClipConfig[];
  cost3x3: number;
  cost4x4: number;
  onChangeLayout: (next: AnimatedSpriteLayout) => void;
  onChangeCaptionMode: (next: CaptionMode) => void;
  onUpdateClip: (groupIdx: number, patch: Partial<AnimatedClipConfig>) => void;
  onShuffleClips: () => void;
}

export function AnimatedSpriteStudioSection({
  isZh,
  layout,
  captionMode,
  clips,
  cost3x3,
  cost4x4,
  onChangeLayout,
  onChangeCaptionMode,
  onUpdateClip,
  onShuffleClips,
}: AnimatedSpriteStudioSectionProps) {
  const [category, setCategory] = useState<"all" | AnimationActionCategory>("all");
  const [activeRowIdx, setActiveRowIdx] = useState(0);
  const [showStoryboard, setShowStoryboard] = useState(false);

  const visiblePresets = useMemo(() => {
    if (category === "all") return ANIMATED_ACTION_PRESETS;
    return ANIMATED_ACTION_PRESETS.filter((p) => p.category === category);
  }, [category]);

  const activeGroupCount = layout === "quad" ? 4 : layout === "dual" ? 2 : 1;
  const framesPerClip: 4 | 8 | 9 | 16 =
    layout === "quad" ? 4 : layout === "dual" ? 8 : layout === "single-16" ? 16 : 9;
  const safeRowIdx = Math.min(activeRowIdx, activeGroupCount - 1);
  const activeClip = clips[safeRowIdx] ?? clips[0];
  const activePreset = activeClip?.actionId
    ? getAnimatedActionPresetById(activeClip.actionId)
    : undefined;

  const storyboardBeats = useMemo(() => {
    if (!activePreset) return [];
    return buildPresetBeatSequence(activePreset, framesPerClip);
  }, [activePreset, framesPerClip]);

  function applyPresetToRow(presetId: string, rowIdx: number) {
    const preset = getAnimatedActionPresetById(presetId);
    if (!preset) return;
    onUpdateClip(rowIdx, {
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
    if (activeGroupCount > 1) {
      setActiveRowIdx((rowIdx + 1) % activeGroupCount);
    }
  }

  return (
    <>
      {/* Step 3: Animated Sprite Layout & Caption Overlay Language */}
      <section className="sticker-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-[#8ECAE6] text-xs font-black">
              3
            </span>
            <h2 className="text-lg font-black">
              {isZh ? "动图帧数规格与花字配置" : "Frame Count, Layout & Overlay Text"}
            </h2>
          </div>
          <span className="rounded-full border border-[#0F766E]/35 bg-[#E8FAF8] px-3 py-1 text-[11px] font-extrabold text-[#0F766E]">
            {isZh
              ? "微信 240×240 GIF (≤500KB) · LINE 270×270 APNG 一键合规"
              : "WeChat 240×240 GIF (≤500KB) · LINE 270×270 APNG Ready"}
          </span>
        </div>

        <div className="space-y-4">
          {/* 4 Animated Sprite Layout Cards */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-[#1E1B2E]">
              {isZh
                ? "选择逐帧动图规格（帧数越多动作越柔和顺滑，导出后也可自由调 2–14 FPS）"
                : "Choose Animated Sprite Layout (More frames = smoother motion; freely tune 2–14 FPS in Exporter)"}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Dual 2x8 (Recommended) */}
              <button
                type="button"
                onClick={() => onChangeLayout("dual")}
                className={`sticker-panel relative flex flex-col justify-between p-3.5 text-left cursor-pointer ${
                  layout === "dual" ? "sticker-panel-active" : "bg-[#FFFDF7]"
                }`}
              >
                <span className="absolute right-2.5 top-2.5 rounded-full bg-[#E04848] px-2 py-0.5 text-[10px] font-black text-white">
                  {isZh ? "最推荐" : "Best"}
                </span>
                <div className="flex items-center gap-2 pr-12">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-[#E04848]" />
                  <div className="text-sm font-black">
                    {isZh ? "4×4 双动图 (2×8帧)" : "4×4 Dual (2×8f)"}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-[#645E78]">
                  {isZh
                    ? "一次出 2 个 8 帧流畅动图（6 FPS ≈ 1.3s），顺滑度与性价比最平衡"
                    : "2 smooth 8-frame clips per sheet (~1.3s loop each)"}
                </p>
                <div className="mt-2 text-xs font-black text-[#0F766E]">
                  {cost4x4} {isZh ? "积分 · 2个8帧" : "credits · 2×8f"}
                </div>
              </button>

              {/* 2. Single 16-frame (Ultra Smooth) */}
              <button
                type="button"
                onClick={() => onChangeLayout("single-16")}
                className={`sticker-panel relative flex flex-col justify-between p-3.5 text-left cursor-pointer ${
                  layout === "single-16" ? "sticker-panel-active" : "bg-[#FFFDF7]"
                }`}
              >
                <span className="absolute right-2.5 top-2.5 rounded-full bg-[#0F766E] px-2 py-0.5 text-[10px] font-black text-white">
                  {isZh ? "最丝滑" : "Smoothest"}
                </span>
                <div className="flex items-center gap-2 pr-12">
                  <Film className="h-4 w-4 shrink-0 text-[#0F766E]" />
                  <div className="text-sm font-black">
                    {isZh ? "4×4 精绘 16 帧" : "4×4 Hero 16-Frame"}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-[#645E78]">
                  {isZh
                    ? "1 个 16 帧长动画（8 FPS ≈ 2.0s），相邻帧小步渐变、丝滑无跳帧"
                    : "1 ultra-fluid 16-frame long clip (~2.0s loop)"}
                </p>
                <div className="mt-2 text-xs font-black text-[#0F766E]">
                  {cost4x4} {isZh ? "积分 · 16帧精绘" : "credits · 16f"}
                </div>
              </button>

              {/* 3. Single 9-frame (3x3 HD) */}
              <button
                type="button"
                onClick={() => onChangeLayout("single")}
                className={`sticker-panel relative flex flex-col justify-between p-3.5 text-left cursor-pointer ${
                  layout === "single" ? "sticker-panel-active" : "bg-[#FFFDF7]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4 shrink-0 text-[#1E1B2E]" />
                  <div className="text-sm font-black">
                    {isZh ? "3×3 精绘 9 帧" : "3×3 Hero 9-Frame"}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-[#645E78]">
                  {isZh
                    ? "1 个 9 帧高清动图（6 FPS ≈ 1.5s），单帧像素最高，尝鲜首选"
                    : "1 crisp 9-frame clip (~1.5s), highest per-frame detail"}
                </p>
                <div className="mt-2 text-xs font-black text-[#0F766E]">
                  {cost3x3} {isZh ? "积分 · 9帧高清" : "credits · 9f"}
                </div>
              </button>

              {/* 4. Quad 4x4 (Budget Batch) */}
              <button
                type="button"
                onClick={() => onChangeLayout("quad")}
                className={`sticker-panel relative flex flex-col justify-between p-3.5 text-left cursor-pointer ${
                  layout === "quad" ? "sticker-panel-active" : "bg-[#FFFDF7]"
                }`}
              >
                <span className="absolute right-2.5 top-2.5 rounded-full bg-[#FB5607] px-2 py-0.5 text-[10px] font-black text-white">
                  {isZh ? "批量省" : "Batch 4×"}
                </span>
                <div className="flex items-center gap-2 pr-12">
                  <LayoutGrid className="h-4 w-4 shrink-0 text-[#FB5607]" />
                  <div className="text-sm font-black">
                    {isZh ? "4×4 四合一 (4×4帧)" : "4×4 Quad (4×4f)"}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-[#645E78]">
                  {isZh
                    ? "一次出 4 个小循环（默认 4 FPS + 往返 6 帧 ≈ 1.5s），适合批量铺量"
                    : "4 quick loops per sheet (4 FPS ping-pong ~1.5s each)"}
                </p>
                <div className="mt-2 text-xs font-black text-[#0F766E]">
                  {cost4x4} {isZh ? "积分 · 4个动图" : "credits · 4 clips"}
                </div>
              </button>
            </div>
          </div>

          {/* Flicker-Free Overlay Caption Language */}
          <div className="grid gap-3 md:grid-cols-[260px_1fr] md:items-center pt-1">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "none", zh: "无文字", en: "No Text" },
                  { id: "zh", zh: "中文花字", en: "Chinese" },
                  { id: "en", zh: "英文花字", en: "English" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeCaptionMode(mode.id)}
                  className={`sticker-panel py-2.5 text-center text-xs font-black cursor-pointer ${
                    captionMode === mode.id
                      ? "!border-[#1E1B2E] !bg-[#0F766E] text-white shadow-[2px_2px_0px_#1E1B2E]"
                      : "bg-[#FFFDF7] text-[#1E1B2E]"
                  }`}
                >
                  {isZh ? mode.zh : mode.en}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-[#0F766E]">
              {isZh
                ? "✨ AI 只专注绘制干净纯动作帧（小步渐变），文字由导出工坊无闪烁叠加，成图后可随时改字或调速。"
                : "✨ AI draws clean motion-only frames with gentle steps; crisp text is overlaid in the exporter with zero flicker."}
            </p>
          </div>
        </div>
      </section>

      {/* Step 4: Animated Action Sequencer */}
      <section className="sticker-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-[#B8F2E6] text-xs font-black">
              4
            </span>
            <h2 className="text-lg font-black">
              {layout === "quad"
                ? isZh
                  ? "编排 4 个动图动作（每行 = 1 个 4 帧循环）"
                  : "Pick 4 Animated Clips (1 Row = 1 4-Frame Loop)"
                : layout === "dual"
                  ? isZh
                    ? "编排 2 个流畅动图动作（上下各 2 行 = 2 个 8 帧动图）"
                    : "Pick 2 Smooth 8-Frame Animated Clips"
                  : isZh
                    ? `选择 ${framesPerClip} 帧精绘连续动作（支持自定义）`
                    : `Pick a ${framesPerClip}-Frame Animated Action (or Custom)`}
            </h2>
          </div>

          <button
            type="button"
            onClick={onShuffleClips}
            className="flex items-center gap-1.5 rounded-full border-2 border-[#FB5607]/40 bg-[#FFF3C4] px-3.5 py-1 text-xs font-extrabold text-[#1E1B2E] hover:border-[#FB5607] hover:bg-[#FFE891] cursor-pointer"
          >
            <Dices className="h-3.5 w-3.5 text-[#FB5607]" />
            <span>{isZh ? "随机换一套动图" : "Shuffle Actions"}</span>
          </button>
        </div>

        {/* Multi-Clip Slot Editor (Dual = 2 cards, Quad = 4 cards) */}
        {activeGroupCount > 1 ? (
          <div
            className={`grid gap-3 ${
              activeGroupCount === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {clips.slice(0, activeGroupCount).map((clip, rowIdx) => {
              const preset = clip.actionId ? getAnimatedActionPresetById(clip.actionId) : undefined;
              const isSelectedRow = rowIdx === safeRowIdx;
              const isCustom = !preset && Boolean(clip.customAction?.trim());
              const loopMode =
                clip.loopMode ?? getRecommendedLoopModeForFrameCount(framesPerClip, preset?.defaultLoopMode);
              const cycleFrames =
                loopMode === "pingpong" && framesPerClip >= 3
                  ? framesPerClip * 2 - 2
                  : framesPerClip;

              return (
                <div
                  key={rowIdx}
                  onClick={() => setActiveRowIdx(rowIdx)}
                  className={`sticker-panel p-3.5 space-y-2.5 cursor-pointer transition-all ${
                    isSelectedRow
                      ? "sticker-panel-active -translate-y-0.5"
                      : "bg-[#FFFDF7] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 text-xs font-black">
                      <Film className="h-3.5 w-3.5 text-[#E04848]" />
                      <span>
                        {isZh ? `动图 #${rowIdx + 1}` : `Clip #${rowIdx + 1}`}
                        {layout === "dual"
                          ? isZh
                            ? ` (第${rowIdx * 2 + 1}-${rowIdx * 2 + 2}行)`
                            : ` (Rows ${rowIdx * 2 + 1}-${rowIdx * 2 + 2})`
                          : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateClip(rowIdx, {
                          loopMode: loopMode === "pingpong" ? "loop" : "pingpong",
                        });
                      }}
                      className="rounded-full border border-[#1E1B2E]/25 bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#0F766E] hover:border-[#1E1B2E] cursor-pointer"
                      title={isZh ? "点击切换正向循环 / 往返循环" : "Toggle Loop / Ping-Pong"}
                    >
                      {loopMode === "pingpong"
                        ? isZh ? `往返 ${cycleFrames}帧` : `Bounce ${cycleFrames}f`
                        : isZh ? `循环 ${framesPerClip}帧` : `Loop ${framesPerClip}f`}
                    </button>
                  </div>

                  <div className="text-xs font-black text-[#1E1B2E]">
                    {preset
                      ? `${preset.emoji} ${isZh ? preset.nameZh : preset.nameEn}`
                      : isCustom
                        ? `✨ ${isZh ? "自定义动作" : "Custom Action"}`
                        : `🎬 #${rowIdx + 1}`}
                  </div>

                  <input
                    type="text"
                    maxLength={60}
                    value={clip.customAction ?? ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      onUpdateClip(rowIdx, {
                        actionId: e.target.value.trim() ? "custom" : preset?.id ?? "wave-hi",
                        customAction: e.target.value,
                      })
                    }
                    placeholder={
                      isZh
                        ? "点下方预设，或直接输入自定义动作..."
                        : "Pick preset below or type custom action..."
                    }
                    className="w-full rounded-lg border border-[#1E1B2E]/20 bg-white px-2.5 py-1.5 text-[11px] font-semibold outline-none focus:border-[#1E1B2E]"
                  />

                  {captionMode !== "none" && (
                    <input
                      type="text"
                      maxLength={12}
                      value={clip.caption}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateClip(rowIdx, { caption: e.target.value })}
                      placeholder={isZh ? "叠加花字文案" : "Overlay caption"}
                      className="w-full rounded-lg border border-[#1E1B2E]/30 bg-white px-2.5 py-1 text-xs font-extrabold outline-none focus:border-[#1E1B2E]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Single Hero Action Customizer (9-Frame or 16-Frame) */
          <div className="rounded-2xl border-2 border-[#1E1B2E]/15 bg-[#FAF8F3] p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_200px_190px]">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#1E1B2E]">
                  {isZh
                    ? "当前选定动作（可点下方预设，或直接输入任意连续动作）"
                    : "Selected Action (Pick below or type any custom motion)"}
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={
                    activeClip?.customAction?.trim()
                      ? activeClip.customAction
                      : activePreset
                        ? isZh
                          ? activePreset.nameZh
                          : activePreset.nameEn
                        : ""
                  }
                  onChange={(e) =>
                    onUpdateClip(0, {
                      actionId: "custom",
                      customAction: e.target.value,
                    })
                  }
                  placeholder={
                    isZh ? "例如：抱着大杯珍珠奶茶疯狂点头蹦迪" : "e.g., Bouncing happily while sipping boba tea"
                  }
                  className="w-full rounded-xl border-2 border-[#1E1B2E]/20 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[#1E1B2E]"
                />
              </div>

              {captionMode !== "none" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-extrabold text-[#1E1B2E]">
                    {isZh ? "前端叠加花字（可选）" : "Overlay Caption"}
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={activeClip?.caption ?? ""}
                    onChange={(e) => onUpdateClip(0, { caption: e.target.value })}
                    placeholder={isZh ? "例如：哈哈哈" : "e.g., LOL"}
                    className="w-full rounded-xl border-2 border-[#1E1B2E]/20 bg-white px-3 py-2 text-xs font-black outline-none focus:border-[#1E1B2E]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-[#1E1B2E]">
                  {isZh ? "循环方式" : "Loop Mode"}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onUpdateClip(0, { loopMode: "loop" })}
                    className={`rounded-xl border py-2 text-[11px] font-black cursor-pointer ${
                      (activeClip?.loopMode ?? "loop") === "loop"
                        ? "border-[#1E1B2E] bg-[#FFF3C4]"
                        : "border-[#1E1B2E]/20 bg-white text-[#645E78]"
                    }`}
                  >
                    {isZh ? `正向 ${framesPerClip}帧` : `${framesPerClip}f Loop`}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateClip(0, { loopMode: "pingpong" })}
                    className={`rounded-xl border py-2 text-[11px] font-black cursor-pointer ${
                      activeClip?.loopMode === "pingpong"
                        ? "border-[#1E1B2E] bg-[#FFF3C4]"
                        : "border-[#1E1B2E]/20 bg-white text-[#645E78]"
                    }`}
                  >
                    {isZh ? `往返 ${framesPerClip * 2 - 2}帧` : `${framesPerClip * 2 - 2}f Bounce`}
                  </button>
                </div>
              </div>
            </div>

            {storyboardBeats.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowStoryboard((v) => !v)}
                  className="text-[11px] font-extrabold text-[#0F766E] underline cursor-pointer"
                >
                  {showStoryboard
                    ? isZh ? `收起 ${framesPerClip} 帧分镜脚本 ▲` : `Hide ${framesPerClip}-Frame Storyboard ▲`
                    : isZh ? `预览 ${framesPerClip} 帧连续动作分镜脚本 (F1 → F${framesPerClip}) ▼` : `Preview ${framesPerClip}-Frame Storyboard (F1 → F${framesPerClip}) ▼`}
                </button>
                {showStoryboard && (
                  <div className={`mt-2.5 grid gap-2 ${framesPerClip === 16 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                    {storyboardBeats.map((beat, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-[#1E1B2E]/15 bg-white px-2.5 py-2 text-[11px]"
                      >
                        <span className="mr-1.5 inline-block rounded bg-[#FFF3C4] px-1.5 py-0.5 font-black text-[#1E1B2E]">
                          F{idx + 1}
                        </span>
                        <span className="font-semibold text-[#1E1B2E]/85">
                          {isZh ? beat.poseZh : beat.pose}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Preset Action Picker Library */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={`rounded-full px-3 py-1 text-xs font-extrabold cursor-pointer ${
                  category === "all"
                    ? "bg-[#1E1B2E] text-white"
                    : "bg-[#F4EFE6] text-[#1E1B2E] hover:bg-[#FFF3C4]"
                }`}
              >
                {isZh ? `全部动作 (${ANIMATED_ACTION_PRESETS.length})` : `All (${ANIMATED_ACTION_PRESETS.length})`}
              </button>
              {ANIMATION_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`rounded-full px-3 py-1 text-xs font-extrabold cursor-pointer ${
                    category === cat.id
                      ? "bg-[#1E1B2E] text-white"
                      : "bg-[#F4EFE6] text-[#1E1B2E] hover:bg-[#FFF3C4]"
                  }`}
                >
                  {isZh ? cat.nameZh : cat.nameEn}
                </button>
              ))}
            </div>

            {activeGroupCount > 1 && (
              <span className="text-[11px] font-extrabold text-[#E04848]">
                {isZh
                  ? `👇 点击下方动作将填入「动图 #${safeRowIdx + 1}」`
                  : `👇 Click a preset to assign to Clip #${safeRowIdx + 1}`}
              </span>
            )}
          </div>

          <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
            {visiblePresets.map((preset) => {
              const isActive =
                activeGroupCount === 1
                  ? activeClip?.actionId === preset.id && !activeClip?.customAction?.trim()
                  : clips
                      .slice(0, activeGroupCount)
                      .some((c) => c.actionId === preset.id && !c.customAction?.trim());
              const recFps = getRecommendedFpsForFrameCount(framesPerClip, preset.defaultFps);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPresetToRow(preset.id, safeRowIdx)}
                  className={`sticker-panel flex items-center justify-between gap-2 p-2.5 text-left transition-all cursor-pointer ${
                    isActive
                      ? "border-2 border-[#1E1B2E] bg-[#FFF3C4]"
                      : "bg-[#FFFDF7] hover:bg-white hover:border-[#1E1B2E]/40"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black">
                      {preset.emoji} {isZh ? preset.nameZh : preset.nameEn}
                    </div>
                    <div className="mt-0.5 text-[10px] font-bold text-[#645E78]">
                      {recFps} FPS · {framesPerClip}{isZh ? "帧" : "f"}
                      {captionMode !== "none"
                        ? ` · "${captionMode === "zh" ? preset.captionZh : preset.captionEn}"`
                        : ""}
                    </div>
                  </div>
                  {isActive && <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#E04848]" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
