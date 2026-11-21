"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Plus, Scissors } from "lucide-react";
import type { GridSize } from "@/db/schema";

export function GenerationComplete({ pack, locale, onStartNew }: {
  pack: { id: string; gridSize: GridSize; masterImageUrl: string | null };
  locale: string;
  onStartNew: () => void;
}) {
  const isZh = locale === "zh";
  const count = pack.gridSize === "4x4" ? 16 : 9;
  const heading = useRef<HTMLHeadingElement>(null);
  const exportUrl = `/${locale}/packs/view?id=${encodeURIComponent(pack.id)}`;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14" data-testid="generation-complete">
      <div className="mb-7 flex items-center gap-2 text-sm font-extrabold text-[#178875]" role="status">
        <CheckCircle2 className="h-5 w-5" />
        {isZh ? "成图已完成 · 接下来切图下载" : "Your sheet is ready · Next, slice & download"}
      </div>
      <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
        <div className="sticker-card overflow-hidden bg-white p-3">
          {pack.masterImageUrl ? (
            <img src={pack.masterImageUrl} alt={isZh ? "已生成的表情包宫格原图" : "Your finished sticker sheet"} className="aspect-square w-full rounded-xl object-contain" />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-[#FFF3C4] text-[#1E1B2E]">
              <Scissors className="h-16 w-16" />
            </div>
          )}
        </div>
        <div className="space-y-6">
          <span className="inline-flex rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-3 py-1 text-xs font-extrabold">
            {pack.gridSize} · {isZh ? `${count} 张专属表情` : `${count} expressions`}
          </span>
          <h1 ref={heading} tabIndex={-1} className="text-3xl font-black leading-tight tracking-tight outline-none sm:text-4xl">
            {isZh ? "你的表情包，准备好登场了" : "Your expressions are ready to go."}
          </h1>
          <p className="text-base leading-relaxed text-[#645E78]">
            {isZh
              ? "打开成图，预览自动切分后的每一张表情。可以下载单张 PNG，也可以把整套打包带走。"
              : "Preview every expression from your finished sheet. Save individual PNGs or take the whole pack as a ZIP."}
          </p>
          <Link href={exportUrl} className="sticker-btn flex items-center justify-center gap-3 bg-[#FF6B6B] px-6 py-4 text-base font-black text-white" data-testid="open-exporter">
            <Scissors className="h-5 w-5" />
            {isZh ? "切图并下载" : "Slice & Download"}
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-center text-xs font-medium text-[#645E78]">
            {isZh ? "切图和下载免费，作品已保存到作品库。" : "Slicing and downloads are free. Your sheet is saved in My Packs."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-[#1E1B2E]/15 pt-5 text-sm font-bold">
            <Link href={`/${locale}/packs`} className="hover:text-[#EE5253]">{isZh ? "查看作品库" : "My Packs"}</Link>
            <button type="button" onClick={onStartNew} className="inline-flex cursor-pointer items-center gap-1.5 text-[#645E78] hover:text-[#EE5253]">
              <Plus className="h-4 w-4" />{isZh ? "创作新的一套" : "Create another pack"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
