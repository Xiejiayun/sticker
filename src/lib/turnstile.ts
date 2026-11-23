export type TurnstileAction = "signup" | "login" | "google" | "resend" | "generate" | "upload";

const denied = { status: 403, code: "TURNSTILE_REJECTED", message: "Human verification failed. Please try again." } as const;
const unavailable = { status: 503, code: "TURNSTILE_UNAVAILABLE", message: "Human verification is unavailable. Please try again later." } as const;

export async function checkTurnstile(headers: Headers | undefined, action: TurnstileAction) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const secret = process.env.TURNSTILE_SECRET?.trim();
  if (!siteKey && !secret) return null;
  if (!siteKey || !secret) return unavailable;

  const token = headers?.get("x-turnstile-token")?.trim();
  if (!token || token.length > 2048) return denied;
  try {
    const hostname = new URL(process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").hostname;
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return unavailable;
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string; "error-codes"?: string[] };
    if (result["error-codes"]?.some(code => ["invalid-input-secret", "missing-input-secret", "internal-error"].includes(code))) return unavailable;
    return result.success === true && result.hostname === hostname && result.action === action ? null : denied;
  } catch {
    return unavailable;
  }
}
