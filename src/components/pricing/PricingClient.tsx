"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Coins, Loader2, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, RefreshCw, Infinity as InfinityIcon } from "lucide-react";
import { DEFAULT_CREDIT_PACKAGES } from "@/config/pricing";
import { useSession } from "@/lib/auth-client";

interface LedgerEntry {
  id: string;
  delta: number;
  type: "SIGNUP_BONUS" | "PURCHASE" | "HOLD" | "REFUND" | "ADJUSTMENT";
  note: string | null;
  createdAt: string;
}

const LEDGER_LABELS: Record<
  LedgerEntry["type"],
  { zh: string; en: string; badgeClass: string }
> = {
  SIGNUP_BONUS: {
    zh: "注册赠送",
    en: "Signup Bonus",
    badgeClass: "bg-[#FFF3C4] text-[#1E1B2E]",
  },
  PURCHASE: {
    zh: "积分充值",
    en: "Purchase",
    badgeClass: "bg-[#E8FAF8] text-[#178875]",
  },
  HOLD: {
    zh: "生成消费",
    en: "Pack Generation",
    badgeClass: "bg-[#FFF0F0] text-[#EE5253]",
  },
  REFUND: {
    zh: "失败退还",
    en: "Auto Refund",
    badgeClass: "bg-[#E8F4FD] text-[#1D4ED8]",
  },
  ADJUSTMENT: {
    zh: "积分调整",
    en: "Balance Adjustment",
    badgeClass: "bg-[#F4EFE6] text-[#1E1B2E]",
  },
};

