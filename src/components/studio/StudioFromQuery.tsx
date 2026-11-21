"use client";

import { useSearchParams } from "next/navigation";
import { StudioWorkspace } from "./StudioWorkspace";

export function StudioFromQuery(props: { cost3x3: number; cost4x4: number }) {
  const query = useSearchParams();
  const style = query.get("style") ?? undefined;
  const theme = query.get("theme") ?? undefined;
  return (
    <StudioWorkspace
      key={JSON.stringify([style, theme])}
      {...props}
      initialStyleId={style}
      initialThemeId={theme}
    />
  );
}
