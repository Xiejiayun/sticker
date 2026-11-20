import { StudioWorkspace } from "@/components/studio/StudioWorkspace";
import { getGridCreditCost } from "@/config/pricing";

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string; theme?: string }>;
}) {
  const params = await searchParams;

  return (
    <StudioWorkspace
      initialStyleId={params.style}
      initialThemeId={params.theme}
      cost3x3={getGridCreditCost("3x3")}
      cost4x4={getGridCreditCost("4x4")}
    />
  );
}
