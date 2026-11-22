import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/Navbar";
import { BRAND } from "@/config/brand";
import "../globals.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isZh = locale === "zh";

  return {
    title: isZh
      ? `${BRAND.nameZh} ${BRAND.name} — 专属表情包，一次成图，轻松切图`
      : `${BRAND.name} — Create & Slice Custom Sticker Packs`,
    applicationName: BRAND.name,
    description: isZh
      ? "上传参考图或描述角色，一次生成整套 4K 表情包宫格，轻松切图下载单张 PNG 或整套 ZIP。"
      : "Create a consistent sticker sheet from your photos or ideas, then slice and download your finished expressions as PNG or ZIP.",
    icons: {
      icon: [{ url: "/favicon.ico", sizes: "32x32" }, { url: "/brand-icon.svg", type: "image/svg+xml" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    manifest: "/site.webmanifest",
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Navbar />
          <main>{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
