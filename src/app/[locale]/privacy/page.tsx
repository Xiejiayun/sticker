import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isZh = locale === "zh";

  const sections = isZh
    ? [
        {
          title: "1. 参考照片的使用与隔离原则",
          body: "您在创作工作台上传的个人照片、宠物照片或参考图片仅用于当次表情包宫格生成，存储在您名下的私有对象存储空间中。我们不会公开展示您的参考照片或生成作品，也不会将您上传的照片用于训练公共 AI 模型。",
        },
        {
          title: "2. 切图与导出处理的隐私性",
          body: "生成完成后的宫格裁切、透明背景处理、白边描边与 PNG/ZIP 打包均在您的本地浏览器 Canvas 中完成，不会额外上传到第三方图像处理服务器。",
        },
        {
          title: "3. 账号数据与作品清理",
          body: "您可以在“我的作品库”中随时删除已生成的表情包，对应原图对象将同步从云端存储中删除。如需注销账号或清理全部历史数据，可通过账号绑定邮箱联系支持团队处理。",
        },
        {
          title: "4. Cookie 与支付安全",
          body: "我们仅使用必要的登录会话 Cookie 与语言偏好 Cookie（NEXT_LOCALE）。所有线上支付均由 Stripe 加密托管完成，贴纸酱不采集或保存您的银行卡号信息。",
        },
        {
          title: "5. 人机验证与邮箱确认",
          body: "启用防刷时，受保护的操作会加载 Cloudflare Turnstile。启用邮箱验证时，我们通过 Resend 向注册邮箱发送验证链接，不会向这两项服务发送您的参考照片。",
        },
      ]
    : [
        {
          title: "1. How Your Reference Photos Are Used",
          body: "Reference photos of yourself, loved ones, or pets are stored in private object storage and used strictly to generate your requested sticker sheet. We never publish your uploads or use your photos to train public AI models.",
        },
        {
          title: "2. Local Browser Slicing & Export",
          body: "Grid slicing, optional background removal, die-cut borders, and PNG/ZIP packaging run locally inside your browser Canvas—no extra image copies are sent to third-party slicing servers.",
        },
        {
          title: "3. Deletion & Data Retention",
          body: "You can delete any sticker pack directly from My Packs at any time, which removes the associated sheet from cloud storage. You may also contact support from your registered email to purge your account.",
        },
        {
          title: "4. Cookies & Payment Security",
          body: "We only use essential authentication session cookies and your language preference cookie (NEXT_LOCALE). All payments are processed securely via Stripe Checkout; we never store raw card details.",
        },
        {
          title: "5. Human and Email Verification",
          body: "When bot protection is enabled, protected actions load Cloudflare Turnstile. When email verification is enabled, we send a verification link to your registration address through Resend. Neither service receives your reference photos.",
        },
      ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#645E78] hover:text-[#1E1B2E]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{isZh ? "返回首页" : "Back to Home"}</span>
      </Link>

      <div className="sticker-card p-7 sm:p-9 space-y-6">
        <div className="space-y-2 border-b border-[#1E1B2E]/10 pb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0F766E]/30 bg-[#E8FAF8] px-3 py-1 text-xs font-extrabold text-[#0F766E]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{isZh ? "隐私与数据保护" : "Privacy & Data Protection"}</span>
          </span>
          <h1 className="font-display text-3xl font-bold text-[#1E1B2E]">
            {isZh ? "隐私政策" : "Privacy Policy"}
          </h1>
          <p className="text-xs font-semibold text-[#645E78]">
            {isZh ? "生效更新：2026-11-23" : "Last updated: November 23, 2026"}
          </p>
        </div>

        <div className="space-y-5">
          {sections.map((item) => (
            <section key={item.title} className="space-y-1.5">
              <h2 className="text-base font-black text-[#1E1B2E]">{item.title}</h2>
              <p className="text-sm leading-relaxed text-[#645E78]">{item.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
