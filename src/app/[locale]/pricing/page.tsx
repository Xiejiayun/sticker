import { PricingClient } from "@/components/pricing/PricingClient";
import { Suspense } from "react";
import { PricingFromQuery } from "@/components/pricing/PricingFromQuery";

export default function PricingPage() {
  return <Suspense fallback={<PricingClient />}><PricingFromQuery /></Suspense>;
}
