export const DEFAULT_ALLOWLIST_EMAILS = [
  "furnace09@gmail.com",
  "furnace2026@gmail.com",
] as const;

export const DEFAULT_VIP_CREDIT_EMAILS = [
  "furnace09@gmail.com",
  "furnace2026@gmail.com",
] as const;

export const DEFAULT_VIP_SIGNUP_BONUS_CREDITS = 1000;

export const ACCESS_NOT_ALLOWED_CODE = "ACCESS_NOT_ALLOWED";
export const ACCESS_NOT_ALLOWED_MESSAGE =
  "Access is currently restricted to allowlisted accounts.";

const DISABLED_TOKENS = new Set(["*", "off", "false", "disabled", "none"]);

export function normalizeEmail(email: string | null | undefined): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function parseEmailList(raw: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const normalized = normalizeEmail(part);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      emails.push(normalized);
    }
  }
  return emails;
}

/**
 * Returns the active email allowlist, or null when allowlist enforcement is
 * explicitly disabled (AUTH_ACCESS_ALLOWLIST=* / off / false / disabled).
 * When unset or empty, defaults to DEFAULT_ALLOWLIST_EMAILS.
 */
export function getAccessAllowlist(): Set<string> | null {
  const raw = process.env.AUTH_ACCESS_ALLOWLIST?.trim();
  if (!raw) {
    return new Set(DEFAULT_ALLOWLIST_EMAILS);
  }
  if (DISABLED_TOKENS.has(raw.toLowerCase())) {
    return null;
  }
  return new Set(parseEmailList(raw));
}

export function isAccessAllowlistEnabled(): boolean {
  return getAccessAllowlist() !== null;
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  const allowlist = getAccessAllowlist();
  if (!allowlist) return true;
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && allowlist.has(normalized);
}

export function getVipCreditEmails(): Set<string> {
  const raw = process.env.CREDITS_VIP_EMAILS?.trim();
  if (!raw) {
    return new Set(DEFAULT_VIP_CREDIT_EMAILS);
  }
  if (DISABLED_TOKENS.has(raw.toLowerCase())) {
    return new Set();
  }
  return new Set(parseEmailList(raw));
}

export function isVipCreditEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && getVipCreditEmails().has(normalized);
}

export function getVipSignupBonusCredits(): number {
  const raw = process.env.CREDITS_VIP_SIGNUP_BONUS?.trim();
  if (!raw) return DEFAULT_VIP_SIGNUP_BONUS_CREDITS;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_VIP_SIGNUP_BONUS_CREDITS;
}

export function getSignupBonusCreditsForEmail(
  email: string | null | undefined,
  defaultBonus: number
): number {
  if (isVipCreditEmail(email)) {
    return getVipSignupBonusCredits();
  }
  return defaultBonus;
}
