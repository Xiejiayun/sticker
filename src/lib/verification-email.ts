export function requiresVerifiedEmail(): boolean {
  const setting = process.env.AUTH_REQUIRE_VERIFIED_EMAIL?.trim();
  if (!setting || setting === "false") return false;
  if (setting === "true") return true;
  throw new Error("AUTH_REQUIRE_VERIFIED_EMAIL must be true or false");
}

export async function sendVerificationEmail({ user, url }: { user: { email: string }; url: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!key || !from) throw new Error("Verification email delivery is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [user.email], subject: "贴纸酱 StickerJam · 验证邮箱 / Verify your email",
      text: `点击链接验证你的贴纸酱邮箱。\nVerify your StickerJam email address:\n\n${url}\n\n若非本人操作，请忽略此邮件。 If you did not request this, ignore this email.`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Verification email provider returned HTTP ${response.status}`);
}
