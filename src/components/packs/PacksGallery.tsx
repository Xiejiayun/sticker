"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getStylePresetById } from "@/config/styles";
import { getThemePackById } from "@/config/themes";
import type { GridSize, StickerPackStatus } from "@/db/schema";

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

export function PacksGallery() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const { data: session, isPending: sessionLoading } = useSession();

  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setDeletingId(id);
    try {
      const res = await fetch(`/api/packs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPacks((prev) => prev.filter((p) => p.id !== id));
      }
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
            {isZh ? "登录后查看你的 4K 表情包作品库" : "Sign in to view your Sticker Packs"}
          </h1>
          <Link
            href={`/${locale}/auth`}
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
              ? "随时打开任意 4K 宫格原图进行重新抠图、调节白边或导出微信 / Telegram ZIP。"
              : "Re-open any 4K sheet anytime to adjust cutouts, die-cut borders, or export ZIP packs."}
          </p>
        </div>

        <Link
          href={`/${locale}/studio`}
          className="sticker-btn inline-flex items-center gap-2 bg-[#FF6B6B] px-5 py-2.5 text-sm font-extrabold text-white"
        >
          <Plus className="h-4 w-4" />
          <span>{isZh ? "新建一套表情包" : "New Sticker Pack"}</span>
        </Link>
      </div>

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
            href={`/${locale}/studio`}
            className="sticker-btn inline-flex items-center gap-2 bg-[#FFF3C4] px-6 py-2.5 text-sm font-extrabold text-[#1E1B2E]"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isZh ? "前往创作工作台" : "Open Studio"}</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => {
            const style = getStylePresetById(pack.styleId);
            const theme = getThemePackById(pack.themeId);
            return (
              <div key={pack.id} className="sticker-card overflow-hidden flex flex-col">
                <Link
                href={`/${locale}/packs/view?id=${encodeURIComponent(pack.id)}`}
                  className="relative aspect-square bg-[#FFFDF7] border-b-2 border-[#1E1B2E] flex items-center justify-center overflow-hidden"
                >
                  {pack.masterImageUrl ? (
                    <img
                      src={pack.masterImageUrl}
                      alt="Sticker Sheet"
                      className="h-full w-full object-cover hover:scale-[1.02] transition-transform"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-xs font-bold text-[#645E78]">
                      {pack.status === "FAILED" ? (
                        <AlertCircle className="h-8 w-8 text-[#EE5253]" />
                      ) : (
                        <Loader2 className="h-8 w-8 animate-spin text-[#FF6B6B]" />
                      )}
                      <span>{pack.status}</span>
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

                  <div className="flex items-center justify-between pt-2 border-t border-[#1E1B2E]/10">
                    <Link
                    href={`/${locale}/packs/view?id=${encodeURIComponent(pack.id)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-3.5 py-1 text-xs font-extrabold hover:bg-[#FFE680]"
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      <span>{isZh ? "切图导出" : "Slice & Export"}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(pack.id)}
                      disabled={deletingId === pack.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#1E1B2E]/30 text-[#645E78] hover:border-[#EE5253] hover:text-[#EE5253] cursor-pointer"
                      title={isZh ? "删除" : "Delete"}
                    >
                      {deletingId === pack.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
