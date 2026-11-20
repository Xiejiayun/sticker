"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Sparkles, Globe, Coins } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

export function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session } = useSession();

  const otherLocale = locale === "zh" ? "en" : "zh";
  const switchedPath = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${otherLocale}`) || `/${otherLocale}`;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#1E1B2E] bg-[#FFFDF7]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2.5 font-extrabold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#1E1B2E] bg-[#FF6B6B] text-white shadow-[2px_2px_0px_#1E1B2E]">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-lg text-[#1E1B2E]">{t("brand.name")}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-[#1E1B2E] md:flex">
          <Link href={`/${locale}/studio`} className="hover:text-[#FF6B6B] transition-colors">
            {t("nav.studio")}
          </Link>
          <Link href={`/${locale}/packs`} className="hover:text-[#FF6B6B] transition-colors">
            {t("nav.packs")}
          </Link>
          <Link href={`/${locale}/pricing`} className="hover:text-[#FF6B6B] transition-colors">
            {t("nav.pricing")}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={switchedPath}
            className="flex items-center gap-1.5 rounded-full border-2 border-[#1E1B2E] bg-white px-3 py-1.5 text-xs font-bold text-[#1E1B2E] hover:bg-[#FFF3C4] transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            {otherLocale === "zh" ? "中文" : "EN"}
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/pricing`}
                className="flex items-center gap-1 rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-3 py-1.5 text-xs font-extrabold text-[#1E1B2E]"
              >
                <Coins className="h-3.5 w-3.5 text-[#FB5607]" />
                <span>{session.user.name || session.user.email}</span>
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full border-2 border-[#1E1B2E] bg-white px-3 py-1.5 text-xs font-bold hover:bg-neutral-100 cursor-pointer"
              >
                {t("nav.signOut")}
              </button>
            </div>
          ) : (
            <Link
              href={`/${locale}/auth`}
              className="sticker-btn bg-[#FF6B6B] px-4 py-1.5 text-sm font-extrabold text-white"
            >
              {t("nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
