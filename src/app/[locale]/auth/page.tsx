import { AuthForm } from "@/components/auth/AuthForm";

export default function AuthPage() {
  // CI only needs provider availability; the real credentials stay in Workers.
  const googleEnabled = process.env.GOOGLE_AUTH_ENABLED === undefined
    ? Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : process.env.GOOGLE_AUTH_ENABLED === "true";

  return <AuthForm googleEnabled={googleEnabled} />;
}
