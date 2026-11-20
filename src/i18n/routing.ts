import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["zh", "en"],
  defaultLocale: "zh",
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];
