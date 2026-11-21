import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles, Grid3x3, Scissors, Palette, ArrowRight } from "lucide-react";
import { STYLE_PRESETS } from "@/config/styles";
import { THEME_PACKS } from "@/config/themes";

export default async function HomePage({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isZh = locale === "zh";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 space-y-20">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-4 py-1.5 text-xs sm:text-sm font-extrabold text-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E]">
          <Sparkles className="h-4 w-4 text-[#FB5607]" />
          <span>{t("hero.badge")}</span>
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight text-[#1E1B2E]">
          {t("hero.title")}
        </h1>

        <p className="mx-auto max-w-2xl text-base sm:text-lg font-medium text-[#645E78]">
          {t("hero.subtitle")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href={`/${locale}/studio`}
            className="sticker-btn inline-flex items-center gap-2 bg-[#FF6B6B] px-7 py-3.5 text-base font-extrabold text-white"
          >
            <span>{t("hero.ctaPrimary")}</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="sticker-btn inline-flex items-center gap-2 bg-white px-7 py-3.5 text-base font-extrabold text-[#1E1B2E]"
          >
            {t("hero.ctaSecondary")}
          </Link>
        </div>

        <p className="text-xs sm:text-sm font-bold text-[#2EC4B6]">
          🎁 {t("hero.bonusNote")}
        </p>
      </section>

      {/* Feature Highlights */}
      <section className="grid gap-6 md:grid-cols-3">
        <div className="sticker-card sticker-card-hover p-6 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#1E1B2E] bg-[#FF8FAB]">
            <Palette className="h-6 w-6 text-[#1E1B2E]" />
          </div>
          <h2 className="text-xl font-black">{t("features.styleTitle")}</h2>
          <p className="text-sm font-medium text-[#645E78]">{t("features.styleDesc")}</p>
        </div>

        <div className="sticker-card sticker-card-hover p-6 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#1E1B2E] bg-[#FFF3C4]">
            <Grid3x3 className="h-6 w-6 text-[#1E1B2E]" />
          </div>
          <h2 className="text-xl font-black">{t("features.gridTitle")}</h2>
          <p className="text-sm font-medium text-[#645E78]">{t("features.gridDesc")}</p>
        </div>

        <div className="sticker-card sticker-card-hover p-6 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-[#1E1B2E] bg-[#8ECAE6]">
            <Scissors className="h-6 w-6 text-[#1E1B2E]" />
          </div>
          <h2 className="text-xl font-black">{t("features.sliceTitle")}</h2>
          <p className="text-sm font-medium text-[#645E78]">{t("features.sliceDesc")}</p>
        </div>
      </section>

      {/* Curated Styles Preview */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black">{t("stylesSection.title")}</h2>
          <p className="text-sm sm:text-base font-medium text-[#645E78]">
            {t("stylesSection.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STYLE_PRESETS.map((style) => (
            <Link
              key={style.id}
              href={`/${locale}/studio?style=${style.id}`}
              className="sticker-card sticker-card-hover p-5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#1E1B2E] text-2xl"
                  style={{ backgroundColor: style.accentColor }}
                >
                  {style.badgeEmoji}
                </span>
                <span className="rounded-full border border-[#1E1B2E] bg-[#FFFDF7] px-2.5 py-0.5 text-[11px] font-bold">
                  4K · 1:1
                </span>
              </div>
              <div>
                <h3 className="font-black text-base">
                  {isZh ? style.nameZh : style.nameEn}
                </h3>
                <p className="mt-1 text-xs font-medium text-[#645E78]">
                  {isZh ? style.taglineZh : style.taglineEn}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Theme Packs Preview */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black">{t("themesSection.title")}</h2>
          <p className="text-sm sm:text-base font-medium text-[#645E78]">
            {t("themesSection.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_PACKS.map((theme) => (
            <Link
              key={theme.id}
              href={`/${locale}/studio?theme=${theme.id}`}
              className="sticker-card sticker-card-hover p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#1E1B2E] bg-[#FFF3C4] text-xl">
                  {theme.emoji}
                </span>
                <div>
                  <h3 className="font-black text-base">
                    {isZh ? theme.nameZh : theme.nameEn}
                  </h3>
                  <p className="text-xs font-medium text-[#645E78]">
                    {isZh ? theme.descriptionZh : theme.descriptionEn}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {theme.slots.slice(0, 6).map((slot, idx) => (
                  <span
                    key={idx}
                    className="rounded-full border border-[#1E1B2E]/30 bg-[#FFFDF7] px-2.5 py-0.5 text-xs font-bold text-[#1E1B2E]"
                  >
                    {isZh ? slot.captionZh : slot.captionEn}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
