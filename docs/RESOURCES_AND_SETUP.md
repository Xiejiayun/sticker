# 后续所需外部资源与获取配置指南

本项目采用**零固定成本起步**架构，除 AI 生图 API 按量付费外，托管、数据库、对象存储、认证和支付平台均提供免费额度或零月费方案。以下是每一项资源的获取方式与配置步骤。

---

## 资源总览清单

| 序号 | 资源 | 是否必需 | 免费额度 / 费用 | 对应环境变量 |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Neon PostgreSQL** | 必需（注册/任务/积分） | 0.5 GB 存储、190 计算小时/月免费 | `DATABASE_URL` |
| 2 | **Better Auth 密钥** | 必需 | 本地随机生成，完全免费 | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| 3 | **Cloudflare 账号（Workers + R2）** | 上线必需（本地开发可选） | Workers 10万次/天免费；R2 10GB 存储 + **零出站流量费** | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` |
| 4 | **AI 4K 生图 API（中转/官方）** | 正式生图必需（测试可用 `mock`） | 按次计费（本地调试可先设 `AI_IMAGE_PROVIDER=mock` 免费跑通） | `AI_IMAGE_PROVIDER`, `AI_IMAGE_API_BASE`, `AI_IMAGE_API_KEY`, `AI_IMAGE_MODEL` |
| 5 | **Google OAuth** | 可选（不配仍支持邮箱注册登录） | 完全免费 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| 6 | **Stripe** | 收费上线必需 | 无月费，仅成交手续费 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| 7 | **LLM 润色 API** | 可选（默认关闭） | 按 Token 计费（极低） | `LLM_ENHANCE_ENABLED`, `LLM_ENHANCE_API_BASE`, `LLM_ENHANCE_API_KEY`, `LLM_ENHANCE_MODEL` |

---

## 1. Neon PostgreSQL（数据库）

1. 访问 [https://neon.tech](https://neon.tech) 并使用 GitHub / Google 登录。
2. 点击 **Create Project**，选择离目标用户较近的区域（如 `Singapore` 或 `US East`）。
3. 在 Dashboard 点击 **Connect**，复制 **Connection string**（格式类似 `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`）。
4. 填入 `.env.local` 的 `DATABASE_URL`。
5. 在项目根目录执行以下命令自动创建全部数据表：
   ```bash
   npm run db:push
   ```

---

## 2. Better Auth 密钥（本地生成）

在终端生成一个 32 位以上随机字符串填入 `BETTER_AUTH_SECRET`：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
本地开发设置 `BETTER_AUTH_URL=http://localhost:3000`；部署上线后改为你的正式域名（如 `https://sticker.yourdomain.com`）。

---

## 3. Cloudflare R2（对象存储）与 Workers 部署

### 3.1 创建 R2 Bucket 并获取 S3 密钥
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)（首次开通 R2 需绑定信用卡/PayPal 验证，10GB 以内不扣费）。
2. 左侧菜单进入 **R2 Object Storage** → 点击 **Create bucket**，命名为 `stickerjam`。
3. 开启公开访问（推荐）：进入 Bucket 的 **Settings** → **Public access** → 启用 **R2.dev subdomain** 或绑定自定义域名（如 `https://cdn.yourdomain.com`），将其填入 `R2_PUBLIC_URL`。
4. 返回 R2 首页 → 点击右侧 **Manage R2 API Tokens** → **Create API token**：
   - Permissions 选择 **Object Read & Write**
   - Specify bucket 选择 `stickerjam`
   - 创建后记录：`Access Key ID`（`R2_ACCESS_KEY_ID`）与 `Secret Access Key`（`R2_SECRET_ACCESS_KEY`）。
5. Cloudflare 账号主页 URL 或 R2 右侧栏复制 **Account ID**，填入 `R2_ACCOUNT_ID`。

### 3.2 配置 R2 CORS（极其重要！）
浏览器端 Canvas 需要读取 R2 中的 4K 原图像素进行切图与抠图，必须在 R2 Bucket → **Settings** → **CORS Policy** 添加以下规则：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://你的正式域名.com"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 3.3 部署到 Cloudflare Workers
1. 本地登录 Wrangler：
   ```bash
   npx wrangler login
   ```
