"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@/lib/auth-client";

export function HomeEntry({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const signedIn = Boolean(session?.user);
  const [hasShownLanding, setHasShownLanding] = useState(false);
  const awaitingInitialSession = isPending && !hasShownLanding;
  const router = useRouter();
  const translate = useTranslations("common");

  useEffect(() => {
    if (signedIn) {
      router.replace(`/studio${window.location.search}`);
    } else if (!isPending) {
      setHasShownLanding(true);
    }
  }, [isPending, router, signedIn]);

  return (
    <>
      {(awaitingInitialSession || signedIn) && (
        <p role="status" className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted sm:px-6 noscript:hidden">
          {translate("loading")}
        </p>
      )}
      {!signedIn && (
        <div className={`mx-auto max-w-6xl space-y-20 px-4 py-10 sm:px-6 sm:py-14 ${awaitingInitialSession ? "hidden noscript:block" : ""}`}>
          {children}
        </div>
      )}
    </>
  );
}
