# Cloudflare Free deployment

R2 integration and the authorized legacy-pack cleanup are documented in
[R2 storage](./R2_STORAGE.md). Earlier resource-limit measurements below describe
the pre-R2 deployment.

Production: https://sticker.jeremyxie.com, Worker `sticker`, account
`9198bde6a94accd267e7ead951ed037e` (`furnace2026@gmail.com`). Use the
`sticker-production` Wrangler authentication profile in the deployment directory;
check `npx wrangler whoami` before deploying. The root configuration targets this
production Worker. Use a separate config/account for other environments.

Follow [the signup-protection rollout](./ANTI_ABUSE.md). Shipping the code with email verification off, or enabling only Turnstile, works with the existing wallet schema. Apply and verify the additive wallet migration **before enabling verified email**; never infer the target database from local settings.

## Build and deploy

### GitHub Actions：选哪个入口？

| 场景 | 入口 | 是否改域名/路由 |
| --- | --- | --- |
| 日常代码、页面或静态资源更新 | `main` 的 push（包括合并 PR）；仓库 Actions Variable `WORKER_AUTO_RELEASE=true` 才启用 | 否；只上传并切换 Worker 版本 |
| 首次试发或暂停自动发布时 | Actions → **Deploy to Cloudflare** → **Run workflow** → `main` → `version`（默认） | 否；与自动发布相同 |
| 有意改变 Worker 名称、域名、路由、Cron、可观测性等配置 | 同一入口选 `full`，并在 `confirm_full` 填 `sticker` | **会**；审批后才执行完整 `wrangler deploy` |

Worker 更名后，先在 Cloudflare 确认 `sticker.jeremyxie.com` 绑定到 `sticker`，并记录该 Worker 当前承载 100% 流量的版本作为回滚目标。如果该版本对应的提交还使用旧名，首次发布须走经审批的 `full`；不要重跑针对旧名称的工作流。验收通过后可恢复日常 `version` 发布。

仅 `main` 可发布，所有入口共用一个生产并发组，不中断正在进行的发布。把仓库变量改为 `false` 可暂停**后续**自动发布；不会撤回已开始的任务或更改当前流量。手动 `version` 始终可用。

**凭据与环境**

- 日常使用 `CLOUDFLARE_API_TOKEN`，只给目标账户上传、部署 Worker 版本和项目现有资源所需权限，不需要为了发布而授予 DNS、路由或 Turnstile Widget 管理权。不要给这个 token 提权去修复完整部署的域名 403。
- `full` 只读 **`production-infrastructure` Environment Secret `CLOUDFLARE_INFRA_API_TOKEN`**，绝不回退到日常 token。管理员应在该环境限制部署分支为 `main`，设置 required reviewer。只在确有基础设施变更时配置独立凭据；范围限于目标账户和相关 zone，禁止把同名 Secret 放到仓库或组织级别。如果没有专用凭据，完整发布应失败。
- 构建统一从 `production` 读取公开 Site Key、Google 登录开关、积分价格和邮箱开关，两种模式不维护两套值。`GOOGLE_AUTH_ENABLED=true` 开启静态登录按钮；`CREDITS_COST_3X3` / `CREDITS_COST_4X4` 默认 10 / 15。其他密钥（数据库、AI、Google、支付、R2、Turnstile）留在 Worker，不进入构建。两个模式均使用 `--keep-vars`，不运行数据库迁移。

**一次发布如何判定成功**

1. 两种模式均用 Node 24 执行 `npm ci`、回归测试、干净构建、类型检查和 Wrangler dry-run。不要把 `.env.local` 复制进构建目录。开启邮箱验证仍需要单独的迁移确认；仅 Turnstile 不需要迁移。
2. 读取真实线上流量，确认只有一个版本承载 100%，把现有版本 UUID 记入本次 Actions Summary。日常模式从该版本的 `github-main-<完整 SHA>` 找到对应 Git 提交；与本次构建比较整个根 Wrangler 配置（连注释变化也拦截）。不是只比较最近一次 push：曾失败或跳过的基础设施改动也不能混入下次发布。缺少基线、提交不是祖先或流量有分流时，停止并人工核对。
3. 日常模式调用 OpenNext `upload`（`wrangler versions upload`）。从**本次命令的结构化回执**取 UUID；核对 Worker、提交、已有绑定的名称/类型、R2、静态资产和 Turnstile 两把钥匙的配置状态。再读一次流量，仍是原版本才对该 UUID 执行 `versions deploy <UUID>@100% --yes`。不选择“最新版本”，不调用 `triggers deploy`。完整模式则可能立即改流量和触发器，审批前必须审查具体基础设施差异及恢复步骤。
4. 两种模式都会再次确认线上 UUID 是本次版本且承载 100%。最后的 **Verify deployed pages and APIs** 比较本次构建 ID，检查中英文页面、资源和匿名 API；启用 Turnstile 时，缺少令牌的登录必须返回 `403 TURNSTILE_REJECTED`。`503`、其他 403 或旧构建都不算通过。
5. 首次启用 Turnstile：先保持自动发布关闭，手动运行 `gh workflow run deploy.yml --ref main -f mode=version`。用真实浏览器打开 `/auth`，用不存在的 `@example.invalid` 测试邮箱登录：应由应用返回「邮箱或密码错误」，而不是「人机验证失败」。如弹出勾选框，由人完成；不记录令牌，无需创建账号、发邮件或消耗积分。通过后，将仓库变量 `WORKER_AUTO_RELEASE` 设为 `true`，在下一次实际 `push main` 确认相同的版本与站点检查成功。

**失败与恢复**

