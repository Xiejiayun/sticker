"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Globe, Coins, Menu, X } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { LocaleSwitchButton } from "./LocaleSwitchLink";

export function Navbar() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user) {
      setBalance(null);
      return;
    }
    let active = true;
    fetch("/api/credits")
      .then((res) => (res.ok ? (res.json() as Promise<{ balance?: number }>) : null))
      .then((data: { balance?: number } | null) => {
        if (active && typeof data?.balance === "number") {
          setBalance(data.balance);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session?.user, pathname]);

  const otherLocale = locale === "zh" ? "en" : "zh";
  const normalizedPath = pathname.replace(/^\/(zh|en)(?=\/|$)/, "") || "/";

  const navLinks = [
    { href: "/studio", label: t("nav.studio") },
    { href: "/packs", label: t("nav.packs") },
    { href: "/pricing", label: t("nav.pricing") },
  ];

  function isActive(href: string) {
    return normalizedPath === href || normalizedPath.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#1E1B2E] bg-[#FFFDF7]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href={session?.user ? "/studio" : "/"}
          onClick={() => setMenuOpen(false)}
          className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight"
        >
          <img src="/brand-icon.svg" alt="" width={40} height={40} className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
          <span className="whitespace-nowrap text-lg font-black text-[#1E1B2E] sm:text-xl">{t("brand.name")}</span>
        </Link>

        <nav className="hidden items-center gap-2 text-sm font-bold text-[#1E1B2E] md:flex" aria-label="Main">
          {navLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full border-2 px-3.5 py-1 transition-colors ${
                  active
                    ? "border-[#1E1B2E] bg-[#FFF3C4] font-extrabold text-[#1E1B2E]"
                    : "border-transparent hover:text-[#FF6B6B]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
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
                aria-label={`${t("nav.credits")}: ${balance ?? "..."} · ${session.user.name || session.user.email}`}
                className="flex items-center gap-1.5 rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-2.5 py-1.5 text-xs font-extrabold text-[#1E1B2E] hover:bg-[#FFE891] sm:px-3"
              >
                <Coins className="h-3.5 w-3.5 text-[#FB5607]" />
                <span className="tabular-nums">
                  {balance === null ? "..." : balance}
                  <span className="hidden sm:inline"> {t("nav.credits")}</span>
                </span>
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
              className="sticker-btn bg-[#E04848] px-4 py-1.5 text-sm font-extrabold text-white"
            >
              {t("nav.signIn")}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? (locale === "zh" ? "关闭菜单" : "Close menu") : (locale === "zh" ? "打开菜单" : "Open menu")}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-[#1E1B2E] bg-white text-[#1E1B2E] hover:bg-[#FFF3C4] md:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          aria-label="Mobile"
          className="border-t-2 border-[#1E1B2E] bg-[#FFFDF7] px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-2">
            {navLinks.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-xl border-2 px-4 py-2.5 text-sm font-extrabold transition-colors ${
                    active
                      ? "border-[#1E1B2E] bg-[#FFF3C4] text-[#1E1B2E]"
                      : "border-transparent bg-white text-[#1E1B2E] hover:border-[#1E1B2E]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
