# 贴纸酱 StickerJam — 专属表情包，一次成图，轻松切图

上传参考图或描述角色，选择画风与主题，一次生成 3×3（9 张）或 4×4（16 张）表情宫格。成图后直接进入“切图并下载”，默认按原像素切格，保留原图细节与背景，不额外添加白边。支持单张 PNG、整套 ZIP，以及微信 240×240 / Telegram 512×512 尺寸；透明背景为可选导出方式。

品牌图标源文件为 `public/brand-icon.svg`，同时提供浏览器页签和手机图标。线上图像模型与 2048×2048 配置保持不变。提示词强调一致角色、完整构图与干净轮廓；实际成图质量仍取决于模型，切图不会自动修复模型画错的内容。

## 核心文档

- 📐 **[架构设计与开发规划方案 (docs/DESIGN_PLAN.md)](./docs/DESIGN_PLAN.md)**
- 🔑 **[后续所需外部资源与获取配置指南 (docs/RESOURCES_AND_SETUP.md)](./docs/RESOURCES_AND_SETUP.md)**
- ☁️ **[Cloudflare 免费部署与动态功能限制](./docs/CLOUDFLARE_DEPLOYMENT.md)**
- 🖼️ **[R2 图片存储与数据清理恢复](./docs/R2_STORAGE.md)**

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

## 验证

`npm run typecheck` 检查类型；`npm run test:product` 验证宫格整数边界和生成提示约束。`npm run test:slicer` 启动本地浏览器回归页，打开命令输出的地址，确认 7 项 Canvas / PNG / ZIP 检查全部 PASS。该页面使用合成图，不调用 AI 或生产接口。
