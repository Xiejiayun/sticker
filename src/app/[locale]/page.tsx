import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles, Grid3x3, Scissors, Palette, ArrowRight, ShieldCheck, MessageCircleHeart } from "lucide-react";
import { STYLE_PRESETS } from "@/config/styles";
import { THEME_CATEGORIES, THEME_PACKS } from "@/config/themes";
import { getAdvertisedSignupBonusCredits } from "@/config/pricing";
import { HomeEntry } from "@/components/HomeEntry";

export default async function HomePage({ params }: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const isZh = locale === "zh";
  const signupBonus = getAdvertisedSignupBonusCredits();

  const heroPreviewCells = [
    { img: "/styles/chibi-handdrawn.webp", caption: isZh ? "早安" : "GM!" },
    { img: "/styles/3d-blindbox.webp", caption: isZh ? "OK" : "OK!" },
    { img: "/styles/plush-felt.webp", caption: isZh ? "比心" : "Love u" },
    { img: "/styles/anime-cel.webp", caption: isZh ? "哈哈哈" : "LOL" },
    { img: "/styles/watercolor-cute.webp", caption: isZh ? "摸鱼中" : "Slacking" },
    { img: "/styles/crayon-storybook.webp", caption: isZh ? "干饭啦" : "Food!" },
    { img: "/styles/guochao-ink.webp", caption: isZh ? "冲呀" : "Let's go" },
    { img: "/styles/y2k-glossy.webp", caption: isZh ? "贴贴" : "Cuddle" },
    { img: "/styles/flat-vector.webp", caption: isZh ? "晚安" : "Night" },
  ];

  const faqs = isZh
    ? [
        {
          q: "我上传的个人或宠物照片安全吗？",
          a: "安全。参考照片仅保存在您的私有存储空间中用于本次表情生成，绝不公开展示，也不会用于训练任何公共模型；您也可以随时在作品库删除。",
        },
        {
          q: "如何切图以及支持哪些导出尺寸？",
          a: "生成后点击“切图并下载”即可在浏览器本地按 3×3 或 4×4 原像素精准切格，免费支持单张 PNG、整套 ZIP，以及微信 240×240 / Telegram 512×512 规格，并可选透明背景与丝滑白边。",
        },
        {
          q: "如果生成中途失败或超时会扣积分吗？",
          a: "不会。任何环节出现模型异常或请求超时，系统会自动全额退还本次扣除的积分，您可在充值页的积分明细中实时查验。",
        },
        {
          q: "积分会过期吗？作品可以发朋友圈或做头像吗？",
          a: "购买的积分包永不过期。您生成的作品可用于日常社交聊天、头像展示、自媒体配图及合规商业项目。",
        },
      ]
    : [
        {
          q: "Are my uploaded photos private and safe?",
          a: "Yes. Reference photos stay in private storage strictly for your generation—never published or used to train public models. You can delete packs anytime from My Packs.",
        },
        {
          q: "How does slicing work and which sizes are supported?",
          a: "Slicing runs locally inside your browser at zero extra credit cost. Export individual PNGs or a full ZIP in native resolution, WeChat (240×240), or Telegram (512×512), with optional transparent cutout & white die-cut border.",
        },
        {
          q: "What happens if generation fails or times out?",
          a: "You are automatically refunded in full. Any failed or aborted generation restores the held credits directly back to your wallet.",
        },
        {
          q: "Do purchased credits expire?",
          a: "Never. One-time credit packs never expire, and generated packs are saved in your personal library.",
        },
      ];

  return (
    <HomeEntry>
      {/* Split Hero Section */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.95fr]">
        <div className="space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-4 py-1.5 text-xs sm:text-sm font-extrabold text-[#1E1B2E] shadow-[2px_2px_0px_#1E1B2E]">
            <Sparkles className="h-4 w-4 text-[#FB5607]" />
            <span>{t("hero.badge")}</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.15] text-[#1E1B2E]">
            {t("hero.title")}
          </h1>

          <p className="mx-auto max-w-xl text-base sm:text-lg font-medium text-[#645E78] lg:mx-0">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-1 lg:justify-start">
            <Link
              href="/studio"
              className="sticker-btn inline-flex items-center gap-2 bg-[#E04848] px-7 py-3.5 text-base font-extrabold text-white"
            >
              <span>{t("hero.ctaPrimary")}</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/pricing"
              className="sticker-btn inline-flex items-center gap-2 bg-white px-7 py-3.5 text-base font-extrabold text-[#1E1B2E]"
            >
              {t("hero.ctaSecondary")}
            </Link>
          </div>

          <div className="flex flex-col gap-1.5 items-center lg:items-start">
            {signupBonus !== null && signupBonus > 0 && <p className="text-xs sm:text-sm font-extrabold text-[#0F766E]">
              🎁 {t("hero.bonusNote", { credits: signupBonus })}
            </p>}
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#645E78]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0F766E]" />
              <span>
                {isZh
                  ? "支持先配置再登录 · 失败自动全额退还积分"
                  : "Draft before signing in · Auto-refund on any failure"}
              </span>
            </p>
          </div>
        </div>

        {/* Visual Proof Showcase Card */}
        <div className="sticker-card bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold">
            <span className="rounded-full bg-[#F4EFE6] px-3 py-1 text-[#1E1B2E]">
              {isZh ? "📷 1 张照片或一句话" : "📷 1 Photo or Idea"}
            </span>
            <span className="text-[#645E78]">→</span>
            <span className="rounded-full bg-[#E8FAF8] px-3 py-1 text-[#0F766E]">
              {isZh ? "✨ 9 / 16 格角色统一贴纸" : "✨ 9 or 16 Consistent Stickers"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-[#1E1B2E]/15 bg-[#FAF8F3] p-3">
            {heroPreviewCells.map((cell, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden rounded-xl border border-[#1E1B2E]/15 bg-white p-1"
              >
                <img
                  src={cell.img}
                  alt={cell.caption}
                  width={160}
                  height={160}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <span className="absolute bottom-1.5 right-1.5 rounded-full border border-[#1E1B2E]/80 bg-white/95 px-2 py-0.5 text-[10px] font-black text-[#1E1B2E]">
                  {cell.caption}
                </span>
              </div>
            ))}
          </div>

          {/* Simulated Chat Preview */}
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#1E1B2E] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <MessageCircleHeart className="h-5 w-5 shrink-0 text-[#4CC9F0]" />
              <p className="truncate text-xs font-bold text-white/90">
                {isZh
                  ? "“天呐！这套表情包的毛色和动作跟你家猫一模一样！”"
                  : "\"OMG, this whole sticker pack looks just like your cat!\""}
              </p>
            </div>
            <Link
              href="/studio"
              className="shrink-0 rounded-full bg-[#FFF3C4] px-3 py-1 text-[11px] font-black text-[#1E1B2E] hover:bg-[#FFE891]"
            >
              {isZh ? "做一套" : "Try it"}
            </Link>
          </div>
        </div>
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
          <h2 className="font-display text-3xl font-bold">{t("stylesSection.title")}</h2>
          <p className="text-sm sm:text-base font-medium text-[#645E78]">
            {t("stylesSection.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STYLE_PRESETS.map((style) => (
            <Link
              key={style.id}
              href={`/studio?style=${style.id}`}
              className="sticker-card sticker-card-hover group overflow-hidden flex flex-col"
            >
              <div className="relative aspect-square w-full overflow-hidden border-b-2 border-[#1E1B2E] bg-[#FFFDF7]">
                <img
                  src={style.previewImage}
                  alt={isZh ? `${style.nameZh}画风示例` : `${style.nameEn} style preview`}
                  width={480}
                  height={480}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <span className="absolute right-3 top-3 rounded-full border-2 border-[#1E1B2E] bg-[#FFFDF7] px-2.5 py-0.5 text-[11px] font-bold">
                  {isZh ? "高清 · 1:1" : "HD · 1:1"}
                </span>
              </div>
              <div className="p-4">
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
          <h2 className="font-display text-3xl font-bold">{t("themesSection.title")}</h2>
          <p className="text-sm sm:text-base font-medium text-[#645E78]">
            {t("themesSection.subtitle")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_PACKS.map((theme) => {
            const categoryMeta = THEME_CATEGORIES.find((c) => c.id === theme.category);
            return (
              <Link
                key={theme.id}
                href={`/studio?theme=${theme.id}`}
                className="sticker-card sticker-card-hover p-5 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#1E1B2E] bg-[#FFF3C4] text-xl">
                    {theme.emoji}
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-black text-base truncate">
                        {isZh ? theme.nameZh : theme.nameEn}
                      </h3>
                      {categoryMeta && (
                        <span className="shrink-0 rounded-full border border-[#1E1B2E]/15 bg-[#E8FAF8] px-2 py-0.5 text-[10px] font-extrabold text-[#0F766E]">
                          {isZh ? categoryMeta.nameZh : categoryMeta.nameEn}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-[#645E78] line-clamp-2">
                      {isZh ? theme.descriptionZh : theme.descriptionEn}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {theme.slots.slice(0, 6).map((slot, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-[#F4EFE6] px-2.5 py-0.5 text-xs font-bold text-[#1E1B2E]"
                    >
                      {isZh ? slot.captionZh : slot.captionEn}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trust & FAQ Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="font-display text-3xl font-bold">
            {isZh ? "常见问题与隐私保障" : "Frequently Asked Questions"}
          </h2>
          <p className="text-sm sm:text-base font-medium text-[#645E78]">
            {isZh
              ? "关于照片隐私、切图方式、积分规则的清晰承诺"
              : "Clear answers on photo privacy, lossless slicing, and credit protection"}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((item) => (
            <div key={item.q} className="sticker-panel p-5 space-y-2">
              <h3 className="text-base font-black text-[#1E1B2E]">{item.q}</h3>
              <p className="text-sm leading-relaxed text-[#645E78]">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </HomeEntry>
  );
}
