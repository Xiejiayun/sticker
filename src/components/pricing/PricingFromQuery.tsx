"use client";

import { useSearchParams } from "next/navigation";
import { PricingClient } from "./PricingClient";

export function PricingFromQuery() {
  const status = useSearchParams().get("checkout") ?? undefined;
  return <PricingClient checkoutStatus={status} />;
}
