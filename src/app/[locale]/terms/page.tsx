import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, FileText } from "lucide-react";

export default async function TermsPage({
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
          title: "1. 服务说明与输出规格",
          body: "贴纸酱（StickerJam）提供 AI 定制表情包宫格生成与浏览器端切图工具。系统会输出高清 1:1 宫格原图并自动切分为单张表情。AI 生成受模型随机性影响，实际画面细节以生成结果为准。",
        },
        {
          title: "2. 积分包、有效期与自动退还机制",
          body: "一次性购买的积分包永久有效、不会过期。生成任务提交时预扣对应积分（当前 3×3 为 10 积分，4×4 为 15 积分）；若因系统超时或模型服务异常导致生成失败，系统将自动全额退还本次扣除的积分至您的账户钱包。",
        },
        {
          title: "3. 作品归属与使用规范",
          body: "您通过付费积分生成的表情包作品可供个人聊天、社交媒体展示及合规商业用途使用。请确保您上传的参考照片拥有合法授权，不得上传违法、侵权、色情或侵犯他人肖像权的内容。",
        },
        {
          title: "4. 退款与账号安全",
          body: "未消耗的完整积分包如因重复扣款或支付故障需申请核退，请联系客服提供订单号核实处理。请妥善保管账号密码与登录凭据。",
        },
      ]
    : [
        {
          title: "1. Service & Output Specifications",
          body: "StickerJam provides AI custom sticker sheet generation and client-side slicing tools. Standard generation outputs a high-resolution 1:1 master sheet sliced into individual stickers. Generative artwork varies naturally by model output.",
        },
        {
          title: "2. Credits, Expiration & Auto-Refunds",
          body: "Purchased credit packs never expire. Credits are held when generation starts (10 credits for 3×3, 15 credits for 4×4). If a generation fails or times out due to upstream provider errors, held credits are automatically refunded in full to your wallet.",
        },
        {
          title: "3. Content Ownership & Acceptable Use",
          body: "You may use sticker packs generated with paid credits for personal messaging, creator channels, and compliant commercial projects. You confirm that you own or have permission to use all uploaded reference photos and will not submit unlawful or infringing content.",
        },
        {
          title: "4. Billing Support",
          body: "If you encounter duplicate charges or checkout issues for unused credit packs, reach out with your order ID for prompt resolution.",
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
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1E1B2E]/20 bg-[#FFF3C4] px-3 py-1 text-xs font-extrabold text-[#1E1B2E]">
            <FileText className="h-3.5 w-3.5" />
            <span>{isZh ? "用户协议与积分规则" : "Terms & Credit Policy"}</span>
          </span>
          <h1 className="font-display text-3xl font-bold text-[#1E1B2E]">
            {isZh ? "服务条款" : "Terms of Service"}
          </h1>
          <p className="text-xs font-semibold text-[#645E78]">
            {isZh ? "生效更新：2026-11-22" : "Last updated: November 22, 2026"}
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
