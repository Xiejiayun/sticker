"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentProps } from "react";

export function LocaleSwitchLink(props: ComponentProps<typeof Link> & { href: string }) {
  const query = useSearchParams().toString();
  return <Link {...props} href={props.href + (query ? `?${query}` : "")} />;
}
