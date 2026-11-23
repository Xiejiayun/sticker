"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import {
  Loader2,
  Scissors,
  Trash2,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Search,
  Repeat2,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getStylePresetById } from "@/config/styles";
import {
  buildCustomActionPose,
  buildCustomCaptionPose,
  buildDefaultSlots,
  detectPoseVariantIndex,
  getSlotPoseVariant,
  getSlotSourcePreset,
  getThemePackById,
  isDefaultSlotCaption,
  normalizePoseVariant,
} from "@/config/themes";
import type {
  CaptionMode,
  GridSize,
  ReferenceImageRecord,
  StickerPackStatus,
  StickerSlotSnapshot,
} from "@/db/schema";

interface PackSummary {
  id: string;
  status: StickerPackStatus;
  gridSize: GridSize;
  styleId: string;
  themeId: string;
  userPrompt: string;
  masterImageUrl: string | null;
  creditsCost: number;
  createdAt: string;
}

interface PackRemixDetail {
  captionMode?: CaptionMode;
  slotsConfig?: StickerSlotSnapshot[];
  referenceImages?: Array<ReferenceImageRecord & { previewUrl?: string }>;
}

export function PacksGallery() {
  const locale = useLocale();
  const router = useRouter();
  const isZh = locale === "zh";
  const { data: session, isPending: sessionLoading } = useSession();

  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [remixingId, setRemixingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "OTHER">("ALL");

  async function handleRemix(pack: PackSummary) {
    if (remixingId) return;
    setRemixingId(pack.id);

    let nextVariant = 1;
    let captionMode: CaptionMode = isZh ? "zh" : "en";
    let nextSlots: StickerSlotSnapshot[] | undefined;
    let editedIndices: number[] = [];
    let references: Array<{
      url: string;
      previewUrl: string;
      mimeType: string;
      role: "character" | "pet" | "outfit" | "prop";
    }> = [];

    try {
      const res = await fetch(`/api/packs/${encodeURIComponent(pack.id)}`);
      if (res.ok) {
        const data = (await res.json()) as { pack?: PackRemixDetail };
        const detail = data.pack;
        if (detail) {
          if (
            detail.captionMode === "none" ||
            detail.captionMode === "zh" ||
            detail.captionMode === "en"
          ) {
            captionMode = detail.captionMode;
          }

          const prevVariant = detectPoseVariantIndex(pack.themeId, detail.slotsConfig);
          nextVariant = normalizePoseVariant(prevVariant + 1);
          const variantDefaults = buildDefaultSlots(
            pack.themeId,
            pack.gridSize,
            captionMode,
            nextVariant
          );

          if (Array.isArray(detail.slotsConfig) && detail.slotsConfig.length > 0) {
            const nextEdited: number[] = [];
            nextSlots = variantDefaults.map((def, idx) => {
              const prevSlot = detail.slotsConfig?.[idx];
              const caption =
                captionMode === "none"
                  ? ""
                  : (prevSlot?.caption ?? def.caption).trim().slice(0, 12);

              if (prevSlot?.customPose?.trim()) {
                const customAction = buildCustomActionPose(prevSlot.customPose, nextVariant);
                return {
                  index: idx,
                  pose: customAction.pose,
                  poseZh: customAction.poseZh,
                  caption,
                  customPose: prevSlot.customPose.trim(),
                };
              }

              if (prevSlot?.sourceThemeId && typeof prevSlot.sourceSlotIndex === "number") {
                const source = getSlotSourcePreset(pack.themeId, {
                  index: idx,
                  sourceThemeId: prevSlot.sourceThemeId,
                  sourceSlotIndex: prevSlot.sourceSlotIndex,
                });
                if (source) {
                  const chosen = getSlotPoseVariant(source.slotPreset, nextVariant);
                  return {
                    index: idx,
                    pose: chosen.pose,
                    poseZh: chosen.poseZh,
                    caption,
                    sourceThemeId: source.theme.id,
                    sourceSlotIndex: source.slotIndex,
                  };
                }
              }

              if (
                captionMode !== "none" &&
                caption.length > 0 &&
                !isDefaultSlotCaption(pack.themeId, idx, captionMode, caption)
              ) {
                nextEdited.push(idx);
                const customPose = buildCustomCaptionPose(caption, nextVariant);
                return {
                  index: idx,
                  pose: customPose.pose,
                  poseZh: customPose.poseZh,
                  caption,
                };
              }

              return {
                ...def,
                caption,
              };
            });
            editedIndices = nextEdited;
          } else {
            nextSlots = variantDefaults;
          }

          if (Array.isArray(detail.referenceImages)) {
            references = detail.referenceImages
              .filter((ref) => Boolean(ref?.url && ref?.previewUrl))
              .map((ref) => ({
                url: ref.url,
                previewUrl: ref.previewUrl!,
                mimeType: ref.mimeType,
                role: ref.role,
              }));
          }
        }
      }
    } catch {
      // Fall back to basic remix draft if detail fetch fails
    } finally {
      setRemixingId(null);
    }

    try {
      sessionStorage.setItem(
        "stickerjam_studio_draft_v1",
        JSON.stringify({
          userPrompt: pack.userPrompt,
          styleId: pack.styleId,
          themeId: pack.themeId,
          gridSize: pack.gridSize,
          captionMode,
          poseVariant: nextVariant,
          slots: nextSlots,
          editedIndices,
          references,
        })
      );
    } catch {
      // Ignore storage errors
    }
    router.push(`/studio?style=${encodeURIComponent(pack.styleId)}&theme=${encodeURIComponent(pack.themeId)}&remix=1`);
  }

  const filteredPacks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packs.filter((pack) => {
      if (statusFilter === "COMPLETED" && pack.status !== "COMPLETED") return false;
      if (statusFilter === "OTHER" && pack.status === "COMPLETED") return false;
      if (!q) return true;
      const style = getStylePresetById(pack.styleId);
      const theme = getThemePackById(pack.themeId);
      const haystack = [
        pack.userPrompt,
        style?.nameZh,
        style?.nameEn,
        theme?.nameZh,
        theme?.nameEn,
        pack.styleId,
        pack.themeId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [packs, searchQuery, statusFilter]);

  function formatStatus(status: StickerPackStatus) {
    if (status === "PENDING") return isZh ? "排队中" : "Queued";
    if (status === "PROCESSING") return isZh ? "生成中" : "Generating";
    if (status === "FAILED") return isZh ? "生成失败" : "Failed";
    return isZh ? "已完成" : "Completed";
  }

  useEffect(() => {
    if (sessionLoading) return;
    setLoadError(null);
    if (!session?.user) {
      setPacks([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetch("/api/packs")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ packs?: PackSummary[] }>;
      })
      .then((data: { packs?: PackSummary[] }) => {
        if (!Array.isArray(data.packs)) throw new Error("Invalid response");
        if (active) setPacks(data.packs);
      })
      .catch(() => {
        if (active) setLoadError(isZh
          ? "作品库加载失败。服务可能暂时达到资源限制，请稍后重试。"
          : "Could not load your packs. The service may have reached its resource limit. Please retry later.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.user, sessionLoading, loadAttempt, isZh]);

  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/packs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setPacks((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId((prev) => (prev === id ? null : prev));
    } catch {
      setDeleteError(isZh ? "删除失败，请稍后重试。" : "Failed to delete pack. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center px-4">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF6B6B]" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="sticker-card p-10 text-center space-y-4">
          <Sparkles className="mx-auto h-10 w-10 text-[#FF6B6B]" />
          <h1 className="text-2xl font-black">
            {isZh ? "登录后查看你的表情包作品库" : "Sign in to view your Sticker Packs"}
          </h1>
          <Link
            href="/auth"
            className="sticker-btn inline-flex items-center gap-2 bg-[#FF6B6B] px-6 py-2.5 text-sm font-extrabold text-white"
          >
            {isZh ? "立即登录 / 注册" : "Sign In / Sign Up"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{isZh ? "我的表情包作品库" : "My Sticker Packs"}</h1>
          <p className="text-sm font-medium text-[#645E78]">
            {isZh
              ? "你的专属表情都在这里。打开成图，切成单张 PNG，或下载整套 ZIP。"
              : "All your expressions, in one place. Open a finished sheet to save individual PNGs or download the full ZIP."}
          </p>
        </div>

        <Link
          href="/studio"
          className="sticker-btn inline-flex items-center gap-2 bg-[#FF6B6B] px-5 py-2.5 text-sm font-extrabold text-white"
        >
          <Plus className="h-4 w-4" />
          <span>{isZh ? "新建一套表情包" : "New Sticker Pack"}</span>
        </Link>
      </div>

      {deleteError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#EE5253] bg-[#FFF0F0] px-4 py-3 text-sm font-bold text-[#EE5253]"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{deleteError}</span>
          </span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="cursor-pointer text-xs underline"
          >
            {isZh ? "关闭" : "Dismiss"}
          </button>
        </div>
      )}

      {loadError ? (
        <div role="alert" className="sticker-card p-8 text-center space-y-4">
          <p>{loadError}</p>
          <button type="button" className="sticker-btn bg-white px-5 py-2" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
            {isZh ? "重试" : "Retry"}
          </button>
        </div>
      ) : packs.length === 0 ? (
        <div className="sticker-card p-12 text-center space-y-4">
          <p className="text-base font-bold text-[#645E78]">
            {isZh ? "还没有生成过表情包，去创作你的第一套吧！" : "No sticker packs yet. Create your first one!"}
          </p>
          <Link
            href="/studio"
            className="sticker-btn inline-flex items-center gap-2 bg-[#FFF3C4] px-6 py-2.5 text-sm font-extrabold text-[#1E1B2E]"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isZh ? "前往创作工作台" : "Open Studio"}</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Search & Status Filters */}
          <div className="sticker-panel flex flex-wrap items-center justify-between gap-3 p-3.5">
            <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-xl border border-[#1E1B2E]/20 bg-[#FFFDF7] px-3 py-2 focus-within:border-[#1E1B2E] focus-within:bg-white">
              <Search className="h-4 w-4 shrink-0 text-[#645E78]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isZh ? "搜索角色描述、画风或主题..." : "Search prompt, style, or theme..."}
                className="w-full bg-transparent text-xs font-bold text-[#1E1B2E] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "ALL", zh: `全部 (${packs.length})`, en: `All (${packs.length})` },
                  { id: "COMPLETED", zh: "已完成", en: "Completed" },
                  { id: "OTHER", zh: "进行中 / 失败", en: "In Progress / Failed" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-[#1E1B2E] text-white"
                      : "bg-[#F4EFE6] text-[#1E1B2E] hover:bg-[#FFF3C4]"
                  }`}
                >
                  {isZh ? tab.zh : tab.en}
                </button>
              ))}
            </div>
          </div>

          {filteredPacks.length === 0 ? (
            <div className="sticker-panel p-10 text-center text-sm font-bold text-[#645E78]">
              {isZh ? "没有找到符合筛选条件的表情包。" : "No matching sticker packs found."}
            </div>
          ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPacks.map((pack) => {
            const style = getStylePresetById(pack.styleId);
            const theme = getThemePackById(pack.themeId);
            return (
              <div key={pack.id} className="sticker-card overflow-hidden flex flex-col">
                <Link
                href={`/packs/view?id=${encodeURIComponent(pack.id)}`}
                  className="relative aspect-square bg-[#FFFDF7] border-b-2 border-[#1E1B2E] flex items-center justify-center overflow-hidden"
                >
                  {pack.masterImageUrl ? (
                    <img
                      src={pack.masterImageUrl}
                      alt="Sticker Sheet"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover hover:scale-[1.02] transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-xs font-bold text-[#645E78]">
                      {pack.status === "FAILED" ? (
                        <AlertCircle className="h-8 w-8 text-[#EE5253]" />
                      ) : (
                        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
                      )}
                      <span>{formatStatus(pack.status)}</span>
                    </div>
                  )}

                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border-2 border-[#1E1B2E] bg-white px-2.5 py-0.5 text-[11px] font-black">
                    {pack.status === "COMPLETED" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#2EC4B6]" />
                    )}
                    {(pack.status === "PENDING" || pack.status === "PROCESSING") && (
                      <Clock className="h-3.5 w-3.5 text-[#FB5607]" />
                    )}
                    {pack.status === "FAILED" && (
                      <AlertCircle className="h-3.5 w-3.5 text-[#EE5253]" />
                    )}
                    <span>{pack.gridSize}</span>
                  </span>
                </Link>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="font-black text-sm">
                      {style ? (isZh ? style.nameZh : style.nameEn) : pack.styleId} ·{" "}
                      {theme ? (isZh ? theme.nameZh : theme.nameEn) : pack.themeId}
                    </div>
                    <p className="line-clamp-2 text-xs font-medium text-[#645E78]">
                      {pack.userPrompt || (isZh ? "参考图生成" : "Reference photo pack")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#1E1B2E]/10">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/packs/view?id=${encodeURIComponent(pack.id)}`}
                        className="inline-flex items-center gap-1 rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-3 py-1 text-xs font-extrabold hover:bg-[#FFE680]"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                        <span>{isZh ? "切图" : "Slice"}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemix(pack)}
                        disabled={remixingId === pack.id}
                        className="inline-flex items-center gap-1 rounded-full border border-[#0F766E]/40 bg-[#E8FAF8] px-3 py-1 text-xs font-extrabold text-[#0F766E] hover:bg-[#D1F5EF] cursor-pointer disabled:opacity-60"
                        title={isZh ? "保留角色与文案，换一套动作再画" : "Keep character & captions, generate with fresh poses"}
                      >
                        {remixingId === pack.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Repeat2 className="h-3.5 w-3.5" />
                        )}
                        <span>{isZh ? "再画一套" : "Remix"}</span>
                      </button>
                    </div>

                    {confirmDeleteId === pack.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDelete(pack.id)}
                          disabled={deletingId === pack.id}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full border-2 border-[#1E1B2E] bg-[#EE5253] px-2.5 py-1 text-[11px] font-extrabold text-white disabled:opacity-60"
                        >
                          {deletingId === pack.id && <Loader2 className="h-3 w-3 animate-spin" />}
                          <span>{isZh ? "确认删除" : "Confirm"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === pack.id}
                          className="cursor-pointer rounded-full border-2 border-[#1E1B2E]/30 bg-white px-2.5 py-1 text-[11px] font-bold text-[#645E78] hover:border-[#1E1B2E] hover:text-[#1E1B2E]"
                        >
                          {isZh ? "取消" : "Cancel"}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(pack.id)}
                        disabled={deletingId !== null}
                        aria-label={isZh ? "删除作品" : "Delete pack"}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#1E1B2E]/30 text-[#645E78] hover:border-[#EE5253] hover:text-[#EE5253] cursor-pointer disabled:opacity-50"
                        title={isZh ? "删除" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
          )}
        </div>
      )}
    </div>
  );
}
