"use client";

import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { PackExporter } from "./PackExporter";

export function PackFromQuery() {
  const id = useSearchParams().get("id");
  const locale = useLocale();
  if (!id) return <p role="alert">{locale === "zh" ? "缺少作品 ID" : "Missing pack ID"}</p>;
  return <PackExporter key={id} packId={id} />;
}
