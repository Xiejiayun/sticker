import { PricingClient } from "@/components/pricing/PricingClient";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const params = await searchParams;
  return <PricingClient checkoutStatus={params.checkout} />;
}