export function PricingClient({ checkoutStatus }: { checkoutStatus?: string }) {
  const locale = useLocale();
  const isZh = locale === "zh";
  const { data: session } = useSession();

  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/credits")
      .then((res) => (res.ok ? res.json() as Promise<{ balance?: number; ledger?: LedgerEntry[] }> : null))
      .then((data: { balance?: number; ledger?: LedgerEntry[] } | null) => {
        if (typeof data?.balance === "number") setBalance(data.balance);
        if (Array.isArray(data?.ledger)) setLedger(data.ledger);
      })
      .catch(() => {});
  }, [session?.user, checkoutStatus]);

  async function handleBuy(packageId: string) {
    setError(null);
    if (!session?.user) {
      setError(isZh ? "请先登录后再购买积分包" : "Please sign in before purchasing credits");
      return;
    }

    setBuyingId(packageId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, locale }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!res.ok || !data.checkoutUrl) {
        setError(data.error || (isZh ? "创建支付链接失败（请检查 Stripe 配置）" : "Failed to start checkout"));
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 space-y-10">
      {/* Checkout feedback banners */}
      {checkoutStatus === "success" && (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-[#2EC4B6] bg-[#E8FAF8] px-5 py-3.5 text-sm font-extrabold text-[#1E1B2E]">
          <CheckCircle2 className="h-5 w-5 text-[#2EC4B6]" />
          <span>
            {isZh
              ? "支付成功！积分将在几秒内自动到账，可刷新页面查看最新余额。"
              : "Payment succeeded! Your credits will arrive within seconds."}
          </span>
        </div>
      )}

      {checkoutStatus === "canceled" && (
        <div className="flex items-center gap-2.5 rounded-2xl border-2 border-[#FB5607] bg-[#FFF4EE] px-5 py-3.5 text-sm font-extrabold text-[#1E1B2E]">
          <AlertCircle className="h-5 w-5 text-[#FB5607]" />
          <span>{isZh ? "已取消本次支付。" : "Checkout was canceled."}</span>
        </div>
      )}

      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black">
          {isZh ? "按需购买积分包 · 永不过期" : "One-Time Credit Packs · Never Expire"}
        </h1>
        <p className="text-sm sm:text-base font-medium text-[#645E78]">
          {isZh
            ? "3×3 表情包消耗 10 积分，4×4 表情包消耗 15 积分，生成失败自动全额退还。"
            : "3×3 packs cost 10 credits, 4×4 packs cost 15 credits. Auto-refund on failure."}
        </p>

        {session?.user && balance !== null && (
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#1E1B2E] bg-[#FFF3C4] px-5 py-1.5 text-sm font-black">
              <Coins className="h-4 w-4 text-[#FB5607]" />
              <span>
                {isZh ? `当前可用余额：${balance} 积分` : `Current Balance: ${balance} Credits`}
              </span>
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-[#EE5253] bg-[#FFF0F0] px-4 py-3 text-sm font-bold text-[#EE5253]">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Package Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {DEFAULT_CREDIT_PACKAGES.map((pkg) => {
          const packs3x3 = Math.floor(pkg.credits / 10);
          const perPackUsd = (pkg.priceCents / 100 / packs3x3).toFixed(2);
          const discountBadge =
            pkg.id === "pack-creator"
              ? isZh
                ? `约 $${perPackUsd} / 套 · 立省 13%`
                : `~$${perPackUsd} / pack · Save 13%`
              : pkg.id === "pack-studio"
                ? isZh
                  ? `低至 $${perPackUsd} / 套 · 立省 25%`
                  : `~$${perPackUsd} / pack · Save 25%`
                : isZh
                  ? `约 $${perPackUsd} / 套 (3×3)`
                  : `~$${perPackUsd} / 3×3 pack`;

          return (
          <div
            key={pkg.id}
            className={`sticker-card p-6 flex flex-col justify-between space-y-6 ${
              pkg.popular ? "bg-[#FFF3C4]" : "bg-white"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-black">
                  {isZh ? pkg.nameZh : pkg.nameEn}
                </h2>
                {pkg.popular && (
                  <span className="rounded-full border-2 border-[#1E1B2E] bg-[#E04848] px-2.5 py-0.5 text-xs font-extrabold text-white">
                    {isZh ? "推荐" : "Popular"}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-[#645E78]">
                {isZh ? pkg.descriptionZh : pkg.descriptionEn}
              </p>
              <span className="inline-block rounded-full bg-[#E8FAF8] px-2.5 py-0.5 text-[11px] font-extrabold text-[#0F766E]">
                {discountBadge}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black tabular-nums">
                  ${(pkg.priceCents / 100).toFixed(2)}
                </span>
                <span className="text-xs font-bold text-[#645E78]">
                  / {pkg.credits} {isZh ? "积分" : "credits"}
                </span>
              </div>

              {session?.user ? (
                <button
                  type="button"
                  onClick={() => handleBuy(pkg.id)}
                  disabled={buyingId !== null}
                  className="sticker-btn flex w-full items-center justify-center gap-2 bg-[#1E1B2E] py-2.5 text-sm font-extrabold text-white cursor-pointer disabled:opacity-60"
                >
                  {buyingId === pkg.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isZh ? "跳转 Stripe 支付..." : "Redirecting to Stripe..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{isZh ? "立即购买" : "Buy Now"}</span>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/auth"
                  className="sticker-btn flex w-full items-center justify-center bg-[#E04848] py-2.5 text-sm font-extrabold text-white"
                >
                  {isZh ? "登录后购买" : "Sign In to Buy"}
                </Link>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Trust Guarantee Strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sticker-panel flex items-center gap-3 p-4">
          <InfinityIcon className="h-5 w-5 shrink-0 text-[#0F766E]" />
          <div className="text-xs">
            <div className="font-black text-[#1E1B2E]">{isZh ? "积分永久有效" : "Credits Never Expire"}</div>
            <div className="text-[#645E78]">{isZh ? "随时按需创作，无月费捆绑" : "Create anytime with zero subscriptions"}</div>
          </div>
        </div>
        <div className="sticker-panel flex items-center gap-3 p-4">
          <RefreshCw className="h-5 w-5 shrink-0 text-[#0F766E]" />
          <div className="text-xs">
            <div className="font-black text-[#1E1B2E]">{isZh ? "失败自动全额退还" : "Auto-Refund on Failure"}</div>
            <div className="text-[#645E78]">{isZh ? "超时或生成异常秒退原账户" : "Instant wallet refund if generation fails"}</div>
          </div>
        </div>
        <div className="sticker-panel flex items-center gap-3 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#0F766E]" />
          <div className="text-xs">
            <div className="font-black text-[#1E1B2E]">{isZh ? "Stripe 安全加密结账" : "Encrypted Stripe Checkout"}</div>
            <div className="text-[#645E78]">{isZh ? "支持国际信用卡与隐私保护" : "Trusted checkout · Photo privacy protected"}</div>
          </div>
        </div>
      </div>

      {/* Credit Ledger History */}
      {session?.user && ledger.length > 0 && (
        <section className="sticker-card p-6 space-y-4">
          <h2 className="text-lg font-black">{isZh ? "近期积分明细" : "Recent Credit History"}</h2>
          <div className="divide-y divide-[#1E1B2E]/10">
            {ledger.map((item) => {
              const meta = LEDGER_LABELS[item.type];
              return (
                <div key={item.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex rounded-full border border-[#1E1B2E]/20 px-2.5 py-0.5 text-[11px] font-extrabold ${
                        meta ? meta.badgeClass : "bg-neutral-100 text-[#1E1B2E]"
                      }`}
                    >
                      {meta ? (isZh ? meta.zh : meta.en) : item.type}
                    </span>
                    {item.note && <div className="text-[#645E78]">{item.note}</div>}
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-black text-sm tabular-nums ${
                        item.delta >= 0 ? "text-[#0F766E]" : "text-[#C93636]"
                      }`}
                    >
                      {item.delta >= 0 ? `+${item.delta}` : item.delta}
                    </div>
                    <div className="text-[11px] text-[#645E78]">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
