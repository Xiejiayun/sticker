# StickPop Studio — 4K 1:1 AI Sticker Pack Generator SaaS

一键生成 **4K 1:1 专属表情包** 的全栈 SaaS 网站：上传 0~4 张参考图或描述角色，选择锁定精选画风与高频主题套组，自动生成 3×3（9 张）或 4×4（16 张）风格一致的 4K 贴纸宫格图，并在浏览器端实时切图、Flood-Fill 去背景、添加贴纸白边与一键打包导出（原图 / 微信 240×240 / Telegram 512×512 ZIP）。

## 核心文档

- 📐 **[架构设计与开发规划方案 (docs/DESIGN_PLAN.md)](./docs/DESIGN_PLAN.md)**
- 🔑 **[后续所需外部资源与获取配置指南 (docs/RESOURCES_AND_SETUP.md)](./docs/RESOURCES_AND_SETUP.md)**

## 技术栈

- **框架与部署**：Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Cloudflare Workers (`@opennextjs/cloudflare`)
- **数据库与认证**：Neon PostgreSQL + Drizzle ORM + Better Auth (Email & Google OAuth)
- **存储与图像处理**：Cloudflare R2 + 浏览器端 Canvas / JSZip（零服务端切图算力消耗）
- **AI 与支付**：可插拔 AI Provider（`mock` / `openai-relay` / `gemini-relay`）+ 可插拔支付层（内置 Stripe Checkout & 幂等 Webhook）

## 快速开始

```bash
npm install
cp .env.example .env.local
# 填入 DATABASE_URL 与 BETTER_AUTH_SECRET（详见 docs/RESOURCES_AND_SETUP.md）
npm run db:push
npm run dev
```