2. 将生产环境变量写入 Cloudflare Workers Secrets（推荐在 Cloudflare Dashboard → Workers & Pages → `sticker-studio` → Settings → Variables and Secrets 中批量填入 `.env.example` 中的所有变量）。
3. 执行构建并发布：
   ```bash
   npm run cf:deploy
   ```

---

## 4. AI 4K 图像生成 API（可插拔 Provider）

项目内置 3 种模式，通过 `AI_IMAGE_PROVIDER` 一键切换：

### 模式 A：本地零成本调试（默认）
```env
AI_IMAGE_PROVIDER=mock
```
无需任何 API Key，会生成一张纯白背景的示例宫格图，可直接完整测试注册、扣积分、切图、可选透明背景和 ZIP 导出流程。

### 模式 B：OpenRouter / OpenAI 兼容中转（推荐）
1. 注册 [OpenRouter](https://openrouter.ai/) 或你自己的中转站（OneAPI / NewAPI 等），在 Keys 页面生成 API Key。
2. 在环境变量中配置：
   ```env
   AI_IMAGE_PROVIDER=openai-relay
   AI_IMAGE_API_BASE=https://openrouter.ai/api/v1
   AI_IMAGE_API_KEY=sk-or-v1-xxxx
   AI_IMAGE_MODEL=google/gemini-3-pro-image-preview
   ```

### 模式 C：Google Gemini 官方 API（或 Gemini 格式中转）
1. 访问 [Google AI Studio](https://aistudio.google.com/apikey) 创建 API Key。
2. 在环境变量中配置：
   ```env
   AI_IMAGE_PROVIDER=gemini-relay
   AI_IMAGE_API_BASE=https://generativelanguage.googleapis.com/v1beta
   AI_IMAGE_API_KEY=AIzaSyxxxx
   AI_IMAGE_MODEL=gemini-3-pro-image-preview
   ```

---

## 5. Google OAuth 登录（可选）

1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)。
2. 创建项目 → 配置 **OAuth consent screen** → 创建 **OAuth client ID（Web application）**。
3. 在 **Authorized redirect URIs** 中添加：
   - 本地：`http://localhost:3000/api/auth/callback/google`
   - 线上：`https://你的正式域名.com/api/auth/callback/google`
4. 将获得的 Client ID 与 Secret 填入 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`。

---

## 6. Stripe 积分支付与 Webhook

1. 注册 [Stripe](https://dashboard.stripe.com/)，先在右上角开启 **Test mode（测试模式）** 调试。
2. 进入 **Developers → API keys**：
   - 复制 `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - 复制 `Secret key` → `STRIPE_SECRET_KEY`
3. 配置 Webhook：
   - **线上环境**：进入 **Developers → Webhooks → Add endpoint**
     - Endpoint URL：`https://你的正式域名.com/api/webhooks/stripe`
     - 监听事件勾选：`checkout.session.completed`
     - 复制 Signing secret（`whsec_...`）→ `STRIPE_WEBHOOK_SECRET`
   - **本地调试**：安装 [Stripe CLI](https://stripe.com/docs/stripe-cli) 并执行：
     ```bash
     stripe listen --forward-to localhost:3000/api/webhooks/stripe
     ```
     将命令行输出的 `whsec_...` 填入 `.env.local` 的 `STRIPE_WEBHOOK_SECRET`。

---

## 本地快速启动验证流程

```bash
# 1. 安装依赖
npm install

# 2. 复制环境变量模板并填入 DATABASE_URL 与 BETTER_AUTH_SECRET
cp .env.example .env.local

# 3. 推送数据库表结构到 Neon
npm run db:push

# 4. 启动本地开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。注册奖励取自 `CREDITS_SIGNUP_BONUS`；若启用邮箱验证，则在确认邮箱后发放。参见[防刷配置](./ANTI_ABUSE.md)。使用 `AI_IMAGE_PROVIDER=mock` 可在不调用付费生图接口的情况下测试生成与导出。
