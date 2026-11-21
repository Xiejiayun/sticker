"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Mail, Lock, User } from "lucide-react";
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
      router.push(`/${locale}/studio`);
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
        callbackURL: `/${locale}/studio`,
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
              className="sticker-btn flex w-full items-center justify-center gap-2 bg-white py-2.5 text-sm font-extrabold text-[#1E1B2E] cursor-pointer disabled:opacity-60"
            >
              <span>G</span>
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
              <label className="text-xs font-bold text-[#1E1B2E]">
                {isZh ? "昵称" : "Name"}
              </label>
              <div className="flex items-center gap-2 rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] px-3 py-2">
                <User className="h-4 w-4 text-[#645E78]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isZh ? "你的昵称" : "Your name"}
                  className="w-full bg-transparent text-sm font-medium outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#1E1B2E]">
              {isZh ? "邮箱" : "Email"}
            </label>
            <div className="flex items-center gap-2 rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] px-3 py-2">
              <Mail className="h-4 w-4 text-[#645E78]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#1E1B2E]">
              {isZh ? "密码（至少 8 位）" : "Password (min 8 chars)"}
            </label>
            <div className="flex items-center gap-2 rounded-xl border-2 border-[#1E1B2E] bg-[#FFFDF7] px-3 py-2">
              <Lock className="h-4 w-4 text-[#645E78]" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm font-medium outline-none"
              />
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
