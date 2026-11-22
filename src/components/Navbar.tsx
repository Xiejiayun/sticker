"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Coins } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { LocaleSwitchButton } from "./LocaleSwitchLink";

export function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: session } = useSession();

  const otherLocale = locale === "zh" ? "en" : "zh";

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#1E1B2E] bg-[#FFFDF7]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight">
          <img src="/brand-icon.svg" alt="" width={40} height={40} className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
          <span className="whitespace-nowrap text-lg font-black text-[#1E1B2E] sm:text-xl">{t("brand.name")}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-[#1E1B2E] md:flex">
          <Link href="/studio" className="hover:text-[#FF6B6B] transition-colors">
            {t("nav.studio")}
          </Link>
          <Link href="/packs" className="hover:text-[#FF6B6B] transition-colors">
            {t("nav.packs")}
          </Link>
          <Link href="/pricing" className="hover:text-[#FF6B6B] transition-colors">
            {t("nav.pricing")}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap sm:gap-3">
          <LocaleSwitchButton
            targetLocale={otherLocale}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-[#1E1B2E] bg-white px-3 py-1.5 text-xs font-bold text-[#1E1B2E] hover:bg-[#FFF3C4] transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            {otherLocale === "zh" ? "中文" : "EN"}
          </LocaleSwitchButton>

          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/pricing"
                aria-label={`${t("nav.pricing")} · ${session.user.name || session.user.email}`}
                className="flex items-center gap-1 rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-2 py-1.5 text-xs font-extrabold text-[#1E1B2E] sm:px-3"
              >
                <Coins className="h-3.5 w-3.5 text-[#FB5607]" />
                <span className="hidden max-w-32 truncate lg:inline">{session.user.name || session.user.email}</span>
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
              href="/auth"
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
