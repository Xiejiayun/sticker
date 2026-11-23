# 注册防刷与奖励发放

Turnstile 和邮箱验证可以独立启用。奖励金额仍由 `CREDITS_SIGNUP_BONUS` 管理（非负整数，`0` 表示不赠送）。既有钱包保留余额，不补发或收回旧奖励。

| 配置项 | 位置 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | GitHub `production` Variable（构建），本地 `.env.local` | 公开 Site Key；必须在构建静态页面时提供。 |
| `TURNSTILE_SECRET` | Worker Secret；本地 `.env.local` | 只在服务端调用 Siteverify，不可放到构建变量或浏览器。两把钥匙均未配置时关闭，只配一把则拒绝受保护操作。 |
| `BETTER_AUTH_URL` | Worker / 本地运行时 | 固定为当前部署的应用地址；Siteverify 的 `hostname` 必须与之匹配。不信任客户端提交的域名。 |
| `AUTH_REQUIRE_VERIFIED_EMAIL` | Worker 变量 **及** 同名 GitHub `production` Variable（页面文案） | 默认为 `false`。设为 `true` 后邮箱须先验证，才可用密码登录和领取新用户奖励。已有会话和付费余额不被清除。 |
| `AUTH_EMAIL_FROM`、`RESEND_API_KEY` | Worker 变量、Worker Secret | 在 Resend 验证自己的发信域名，并配置其发件地址和只能发信的 API Key。使用已有强随机 `BETTER_AUTH_SECRET` 签署验证链接。 |
| `CREDITS_SIGNUP_BONUS` | Worker 变量及同名 GitHub `production` Variable | 如覆盖仓库默认值，两处保持一致；变更不会给已领取的用户补发。 |

## 接入与上线顺序

1. 在 Cloudflare Turnstile 创建 **Managed** Widget，生产允许域名填 `sticker.jeremyxie.com`。本地/预发布用单独的 Widget 和准确的 `BETTER_AUTH_URL`；不要把 localhost、测试密钥或测试令牌放进生产。Site Key 可公开；Secret Key、Resend Key 和 Cloudflare API Token 不要粘贴到聊天、源码或构建日志。
2. **先迁移，再发布应用**：确认目标 Neon 分支和可恢复备份，在预发布验证后，对目标库执行 `drizzle/20261123_verified_signup_bonus.sql`。例如从已安全配置 `PG*` 连接设置的终端运行 `psql -v ON_ERROR_STOP=1 -f drizzle/20261123_verified_signup_bonus.sql`。不需要 `db:push`。旧钱包视作已领取，旧应用在滚动发布中写入的钱包也默认已领取；新应用显式创建待领取钱包。迁移可重复执行。GitHub Actions 不会自动执行迁移。
3. 用现有的受保护发布流程配置运行时变量与密钥，构建时只提供公开配置，按 [Cloudflare 发布手册](./CLOUDFLARE_DEPLOYMENT.md) 发布。不要把含真实密钥的 `.env.local` 复制到 OpenNext 构建目录。未开启邮箱验证时，注册与密码登录仍按原流程工作。
4. 预发布冒烟测试使用独立数据库、R2 和 `AI_IMAGE_PROVIDER=mock`：实际注册 → 收信 → 未验证时登录被拒 → 点击链接 → 登录可见一次奖励 → 重复打开链接余额不变。再测试多图上传及生图；无令牌、错误 action、错误 hostname 或 Siteverify 不可用时不应签发上传地址、扣费或调用模型。真实密钥和信箱的连通性需要此步骤，不能用本地模拟结果代替。
5. 如需回滚，恢复上个 Worker 版本及匹配的公开构建配置；**不要删除列或回滚余额**。旧版本会恢复原注册即赠策略；若需停发，先确认旧版本的运行时 `CREDITS_SIGNUP_BONUS=0`。重新开启邮箱验证前确认发信服务可用。关闭该门槛会让尚未领取的账号也有资格领取。

## 请求边界

- 邮箱注册、邮箱登录、Google 登录发起、重发验证邮件、生图、每次上传预签名分别使用 `signup`、`login`、`google`、`resend`、`generate`、`upload`。客户端每次操作获取新令牌，通过 `x-turnstile-token` 交给后端。OAuth 回调、邮件验证链接、读接口及已有签名的 R2 PUT 不重复要求人机验证。
- 使用 Better Auth 验证链接；Google 用户仅在其邮箱被认证系统标为已验证后才有资格领取。钱包更新与奖励流水在同一 PostgreSQL 语句中完成，多次回调或并发读余额不会重复发放。
- Turnstile 是防自动化措施，不是「一人一号」或账单上限。真实用户可拥有多个邮箱；若要立即停止免费额度，可把注册奖励设为 `0`。