- 上传或绑定检查失败、尚未切流：旧版本继续服务；核对 Summary 与 `npx wrangler deployments status`。如果候选版本缺 `TURNSTILE_SECRET`，先修复未上线版本的加密绑定，再重新试发。不要发布只有一把钥匙的版本，不要从其他版本猜 UUID。
- 已切流后检查失败：Actions 会标红，**不会自动回滚**。先暂停后续自动发布并确认当前流量仍是故障版本；用同一账户执行 `npx wrangler versions deploy <Summary 中的原版本 UUID>@100% --yes`，再检查流量、`/api/health`、两种语言登录页和故障路径。记录失败/恢复运行与两个 UUID；不要盲目重跑覆盖更新版本。
- 版本回退只恢复对应代码、资产和版本绑定，不恢复数据库、R2 内容或路由等基础设施。完整发布如有改动须单独恢复原配置。完整发布失败的只读诊断只打印操作名和 HTTP 状态，不打印响应体或凭据。

### Local release (manual recovery only)

1. Use a clean build directory with dependencies installed from `package-lock.json`.
   Do not copy `.env.local` or other secret env files into it: OpenNext can embed
   values from these files into its generated environment module.
2. Provide the required build environment through process environment variables.
   These include public app URL, grid credit costs, and Google provider credentials
   (only provider availability is rendered). Never print those values or generated
   environment modules. Changing these settings requires rebuilding static pages.
3. Run `npm run cf:build`. This builds Next/OpenNext and then copies the twelve
   public prerendered pages, in Chinese and English, to Workers Assets. The copy
   step fails if an expected public route is no longer fully static.
4. Run `npm run typecheck` and `npx wrangler deploy --dry-run` in that directory.
   Review the Worker, account, domain, and bindings before release.
5. Upload runtime secrets through Wrangler's protected secrets file mechanism,
   keeping the file outside the source/build directory. For the existing OpenNext
   deployment workflow use `npm run cf:deploy -- -- --secrets-file <absolute-path>
   --keep-vars`. This command deploys the existing build; it does not rebuild it.
6. Verify both locales, navigation, studio presets, checkout feedback, the export
   shell, static JS/CSS, `/api/health`, anonymous session handling, and anonymous
   `/api/packs` returning 401. Check Workers logs for CPU errors as well as HTTP
   status. Record the deployed version ID.

Before each deployment, record the current version ID for recovery. If critical
checks fail, use `npx wrangler rollback <previous-version-id>` with the same account
and profile. Rollback only restores Worker code/assets, not database contents.

## Static routing and Free limits

Image generation keeps `POST /api/packs` open until it returns a completed pack
(201) or a failed, refunded pack (502/504). Do not move it to `after()` or
`waitUntil()`: Workers cancels post-response tasks after 30 seconds. Provider
requests have a five-minute deadline and observe connection cancellation. Keep
the studio page open during generation. This uses the existing Worker and R2;
it does not require Azure, a queue, or a different image model.

`cloudflare/worker.js` serves the allowlisted public pages as HTML or RSC directly
from `ASSETS`; it loads OpenNext only for `/api/*`. Public pages contain no
per-user data. Session, balance, and pack requests still use the authenticated APIs.
Query presets and checkout feedback are read in the browser. Pack links use
`/{locale}/packs/view?id=...`; old `/{locale}/packs/{id}` URLs redirect there.
The regular Next development server also supports the original detail URLs.

Add new public routes to `cloudflare/public-routes.json` only if they are safe to
publish identically to every visitor. Update its locales when changing i18n routing.
Server Actions are not supported by this static page entry; mutations must use
the existing API routes. Unknown pages return 404 without invoking SSR.

Workers Free allows 10 ms CPU per invocation. Public page routing avoids request
time React rendering, but API authentication, password hashing, database result
processing, and large image/base64 payloads can still exceed that budget. Passing
one request does not guarantee reliability because the platform allows temporary
CPU bursts. Do not lower password hashing strength to fit the budget. This
deployment does not upgrade the account or guarantee all dynamic workflows on
Free. Google OAuth, signed-in generation and paid provider calls need separate
end-to-end verification; Stripe and R2 must be configured before their use.

## Production measurements, 2026-11-20

Version `33964fc0-44fc-4310-bb78-126d594fe96d` passed 53 HTTP checks after
propagation. Workers Tail reported 0–1 ms CPU for captured public HTML/RSC
requests (previous SSR measurements were approximately 37–62 ms). Edge navigation
also verified style/theme presets, locale switching with query parameters, and
checkout cancellation feedback. These are CPU measurements, not response latency.

API requests remain outside a reliable Free CPU budget: sampled anonymous
requests took 5–280 ms, including initialization; existing signed-in session and
credit reads took 29–646 ms. A signed-in `/api/packs` request actually exceeded CPU
(2018 ms) and failed. A read-only aggregate query found five existing packs with
about 20.2 MB of image data and 4.1 MB of reference data stored inline in the
database. The list API selects full rows and also returns resolved image URLs,
duplicating inline master images in its JSON response. A proper thumbnail/object
storage strategy and a lighter API runtime are needed before promising these
dynamic workflows on Free. The gallery displays a load error with manual retry
instead of reporting an empty library when its API fails.
No password, signup, payment, upload, or image-generation mutation was tested.

Final version `936d1074-66e2-4876-a773-066a32fd5673` includes the explicit gallery
failure/retry state and prerendered pricing cards. It also passed all 53 HTTP
checks. Captured public requests used 0–2 ms CPU; the signed-in pack list again
exceeded CPU at 2018 ms, and Edge displayed the new error/retry state correctly.
