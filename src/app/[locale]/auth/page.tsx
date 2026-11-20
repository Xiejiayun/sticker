import { AuthForm } from "@/components/auth/AuthForm";

export default function AuthPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  return <AuthForm googleEnabled={googleEnabled} />;
}
