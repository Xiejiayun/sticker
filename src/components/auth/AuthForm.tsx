"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { BRAND } from "@/config/brand";

export function AuthForm({ googleEnabled }: { googleEnabled: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const isZh = locale === "zh";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
        });
        if (res.error) {
          setError(res.error.message || (isZh ? "注册失败" : "Sign up failed"));
          return;
        }
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) {
          setError(res.error.message || (isZh ? "邮箱或密码错误" : "Invalid email or password"));
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
      const res = await signIn.social({
        provider: "google",
        callbackURL: "/studio",
      });
      if (res?.error) {
        setError(res.error.message || (isZh ? "Google 登录失败" : "Google sign in failed"));
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-12">
      <div className="sticker-card w-full p-7 space-y-6">
        <div className="text-center space-y-2">
          <img src="/brand-icon.svg" alt={isZh ? BRAND.nameZh : BRAND.name} width={56} height={56} className="mx-auto" />
          <h1 className="text-2xl font-black">
            {mode === "signin"
              ? isZh
                ? "欢迎回来"
                : "Welcome Back"
              : isZh
                ? "创建账号 · 领 20 免费积分"
                : "Create Account · Get 20 Free Credits"}
          </h1>
          <p className="text-xs font-medium text-[#645E78]">
            {isZh
              ? "新用户注册即送 2 套 3×3 4K 表情包体验额度"
              : "New users get 2 free 3×3 4K sticker pack generations"}
          </p>
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

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[#1E1B2E]/20" />
              <span className="bg-white px-3 text-xs font-bold text-[#645E78]">
                {isZh ? "或使用邮箱" : "OR EMAIL"}
              </span>
              <div className="w-full border-t border-[#1E1B2E]/20" />
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

          {error && (
            <div className="rounded-xl border-2 border-[#EE5253] bg-[#FFF0F0] px-3 py-2 text-xs font-bold text-[#EE5253]">
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
                  ? "注册并领取 20 积分"
                  : "Sign Up & Claim 20 Credits"}
          </button>
        </form>

        <div className="text-center text-xs font-bold text-[#645E78]">
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="underline hover:text-[#1E1B2E] cursor-pointer"
            >
              {isZh ? "还没有账号？立即注册" : "No account yet? Sign up"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode("signin")}
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
