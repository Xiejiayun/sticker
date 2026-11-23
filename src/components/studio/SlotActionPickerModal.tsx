"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  THEME_PACKS,
  getDefaultSlotCaption,
  type ThemePack,
  type ThemeSlotPreset,
} from "@/config/themes";
import type { CaptionMode } from "@/db/schema";

export interface ActionPickerSelection {
  sourceThemeId: string;
  sourceSlotIndex: number;
  pose: string;
  poseZh: string;
  caption: string;
  applyCaption: boolean;
}

interface ActionLibraryEntry {
  theme: ThemePack;
  slotIndex: number;
  slot: ThemeSlotPreset;
}

const ALL_ACTION_ENTRIES: ActionLibraryEntry[] = THEME_PACKS.flatMap((theme) =>
  theme.slots.map((slot, slotIndex) => ({
    theme,
    slotIndex,
    slot,
  }))
);

export function SlotActionPickerModal({
  open,
  targetSlotIndex,
  currentThemeId,
  captionMode,
  isZh,
  onClose,
  onSelect,
}: {
  open: boolean;
  targetSlotIndex: number | null;
  currentThemeId: string;
  captionMode: CaptionMode;
  isZh: boolean;
  onClose: () => void;
  onSelect: (pick: ActionPickerSelection) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [applyCaption, setApplyCaption] = useState(true);

  useEffect(() => {
    if (!open) return;
    setSearchQuery("");
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ALL_ACTION_ENTRIES.filter((entry) => {
      if (themeFilter !== "all" && entry.theme.id !== themeFilter) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        entry.slot.captionZh,
        entry.slot.captionEn,
        entry.slot.poseZh,
        entry.slot.pose,
        entry.theme.nameZh,
        entry.theme.nameEn,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [searchQuery, themeFilter]);

  if (!open || targetSlotIndex === null) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-picker-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sticker-card flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden bg-[#FFFDF7]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#1E1B2E] bg-[#FFF3C4] px-5 py-3.5">
          <div>
            <h3 id="action-picker-title" className="text-base sm:text-lg font-black text-[#1E1B2E]">
              {isZh
                ? `从全库动作替换第 #${targetSlotIndex + 1} 格`
                : `Replace Slot #${targetSlotIndex + 1} from Action Library`}
            </h3>
            <p className="text-[11px] font-bold text-[#645E78]">
              {isZh
                ? `覆盖全部 ${THEME_PACKS.length} 大主题共 ${ALL_ACTION_ENTRIES.length} 个精选动作，支持跨主题混搭`
                : `Browse ${ALL_ACTION_ENTRIES.length} curated poses across all ${THEME_PACKS.length} themes`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isZh ? "关闭动作库" : "Close action library"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-white text-[#1E1B2E] hover:bg-[#E04848] hover:text-white cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search, Caption Toggle & Theme Filters */}
        <div className="space-y-3 border-b border-[#1E1B2E]/15 bg-white px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border-2 border-[#1E1B2E]/20 bg-[#FFFDF7] px-3 py-2 focus-within:border-[#1E1B2E] focus-within:bg-white">
              <Search className="h-4 w-4 shrink-0 text-[#645E78]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isZh
                    ? "搜索动作描述、表情关键词或主题（如：摸鱼、比心、奶茶...）"
                    : "Search poses, captions, or themes (e.g., coffee, hug, meme...)"
                }
                className="w-full bg-transparent text-xs font-bold text-[#1E1B2E] outline-none"
                autoFocus
              />
            </div>

            {captionMode !== "none" && (
              <label className="flex items-center gap-2 rounded-xl border border-[#1E1B2E]/20 bg-[#E8FAF8] px-3 py-2 text-xs font-extrabold text-[#0F766E] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyCaption}
                  onChange={(e) => setApplyCaption(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#0F766E] cursor-pointer"
                />
                <span>
                  {isZh ? "同时替换为该动作配文" : "Also update caption"}
                </span>
              </label>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-0.5">
            <button
              type="button"
              onClick={() => setThemeFilter("all")}
              className={`rounded-full px-3 py-1 text-[11px] font-extrabold transition-colors cursor-pointer ${
                themeFilter === "all"
                  ? "border-2 border-[#1E1B2E] bg-[#1E1B2E] text-white"
                  : "border border-[#1E1B2E]/20 bg-[#F4EFE6] text-[#1E1B2E] hover:bg-[#FFF3C4]"
              }`}
            >
              {isZh ? `全部 (${ALL_ACTION_ENTRIES.length})` : `All (${ALL_ACTION_ENTRIES.length})`}
            </button>
            {THEME_PACKS.map((theme) => {
              const active = themeFilter === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setThemeFilter(theme.id)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold transition-colors cursor-pointer ${
                    active
                      ? "border-2 border-[#1E1B2E] bg-[#1E1B2E] text-white"
                      : "border border-[#1E1B2E]/20 bg-[#F4EFE6] text-[#1E1B2E] hover:bg-[#FFF3C4]"
                  }`}
                >
                  <span>{theme.emoji}</span>
                  <span>{isZh ? theme.nameZh : theme.nameEn}</span>
                  {theme.id === currentThemeId && (
                    <span className="opacity-70">{isZh ? "·当前" : "·Current"}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Action Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-sm font-bold text-[#645E78]">
              {isZh
                ? "没有找到匹配的动作，换个关键词试试吧。"
                : "No matching poses found. Try another keyword."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEntries.map((entry) => {
                const displayCaption = isZh ? entry.slot.captionZh : entry.slot.captionEn;
                const displayPose = isZh ? entry.slot.poseZh : entry.slot.pose;
                return (
                  <button
                    key={`${entry.theme.id}-${entry.slotIndex}`}
                    type="button"
                    onClick={() => {
                      onSelect({
                        sourceThemeId: entry.theme.id,
                        sourceSlotIndex: entry.slotIndex,
                        pose: entry.slot.pose,
                        poseZh: entry.slot.poseZh,
                        caption: getDefaultSlotCaption(entry.slot, captionMode),
                        applyCaption: captionMode !== "none" && applyCaption,
                      });
                      onClose();
                    }}
                    className="sticker-panel flex flex-col justify-between gap-2 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#0F766E] hover:bg-[#E8FAF8]/40 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F4EFE6] px-2 py-0.5 text-[10px] font-extrabold text-[#1E1B2E]">
                        <span>{entry.theme.emoji}</span>
                        <span>{isZh ? entry.theme.nameZh : entry.theme.nameEn}</span>
                      </span>
                      <span className="rounded-md bg-[#FFF3C4] px-2 py-0.5 text-[11px] font-black text-[#1E1B2E]">
                        {displayCaption}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-[#645E78]">
                      {displayPose}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
