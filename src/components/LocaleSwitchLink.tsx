"use client";

import type { ReactNode } from "react";

export function LocaleSwitchButton({
  targetLocale,
  className,
  children,
}: {
  targetLocale: "zh" | "en";
  className?: string;
  children: ReactNode;
}) {
  function handleSwitch() {
    document.cookie = `NEXT_LOCALE=${targetLocale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return (
    <button type="button" onClick={handleSwitch} className={className}>
      {children}
    </button>
  );
}
