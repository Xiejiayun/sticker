import { AuthForm } from "@/components/auth/AuthForm";
import { getAdvertisedSignupBonusCredits } from "@/config/pricing";
import { requiresVerifiedEmail } from "@/lib/verification-email";

export default function AuthPage() {
  // CI only needs provider availability; the real credentials stay in Workers.
  const googleEnabled = process.env.GOOGLE_AUTH_ENABLED === undefined
    ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : process.env.GOOGLE_AUTH_ENABLED === "true";

  return <AuthForm googleEnabled={googleEnabled} signupBonus={getAdvertisedSignupBonusCredits()} verifyEmail={requiresVerifiedEmail()} />;
}
