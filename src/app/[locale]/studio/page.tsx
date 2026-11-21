import { StudioWorkspace } from "@/components/studio/StudioWorkspace";
import { getGridCreditCost } from "@/config/pricing";
import { Suspense } from "react";
import { StudioFromQuery } from "@/components/studio/StudioFromQuery";

export default function StudioPage() {
  const costs = { cost3x3: getGridCreditCost("3x3"), cost4x4: getGridCreditCost("4x4") };
  return (
    <Suspense fallback={<StudioWorkspace {...costs} />}>
      <StudioFromQuery {...costs} />
    </Suspense>
  );
}
