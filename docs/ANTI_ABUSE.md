# StickerJam 注册防刷：发布、启用与回滚

**发布代码不等于开启风控。** Turnstile 证明一次操作通过了人机验证；验证邮件证明注册者能收取该邮箱的邮件。它们可以独立开启，都不代替限额，也不能保证一个人只有一个账号。

| 要做的事 | 是否改数据库 | 用户会看到什么 |
| --- | --- | --- |
| 先通过 GitHub Actions 发布代码，两个功能都关 | 不需要 | 原注册、登录、赠分和支付流程保留。 |
| 仅启用 Turnstile | 不需要 | 只在注册、登录（含 Google 登录发起）和重发验证邮件时验证。进入工作室后，上传参考图和生成表情包均不弹人机验证。 |
| 启用「先验证邮箱、再送积分」 | **先迁移钱包表** | 密码注册后收到验证邮件；完成验证后可登录，奖励最多领取一次。 |

## 配置放在哪里

公开构建配置放在 GitHub 仓库 **Settings → Environments → production → Environment variables**。运行时配置放在 Cloudflare **Workers & Pages → sticker → Settings → Variables and Secrets**；标为 Secret 的项目不进 GitHub 构建、仓库或聊天。

| 配置项 | 位置 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | GitHub `production` Variable（构建），本地 `.env.local` | 公开 Site Key；必须在构建静态页面时提供。 |
| `TURNSTILE_SECRET` | Worker Secret；本地 `.env.local` | 只在服务端调用 Siteverify，不可放到构建变量或浏览器。两把钥匙均未配置时关闭，只配一把则拒绝受保护操作。 |
| `BETTER_AUTH_URL` | Worker / 本地运行时 | 固定为当前部署的应用地址；Siteverify 的 `hostname` 必须与之匹配。不信任客户端提交的域名。 |
| `AUTH_REQUIRE_VERIFIED_EMAIL` | Worker 变量 **及** 同名 GitHub `production` Variable（页面文案） | 默认为 `false`。设为 `true` 后邮箱须先验证，才可用密码登录和领取新用户奖励。已有会话和付费余额不被清除。 |
| `AUTH_EMAIL_FROM`、`RESEND_API_KEY` | Worker 变量、Worker Secret | 在 Resend 验证自己的发信域名，并配置其发件地址和只能发信的 API Key。使用已有强随机 `BETTER_AUTH_SECRET` 签署验证链接。 |
| `AUTH_EMAIL_MIGRATION_CONFIRMED` | 仅 GitHub `production` Variable | 开启邮箱验证前，完成并复核迁移后填 `20261123_verified_signup_bonus`。这是发布人确认，不会执行 SQL。 |
| `AUTH_ACCESS_ALLOWLIST` | Worker 变量 / 本地运行时 | 访问白名单邮箱列表（逗号分隔）。未设置时默认仅放行 `furnace09@gmail.com`、`furnace2026@gmail.com`；设为 `*` 或 `off` 时关闭白名单、开放注册与登录。同时作用于邮箱注册/登录、Google OAuth 与已有会话检查。 |
| `CREDITS_VIP_EMAILS`、`CREDITS_VIP_SIGNUP_BONUS` | Worker 变量 / 本地运行时 | 高额欢迎积分名单与额度，默认 `furnace09@gmail.com`、`furnace2026@gmail.com` 各 **1000** 积分（仅对首次初始化/认领钱包生效；已有钱包请使用可逆调账脚本）。 |
| `CREDITS_SIGNUP_BONUS` | Worker 运行时设置；可选同名 GitHub `production` Variable | 非 VIP 用户默认欢迎积分，后端未配置时默认 **100**，`0` 表示不送。本次发布不覆盖生产金额；公开构建值未填时，页面不承诺具体数额。若填写，两处必须一致。 |

## 第一步：通过 GitHub Actions 发布代码

1. 在 Cloudflare 部署历史记录当前承载流量的 Worker 版本 ID，确认生产站点 `/api/health` 返回 200。若未准备好密钥，保持两把 Turnstile 钥匙为空、邮箱验证为 `false`；无需连接生产数据库。
2. 首次启用时，先在仓库关闭 `WORKER_AUTO_RELEASE`、合并已验证的 PR，再在 **Actions → Deploy to Cloudflare → Run workflow** 选择 `main` 和 `version`。确认 `Verify deployed pages and APIs` 成功；它会检查中英文页面、静态资源、匿名 API，以及启用 Turnstile 后无令牌登录返回 `403 TURNSTILE_REJECTED`。这不代表真实人机验证或邮件投递成功。
3. 在真实浏览器完成一次验证，用不存在的测试邮箱确认请求到达密码校验（无需注册、发信或生图）。通过后开启自动发布，核对一次实际 `main` push。记录 Actions 运行链接、提交、Summary 里的旧/新 Worker UUID。不要把有真实密钥的 `.env.local` 复制到构建目录。详见[发布与回滚手册](./CLOUDFLARE_DEPLOYMENT.md)。

## 第二步：按需开启风控

**只开 Turnstile：** 在 Cloudflare Turnstile 创建 Managed Widget，允许域名填 `sticker.jeremyxie.com`（不要写协议或路径）。将 Site Key 放进公开构建变量，Secret Key 放进 Worker Secret。预发布使用独立 Widget，不把 localhost 或测试密钥放入生产。前端页面与服务端密钥要随同一版本切换；如只能分步配置，请安排维护窗口。只有一把钥匙时后端会拒绝操作，而不是放行。

