# StickerJam 注册防刷：发布、启用与回滚

**发布代码不等于开启风控。** Turnstile 证明一次操作通过了人机验证；验证邮件证明注册者能收取该邮箱的邮件。它们可以独立开启，都不代替限额，也不能保证一个人只有一个账号。

| 要做的事 | 是否改数据库 | 用户会看到什么 |
| --- | --- | --- |
| 先通过 GitHub Actions 发布代码，两个功能都关 | 不需要 | 原注册、登录、赠分和支付流程保留。 |
| 仅启用 Turnstile | 不需要 | 在注册、登录、重发邮件、上传预签名和生图之前验证本次操作。 |
| 启用「先验证邮箱、再送积分」 | **先迁移钱包表** | 密码注册后收到验证邮件；完成验证后可登录，奖励最多领取一次。 |

## 配置放在哪里

公开构建配置放在 GitHub 仓库 **Settings → Environments → production → Environment variables**。运行时配置放在 Cloudflare **Workers & Pages → sticker-studio → Settings → Variables and Secrets**；标为 Secret 的项目不进 GitHub 构建、仓库或聊天。

| 配置项 | 位置 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | GitHub `production` Variable（构建），本地 `.env.local` | 公开 Site Key；必须在构建静态页面时提供。 |
| `TURNSTILE_SECRET` | Worker Secret；本地 `.env.local` | 只在服务端调用 Siteverify，不可放到构建变量或浏览器。两把钥匙均未配置时关闭，只配一把则拒绝受保护操作。 |
| `BETTER_AUTH_URL` | Worker / 本地运行时 | 固定为当前部署的应用地址；Siteverify 的 `hostname` 必须与之匹配。不信任客户端提交的域名。 |
| `AUTH_REQUIRE_VERIFIED_EMAIL` | Worker 变量 **及** 同名 GitHub `production` Variable（页面文案） | 默认为 `false`。设为 `true` 后邮箱须先验证，才可用密码登录和领取新用户奖励。已有会话和付费余额不被清除。 |
| `AUTH_EMAIL_FROM`、`RESEND_API_KEY` | Worker 变量、Worker Secret | 在 Resend 验证自己的发信域名，并配置其发件地址和只能发信的 API Key。使用已有强随机 `BETTER_AUTH_SECRET` 签署验证链接。 |
| `AUTH_EMAIL_MIGRATION_CONFIRMED` | 仅 GitHub `production` Variable | 开启邮箱验证前，完成并复核迁移后填 `20261123_verified_signup_bonus`。这是发布人确认，不会执行 SQL。 |
| `CREDITS_SIGNUP_BONUS` | Worker 运行时设置；可选同名 GitHub `production` Variable | 后端未配置时默认 **50**，`0` 表示不送。本次发布不覆盖生产金额；公开构建值未填时，页面不承诺具体数额。若填写，两处必须一致。 |

## 第一步：通过 GitHub Actions 发布代码

1. 在 Cloudflare 部署历史记录当前承载流量的 Worker 版本 ID，确认生产站点 `/api/health` 返回 200。若未准备好密钥，保持两把 Turnstile 钥匙为空、邮箱验证为 `false`；无需连接生产数据库。
2. 合并已验证的 PR 到 `main`。在 GitHub **Actions → Deploy to Cloudflare** 打开对应提交的运行；分支 push 或创建 PR 本身不发布。工作流依次检查测试、构建、类型、Worker 打包，部署后再验证中英文页面、静态资源和匿名 API。必须看到最后的 `Verify deployed pages and APIs` 成功；这不代表真实邮件已经送达。
3. 记录 Actions 运行链接、合并提交以及 `Deploy production` 的新版本 ID。手动重新运行只选 `main`。不要把有真实密钥的 `.env.local` 复制到构建目录。详见[发布与回滚手册](./CLOUDFLARE_DEPLOYMENT.md)。

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

| 检查 | 预期 / 处置 |
| --- | --- |
| 预发布：密码注册 → 收信 → 验证 → 登录 | 收信前不能用密码登录。完成验证出现一笔 `SIGNUP_BONUS`（金额大于零时）；再点链接不增加余额。已有钱包和购买积分不变。 |
| 预发布：取消验证、上传两张图、生成一套 | 取消后可以重试；每张图的预签名及生图各自验证。用独立数据库、R2 和 `AI_IMAGE_PROVIDER=mock`，不要花生产积分测试。 |
| `TURNSTILE_REJECTED` (403) / `TURNSTILE_UNAVAILABLE` (503) | 前者检查令牌是否过期、重复，或 action/域名不匹配；后者核对两把钥匙、构建与 Worker 是否同版、Siteverify 是否可达。失败不预签名、不扣积分。 |
| 用户没有收到验证邮件 | 核对已验证发件域名、发信 Key、Resend 投递记录和垃圾箱；在登录页请求重发。不要记录完整验证链接、令牌或 Secret。 |
| 发布后关键流程异常 | 按发布手册回滚到记录的 Worker 版本，匹配原来的公开配置及 Secret。**不要删列或倒回余额。** 关闭邮箱验证后，未领取的账号也可能按旧政策领到一次奖励。 |

## 请求边界

- 邮箱注册、邮箱登录、Google 登录发起、重发验证邮件、生图、每次上传预签名分别使用 `signup`、`login`、`google`、`resend`、`generate`、`upload`。客户端每次操作获取新令牌，通过 `x-turnstile-token` 交给后端。OAuth 回调、邮件验证链接、读接口及已有签名的 R2 PUT 不重复要求人机验证。
- 使用 Better Auth 验证链接；Google 用户仅在其邮箱被认证系统标为已验证后才有资格领取。钱包更新与奖励流水在同一 PostgreSQL 语句中完成，多次回调或并发读余额不会重复发放。
- 启用了哪项防护，应以对应的真实注册/验证/收信验收为准；本地模拟和 Actions 绿色都不能代替这一检查。
