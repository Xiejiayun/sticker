"use client";

import { useMemo, useState } from "react";
import { Dices, Film, Grid3x3, LayoutGrid, Sparkles } from "lucide-react";
import {
  ANIMATED_ACTION_PRESETS,
  ANIMATION_CATEGORIES,
  getAnimatedActionPresetById,
  type AnimatedClipConfig,
  type AnimationActionCategory,
} from "@/config/animations";
import type { CaptionMode } from "@/db/schema";

export type AnimatedSpriteLayout = "quad" | "single";

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

  const activeGroupCount = layout === "quad" ? 4 : 1;
  const safeRowIdx = Math.min(activeRowIdx, activeGroupCount - 1);
  const activeClip = clips[safeRowIdx] ?? clips[0];
  const activePreset = activeClip?.actionId
    ? getAnimatedActionPresetById(activeClip.actionId)
    : undefined;

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
      fps: preset.defaultFps,
      loopMode: preset.defaultLoopMode,
    });
    if (layout === "quad") {
      setActiveRowIdx((rowIdx + 1) % 4);
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
              {isZh ? "动图序列帧规格与花字配置" : "Animated Sprite Layout & Overlay Text"}
            </h2>
          </div>
          <span className="rounded-full border border-[#0F766E]/35 bg-[#E8FAF8] px-3 py-1 text-[11px] font-extrabold text-[#0F766E]">
            {isZh
              ? "微信 240×240 GIF (≤500KB) · LINE 270×270 APNG 一键合规"
              : "WeChat 240×240 GIF (≤500KB) · LINE 270×270 APNG Ready"}
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Layout Choice */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-[#1E1B2E]">
              {isZh ? "选择逐帧动图排版模式" : "Choose Sprite Sheet Mode"}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onChangeLayout("quad")}
                className={`sticker-panel relative flex flex-col justify-between p-3.5 text-left cursor-pointer ${
                  layout === "quad" ? "sticker-panel-active" : "bg-[#FFFDF7]"
                }`}
              >
                <span className="absolute right-2.5 top-2.5 rounded-full bg-[#E04848] px-2 py-0.5 text-[10px] font-black text-white">
                  {isZh ? "批量最值" : "Best Value"}
                </span>
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5 text-[#E04848]" />
                  <div className="text-sm font-black">
                    {isZh ? "4×4 四合一动图" : "4×4 Quad Clips"}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-[#645E78]">
                  {isZh
                    ? "一次出 4 个独立 4 帧动图（往返 6 帧），4 次凑齐微信 16 张专辑"
                    : "4 distinct 4-frame clips per sheet (6 frames ping-pong)"}
                </p>
                <div className="mt-2 text-xs font-black text-[#0F766E]">
                  {cost4x4} {isZh ? "积分 · 折合 3.75 积分/动图" : "credits"}
                </div>
              </button>

              <button
                type="button"
                onClick={() => onChangeLayout("single")}
                className={`sticker-panel relative flex flex-col justify-between p-3.5 text-left cursor-pointer ${
                  layout === "single" ? "sticker-panel-active" : "bg-[#FFFDF7]"
                }`}
              >
                <span className="absolute right-2.5 top-2.5 rounded-full bg-[#0F766E] px-2 py-0.5 text-[10px] font-black text-white">
                  {isZh ? "超丝滑" : "Ultra Smooth"}
                </span>
                <div className="flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5 text-[#0F766E]" />
                  <div className="text-sm font-black">
                    {isZh ? "3×3 精绘单动图" : "3×3 Hero 9-Frame"}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-[#645E78]">
                  {isZh
                    ? "9 帧完整起承转合大动作，超高清单帧，适合主推单品与 LINE"
                    : "1 ultra-smooth 9-frame continuous animation clip"}
                </p>
                <div className="mt-2 text-xs font-black text-[#0F766E]">
                  {cost3x3} {isZh ? "积分 · 9 帧精绘" : "credits · 9 frames"}
                </div>
              </button>
            </div>
          </div>

          {/* Flicker-Free Overlay Caption Language */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-[#1E1B2E]">
              {isZh ? "无闪烁前端花字配文" : "Flicker-Free Text Overlay"}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: "none", zh: "纯动图无字", en: "No Text" },
                  { id: "zh", zh: "中文花字", en: "Chinese" },
                  { id: "en", zh: "英文花字", en: "English" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onChangeCaptionMode(mode.id)}
                  className={`sticker-panel py-3.5 text-center text-xs font-black cursor-pointer ${
                    captionMode === mode.id
                      ? "!border-[#1E1B2E] !bg-[#0F766E] text-white shadow-[3px_3px_0px_#1E1B2E]"
                      : "bg-[#FFFDF7] text-[#1E1B2E]"
                  }`}
                >
                  {isZh ? mode.zh : mode.en}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-semibold text-[#0F766E]">
              {isZh
                ? "✨ AI 只专注绘制干净纯动作帧，文字由导出工坊无闪烁叠加，彻底告别动图文字乱码与跳动，成图后可随时改字。"
                : "✨ AI draws clean motion-only frames; crisp text is overlaid in the exporter with zero frame flicker and can be edited anytime."}
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
                  ? "编排 4 个连续动图动作（每行 = 1 个 4 帧动图）"
                  : "Pick 4 Animated Clips (1 Row = 1 Looping Sticker)"
                : isZh
                  ? "选择 9 帧精绘连续动作（支持自定义）"
                  : "Pick a 9-Frame Animated Action (or Custom)"}
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

        {/* Quad 4-Clip Slot Editor */}
        {layout === "quad" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {clips.slice(0, 4).map((clip, rowIdx) => {
              const preset = clip.actionId ? getAnimatedActionPresetById(clip.actionId) : undefined;
              const isSelectedRow = rowIdx === safeRowIdx;
              const isCustom = !preset && Boolean(clip.customAction?.trim());
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
                      <span>{isZh ? `动图 #${rowIdx + 1}` : `Clip #${rowIdx + 1}`}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateClip(rowIdx, {
                          loopMode: clip.loopMode === "pingpong" ? "loop" : "pingpong",
                        });
                      }}
                      className="rounded-full border border-[#1E1B2E]/25 bg-white px-2 py-0.5 text-[10px] font-extrabold text-[#0F766E] hover:border-[#1E1B2E] cursor-pointer"
                      title={isZh ? "点击切换正向循环 / 往返循环" : "Toggle Loop / Ping-Pong"}
                    >
                      {clip.loopMode === "pingpong"
                        ? isZh ? "往返 6帧" : "Ping-Pong 6f"
                        : isZh ? "循环 4帧" : "Loop 4f"}
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
          /* Single 9-Frame Hero Action Customizer */
          <div className="rounded-2xl border-2 border-[#1E1B2E]/15 bg-[#FAF8F3] p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_200px_170px]">
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
                    {isZh ? "正向 9帧" : "9f Loop"}
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
                    {isZh ? "往返 16帧" : "16f Bounce"}
                  </button>
                </div>
              </div>
            </div>

            {activePreset && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowStoryboard((v) => !v)}
                  className="text-[11px] font-extrabold text-[#0F766E] underline cursor-pointer"
                >
                  {showStoryboard
                    ? isZh ? "收起 9 帧分镜脚本 ▲" : "Hide 9-Frame Storyboard ▲"
                    : isZh ? "预览 9 帧连续动作分镜脚本 (F1 → F9) ▼" : "Preview 9-Frame Storyboard (F1 → F9) ▼"}
                </button>
                {showStoryboard && (
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                    {activePreset.frames9.map((beat, idx) => (
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

            {layout === "quad" && (
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
                layout === "single"
                  ? activeClip?.actionId === preset.id && !activeClip?.customAction?.trim()
                  : clips.slice(0, 4).some((c) => c.actionId === preset.id && !c.customAction?.trim());
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
                      {preset.defaultFps} FPS ·{" "}
                      {preset.defaultLoopMode === "pingpong"
                        ? isZh ? "往返" : "Ping-Pong"
                        : isZh ? "循环" : "Loop"}
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
