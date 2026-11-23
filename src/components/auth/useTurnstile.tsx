"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { TurnstileAction } from "@/lib/turnstile";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
interface WidgetApi {
  render(container: HTMLElement, options: {
    sitekey: string; action: string; language: string; retry: "never"; appearance: "interaction-only"; size: "flexible" | "compact";
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

interface Challenge { id: number; action: TurnstileAction; trigger: Element | null; finish(token?: string): void }

function VerificationPrompt({ challenge, isZh }: { challenge: Challenge; isZh: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const hintId = useId();
  const [phase, setPhase] = useState<"silent" | "waiting" | "interactive">("silent");
  const visible = phase !== "silent";

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (!visible || !panel) return;
    panel.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      panel.close();
      const trigger = challenge.trigger;
      requestAnimationFrame(() => {
        if (document.activeElement === document.body && trigger instanceof HTMLElement && trigger.isConnected) {
          trigger.focus({ preventScroll: true });
        }
      });
    };
  }, [challenge, visible]);

  useEffect(() => {
    let active = true;
    let widgetId: string | undefined;
    const finish = (token?: string) => { if (active) challenge.finish(token); };
    const timer = window.setTimeout(finish, 120000);
    const slow = window.setTimeout(() => setPhase("waiting"), 2500);
    loadWidget().then(api => {
      if (!active || !container.current) return;
      const size = container.current.clientWidth >= 300 ? "flexible" : "compact";
      container.current.dataset.widgetSize = size;
      widgetId = api.render(container.current, {
        sitekey: siteKey!, action: challenge.action, language: isZh ? "zh-cn" : "en", retry: "never", appearance: "interaction-only",
        size,
        "before-interactive-callback": () => {
          window.clearTimeout(slow);
          if (active) setPhase("interactive");
        },
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

  const hint = phase === "interactive"
    ? (isZh ? "请勾选下方验证框，完成后会自动继续。" : "Select the checkbox below. We’ll continue automatically.")
    : (isZh ? "正在验证，请稍候。无需再次提交。" : "Checking your request. No need to submit again.");
  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={hintId}
      onCancel={event => { event.preventDefault(); challenge.finish(); }}
      className="verification-dialog sticker-card fixed inset-0 m-auto h-fit max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-md space-y-4 overflow-auto p-4 text-ink backdrop:bg-ink/50 sm:p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck aria-hidden="true" className="size-8 shrink-0 text-mint-text" />
        <h2 ref={heading} id={titleId} tabIndex={-1} className="text-xl font-black outline-none sm:text-2xl">
          {isZh ? "人机验证" : "Verify you’re human"}
        </h2>
      </div>
      <p id={hintId} role="status" className="text-base text-muted">{hint}</p>
      <div ref={container} className="text-center" />
      <button type="button" onClick={() => challenge.finish()} className="sticker-btn min-h-11 cursor-pointer bg-white px-5 text-sm font-bold">
        {isZh ? "取消验证" : "Cancel verification"}
      </button>
    </dialog>
  );
}

export function useTurnstile(isZh: boolean) {
  const sequence = useRef(0);
  const pending = useRef<Challenge | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  useEffect(() => () => { pending.current?.finish(); }, []);

  async function headersFor(action: TurnstileAction): Promise<Record<string, string>> {
    if (!siteKey) return {};
    if (pending.current) throw new Error(isZh ? "另一项验证正在进行" : "Another verification is in progress");
    return new Promise((resolve, reject) => {
      const next: Challenge = { id: ++sequence.current, action, trigger: document.activeElement, finish(token) {
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

  return { headersFor, widget: challenge && <VerificationPrompt key={challenge.id} challenge={challenge} isZh={isZh} /> };
}