**开启邮箱验证：** 先在 Resend 验证发信域名并用自己的测试邮箱收一封信；设置 `AUTH_EMAIL_FROM` 和只允许发信的 `RESEND_API_KEY`。保持邮箱开关为 `false`，直到钱包迁移完成。先在预发布演练，再核对 **Worker 所用的 Neon 项目、分支、数据库** 和可恢复的备份。不要仅凭本地 `.env.local` 推断生产目标。

为什么要迁移？钱包余额不能表示是否领过奖励：余额为零可能是已花完；有余额也可能只是充值。迁移只新增 `signup_bonus_claimed boolean NOT NULL DEFAULT true`。旧钱包一律视作已领取，不修改余额或旧流水；启用验证后，新建待领取钱包明确写入 `false`。发奖励时，认领、余额变动和流水在同一条 PostgreSQL 语句中提交。同一链接点击两次也只送一次。

使用已安全配置好生产连接的 `psql` 执行以下单个迁移；不运行 `db:push`。Actions 本身不持有数据库密码，也不会执行这一步：

```sh
psql -v ON_ERROR_STOP=1 -f drizzle/20261123_verified_signup_bonus.sql
```

在同一数据库复核（应返回一行，依次为 `boolean`、`NO`、`true`）：

```sql
SELECT data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'credit_wallets'
  AND column_name = 'signup_bonus_claimed';
```

复核后填写 `AUTH_EMAIL_MIGRATION_CONFIRMED`，将 Worker 与 GitHub 的 `AUTH_REQUIRE_VERIFIED_EMAIL` 都设为 `true`，通过 Actions 发布匹配的页面。未迁移的数据库只支持关闭邮箱验证；该开关关闭时也能处理已有钱包、购买、扣费和退款。

## 验收、排错与回滚

验证提示只用于认证表单。快速自动通过时页面不弹窗；需要勾选时立即在屏幕中央提示，等待超过 2.5 秒时先显示等待状态。通过后继续原操作，不用再点提交。可点击「取消验证」或按 Esc，保留表单内容并重新尝试。

**复测提示位置：** 在不含生产密钥的工作目录，用 [Cloudflare 官方测试 Site Key](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) 的 *Forces interactive challenge* 模式构建应用（`NEXT_PUBLIC_TURNSTILE_SITE_KEY`），运行 `npm run cf:build`，再用 `npx wrangler dev --local --ip 127.0.0.1 --port 4387` 启动本地 Worker。在 `/auth` 填入虚构邮箱和密码后提交，检查宽屏和 320px 宽手机上的提示是否居中、能否取消重试。勾选前即可取消；不需要数据库、邮箱或服务端密钥。测试钥匙不得配置到生产。

保持本地预览运行，在另一终端用 `npm run test:verification-ui` 检查登录提示及取消重试，再用模拟会话在工作室选择两张测试图、点击生成。工作室不应加载 Turnstile、发送验证令牌或弹出验证框。测试需要 Edge（Windows）或 Chrome（其他系统），只允许回环预览（默认 `http://localhost:4387`，可设 `VERIFICATION_UI_ORIGIN`）。浏览器测试模拟存储和生图响应，不调用生产服务、不消耗积分；配置了 Site Key 的发布会在切流前运行此检查。这不能代替真实登录验证的人工验收。

| 检查 | 预期 / 处置 |
| --- | --- |
| 预发布：密码注册 → 收信 → 验证 → 登录 | 收信前不能用密码登录。完成验证出现一笔 `SIGNUP_BONUS`（金额大于零时）；再点链接不增加余额。已有钱包和购买积分不变。 |
| 预发布：登录后上传两张图、生成一套 | 上传和生图均不弹窗；正常生成只扣该套所需积分，余额不足返回 `402` 且不调用 AI。使用独立数据库、R2 和 `AI_IMAGE_PROVIDER=mock`，不要花生产积分测试。 |
| `TURNSTILE_REJECTED` (403) / `TURNSTILE_UNAVAILABLE` (503) | 只适用于认证操作。前者检查令牌是否过期、重复，或 action/域名不匹配；后者核对两把钥匙、构建与 Worker 是否同版、Siteverify 是否可达。 |
| 用户没有收到验证邮件 | 核对已验证发件域名、发信 Key、Resend 投递记录和垃圾箱；在登录页请求重发。不要记录完整验证链接、令牌或 Secret。 |
| 发布后关键流程异常 | 按发布手册回滚到记录的 Worker 版本，匹配原来的公开配置及 Secret。**不要删列或倒回余额。** 关闭邮箱验证后，未领取的账号也可能按旧政策领到一次奖励。 |

## 请求边界

- 邮箱注册、邮箱登录、Google 登录发起、重发验证邮件分别使用 `signup`、`login`、`google`、`resend`。仅这四个入口通过 `x-turnstile-token` 交给后端验证。OAuth 回调、邮件验证链接和工作室不要求令牌。
- 工作室的上传预签名和生图 POST 仍由服务端检查登录会话：会话失效返回 `401`。这两个接口只接受 `application/json`（否则 `415`）；浏览器提供的 `Origin` 必须与应用同源（否则 `403`）。它们不依赖登录时的 Turnstile 令牌。
- 上传只签发当前账号名下 JPEG、PNG、WebP 的限时 PUT 地址（10 分钟，单张最多 10 MiB），不能覆盖已有图片。生图只接受当前账号的有效参考图，先预扣积分再调用 AI。单图大小和积分检查不等于按账号限流；本次未新增上传次数配额。
- 使用 Better Auth 验证链接；Google 用户仅在其邮箱被认证系统标为已验证后才有资格领取。钱包更新与奖励流水在同一 PostgreSQL 语句中完成，多次回调或并发读余额不会重复发放。
- 启用了哪项防护，应以对应的真实注册/验证/收信验收为准；本地模拟和 Actions 绿色都不能代替这一检查。
