"use client";

import { useEffect, useRef, useState } from "react";
import type { TurnstileAction } from "@/lib/turnstile";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
interface WidgetApi {
  render(container: HTMLElement, options: {
    sitekey: string; action: string; language: string; retry: "never"; appearance: "interaction-only";
    callback(token: string): void; "error-callback"(): void; "expired-callback"(): void; "timeout-callback"(): void;
    "before-interactive-callback"(): void;
  }): string;
  remove(id: string): void;
}
declare global { interface Window { turnstile?: WidgetApi } }

let loadingScript: Promise<WidgetApi> | undefined;
function loadWidget() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loadingScript) return loadingScript;
  loadingScript = new Promise<WidgetApi>((resolve, reject) => {
    const script = document.createElement("script");
    function failed() {
      window.clearTimeout(timer);
      loadingScript = undefined;
      script.remove();
      reject(new Error("Turnstile script unavailable"));
    }
    const timer = window.setTimeout(failed, 15000);
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile); else failed();
    };
    script.onerror = failed;
    document.head.appendChild(script);
  });
  return loadingScript;
}

interface Challenge { action: TurnstileAction; finish(token?: string): void }

function VerificationPrompt({ challenge, isZh }: { challenge: Challenge; isZh: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    let widgetId: string | undefined;
    const finish = (token?: string) => { if (active) challenge.finish(token); };
    const timer = window.setTimeout(finish, 120000);
    const slow = window.setTimeout(() => setVisible(true), 2500);
    loadWidget().then(api => {
      if (!active || !container.current) return;
      widgetId = api.render(container.current, {
        sitekey: siteKey!, action: challenge.action, language: isZh ? "zh-cn" : "en", retry: "never", appearance: "interaction-only",
        "before-interactive-callback": () => { if (active) setVisible(true); },
        callback: finish, "error-callback": () => finish(), "expired-callback": () => finish(), "timeout-callback": () => finish(),
      });
    }).catch(() => finish());
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearTimeout(slow);
      if (widgetId !== undefined) window.turnstile?.remove(widgetId);
    };
  }, [challenge, isZh]);

  const title = isZh ? "请完成人机验证" : "Verify you’re human";
  return <section aria-label={title} className={`fixed bottom-20 right-2 z-50 max-w-[calc(100vw-1rem)] ${visible ? "sticker-card space-y-2 p-3" : ""}`}>
    {visible && <p role="status" className="text-sm font-bold">{title}</p>}
    <div ref={container} />
    {visible && <button type="button" className="text-xs underline" onClick={() => challenge.finish()}>{isZh ? "取消" : "Cancel"}</button>}
  </section>;
}

export function useTurnstile(isZh: boolean) {
  const pending = useRef<Challenge | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  useEffect(() => () => { pending.current?.finish(); }, []);

  async function headersFor(action: TurnstileAction): Promise<Record<string, string>> {
    if (!siteKey) return {};
    if (pending.current) throw new Error(isZh ? "另一项验证正在进行" : "Another verification is in progress");
    return new Promise((resolve, reject) => {
      const next: Challenge = { action, finish(token) {
        if (pending.current !== next) return;
        pending.current = null;
        setChallenge(null);
        if (token) resolve({ "x-turnstile-token": token });
        else reject(new Error(isZh ? "人机验证未完成，请重试" : "Verification was not completed. Please try again."));
      } };
      pending.current = next;
      setChallenge(next);
    });
  }

  return { headersFor, widget: challenge && <VerificationPrompt key={challenge.action} challenge={challenge} isZh={isZh} /> };
}
