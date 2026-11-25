"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { authClient, signIn, signUp } from "@/lib/auth-client";
import { useTurnstile } from "./useTurnstile";
import { BRAND } from "@/config/brand";

export function AuthForm({ googleEnabled, signupBonus, verifyEmail }: { googleEnabled: boolean; signupBonus: number | null; verifyEmail: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const isZh = locale === "zh";
  const { headersFor, widget } = useTurnstile(isZh);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [showResend, setShowResend] = useState(false);
  const checkInbox = isZh ? "请查看邮箱（包括垃圾邮件），点击验证链接后再登录。" : "Check your inbox or spam folder. Follow the verification link, then sign in.";
  const allowlistBlockedMessage = isZh
    ? "当前为白名单内测阶段，仅限受邀账号访问。"
    : "Access is currently restricted to allowlisted accounts.";

  function formatAuthError(
    authError: { code?: string | null; message?: string | null },
    fallback: string
  ) {
    if (authError.code === "ACCESS_NOT_ALLOWED") {
      return allowlistBlockedMessage;
    }
    return authError.message || fallback;
  }

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("verified") === "1") {
      if (query.has("error")) {
        setError(isZh ? "验证链接已失效。输入邮箱后可重新发送。" : "This link is invalid or expired. Enter your email to request another.");
        setShowResend(true);
      } else {
        setNotice(isZh ? "邮箱已验证，现在可以登录了。" : "Email verified. You can now sign in.");
      }
      return;
    }
    const authError = query.get("error");
    if (!authError) return;
    const normalized = authError.toLowerCase();
    if (
      normalized === "access_not_allowed" ||
      normalized === "unable_to_create_user" ||
      normalized === "unable_to_create_session" ||
      normalized === "access_denied"
    ) {
      setError(allowlistBlockedMessage);
    } else {
      setError(isZh ? "登录失败，请重试。" : "Sign in failed. Please try again.");
    }
  }, [allowlistBlockedMessage, isZh]);

  function switchMode(next: typeof mode) {
    setMode(next);
    setError(null);
    setNotice("");
    setShowResend(false);
  }

  async function resend() {
    setLoading(true);
    setError(null);
    setNotice("");
    try {
      const headers = await headersFor("resend");
      const res = await authClient.sendVerificationEmail({ email, callbackURL: "/auth?verified=1" }, { headers });
      if (res.error) setError(formatAuthError(res.error, isZh ? "发送失败，请重试" : "Could not send verification email"));
      else setNotice(checkInbox);
    } catch (err) { setError(err instanceof Error ? err.message : "Verification failed"); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice("");
    setLoading(true);
    try {
      const headers = await headersFor(mode === "signup" ? "signup" : "login");
      if (mode === "signup") {
        const res = await signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
          callbackURL: "/auth?verified=1",
        }, { headers });
        if (res.error) {
          setError(formatAuthError(res.error, isZh ? "注册失败" : "Sign up failed"));
          return;
        }
        if (!res.data?.token) {
          setMode("signin");
          setPassword("");
          setNotice(checkInbox);
          setShowResend(true);
          return;
        }
      } else {
        const res = await signIn.email({ email, password }, { headers });
        if (res.error) {
          if (res.error.code === "EMAIL_NOT_VERIFIED") {
            setNotice(checkInbox);
            setShowResend(true);
            return;
          }
          setError(formatAuthError(res.error, isZh ? "邮箱或密码错误" : "Invalid email or password"));
          return;
        }
      }
      router.push("/studio");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const headers = await headersFor("google");
      const res = await signIn.social({
        provider: "google",
        callbackURL: "/studio",
        errorCallbackURL: "/auth",
      }, { headers });
      if (res?.error) {
        setError(formatAuthError(res.error, isZh ? "Google 登录失败" : "Google sign in failed"));
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      {widget}
      <div className="sticker-card w-full p-7 space-y-6">
        <div className="text-center space-y-2">
          <img src="/brand-icon.svg" alt={isZh ? BRAND.nameZh : BRAND.name} width={56} height={56} className="mx-auto" />
          <h1 className="text-2xl font-black">
            {mode === "signin"
              ? isZh
                ? "欢迎回来"
                : "Welcome Back"
              : isZh
                ? "创建账号"
                : "Create Account"}
          </h1>
          {(verifyEmail || (signupBonus !== null && signupBonus > 0)) && <p className="text-xs font-medium text-[#645E78]">
            {signupBonus !== null && signupBonus > 0 && (isZh ? `新用户可领 ${signupBonus} 免费积分。` : `${signupBonus} welcome credits for new accounts. `)}
            {verifyEmail && (isZh ? "邮箱注册请先验证邮箱。" : "Verify your email to activate your email account.")}
          </p>}
        </div>

        {googleEnabled && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="sticker-btn flex w-full items-center justify-center gap-2.5 bg-white py-2.5 text-sm font-extrabold text-[#1E1B2E] cursor-pointer disabled:opacity-60"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{isZh ? "使用 Google 账号继续" : "Continue with Google"}</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-[#1E1B2E]/20" />
              <span className="shrink-0 whitespace-nowrap text-xs font-bold text-[#645E78]">
                {isZh ? "或使用邮箱" : "OR EMAIL"}
              </span>
              <div className="flex-1 border-t border-[#1E1B2E]/20" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1">
              <label htmlFor="auth-name" className="text-xs font-bold text-[#1E1B2E]">
                {isZh ? "昵称" : "Name"}
              </label>
              <div className="flex items-center gap-2 rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] px-3 py-2 focus-within:bg-white">
                <User className="h-4 w-4 shrink-0 text-[#645E78]" />
                <input
                  id="auth-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isZh ? "你的昵称" : "Your name"}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="auth-email" className="text-xs font-bold text-[#1E1B2E]">
              {isZh ? "邮箱" : "Email"}
            </label>
            <div className="flex items-center gap-2 rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] px-3 py-2 focus-within:bg-white">
              <Mail className="h-4 w-4 shrink-0 text-[#645E78]" />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="auth-password" className="text-xs font-bold text-[#1E1B2E]">
              {isZh ? "密码（至少 8 位）" : "Password (min 8 chars)"}
            </label>
            <div className="flex items-center gap-2 rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] px-3 py-2 focus-within:bg-white">
              <Lock className="h-4 w-4 shrink-0 text-[#645E78]" />
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? (isZh ? "隐藏密码" : "Hide password") : (isZh ? "显示密码" : "Show password")}
                className="cursor-pointer text-[#645E78] hover:text-[#1E1B2E]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {notice && <p role="status" className="text-sm font-semibold text-[#0F766E]">{notice}</p>}
          {showResend && <button type="button" disabled={loading || !email.trim()} onClick={resend} className="text-xs underline">
            {isZh ? "重新发送验证邮件" : "Resend verification email"}
          </button>}
          {error && (
            <div role="alert" className="rounded-xl border-2 border-[#EE5253] bg-[#FFF0F0] px-3 py-2 text-xs font-bold text-[#EE5253]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="sticker-btn w-full bg-[#FF6B6B] py-2.5 text-sm font-extrabold text-white cursor-pointer disabled:opacity-60"
          >
            {loading
              ? isZh
                ? "处理中..."
                : "Please wait..."
              : mode === "signin"
                ? isZh
                  ? "立即登录"
                  : "Sign In"
                : isZh
                  ? "注册账号"
                  : "Sign Up"}
          </button>
        </form>

        <div className="text-center text-xs font-bold text-[#645E78]">
          {mode === "signin" ? (
            <button
              type="button"
              disabled={loading} onClick={() => switchMode("signup")}
              className="underline hover:text-[#1E1B2E] cursor-pointer"
            >
              {isZh ? "还没有账号？立即注册" : "No account yet? Sign up"}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading} onClick={() => switchMode("signin")}
              className="underline hover:text-[#1E1B2E] cursor-pointer"
            >
              {isZh ? "已有账号？返回登录" : "Already have an account? Sign in"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
