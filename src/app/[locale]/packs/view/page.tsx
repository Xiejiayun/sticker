import { Suspense } from "react";
import { PackFromQuery } from "@/components/exporter/PackFromQuery";

export default function PackViewPage() {
  return <Suspense><PackFromQuery /></Suspense>;
}
