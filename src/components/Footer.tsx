"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { BRAND } from "@/config/brand";

export function Footer() {
  const locale = useLocale();
  const isZh = locale === "zh";

  return (
    <footer className="mt-16 border-t-2 border-[#1E1B2E] bg-[#FFFDF7]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 font-extrabold tracking-tight">
              <img src="/brand-icon.svg" alt="" width={28} height={28} className="h-7 w-7 shrink-0" />
              <span className="font-display text-lg font-bold text-[#1E1B2E]">
                {isZh ? BRAND.nameZh : BRAND.name}
              </span>
            </Link>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>
                {isZh
                  ? "🔒 上传照片仅用于本次生成，绝不公开展示或用于模型训练"
                  : "🔒 Photos are only used for your generation—never public or used for model training"}
              </span>
            </p>
          </div>

          <nav
            aria-label={isZh ? "页脚导航" : "Footer"}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-[#645E78]"
          >
            <Link href="/studio" className="hover:text-[#1E1B2E]">
              {isZh ? "创作工作台" : "Studio"}
            </Link>
            <Link href="/packs" className="hover:text-[#1E1B2E]">
              {isZh ? "我的作品库" : "My Packs"}
            </Link>
            <Link href="/pricing" className="hover:text-[#1E1B2E]">
              {isZh ? "积分方案" : "Pricing"}
            </Link>
            <Link href="/privacy" className="hover:text-[#1E1B2E]">
              {isZh ? "隐私政策" : "Privacy Policy"}
            </Link>
            <Link href="/terms" className="hover:text-[#1E1B2E]">
              {isZh ? "服务条款" : "Terms of Service"}
            </Link>
          </nav>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#1E1B2E]/10 pt-4 text-[11px] font-medium text-[#645E78]">
          <span>
            © {new Date().getFullYear()} {BRAND.name} ({BRAND.nameZh}).{" "}
            {isZh ? "保留所有权利。" : "All rights reserved."}
          </span>
          <span>
            {isZh
              ? "浏览器端零算力切图 · 失败自动全额退还积分"
              : "Client-side lossless slicing · Auto credit refund on failure"}
          </span>
        </div>
      </div>
    </footer>
  );
}
