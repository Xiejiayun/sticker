# Cloudflare Free deployment

R2 integration and the authorized legacy-pack cleanup are documented in
[R2 storage](./R2_STORAGE.md). Earlier resource-limit measurements below describe
the pre-R2 deployment.

Production: https://sticker.jeremyxie.com, Worker `sticker-studio`, account
`9198bde6a94accd267e7ead951ed037e` (`furnace2026@gmail.com`). Use the
`sticker-production` Wrangler authentication profile in the deployment directory;
check `npx wrangler whoami` before deploying. The root configuration targets this
production Worker. Use a separate config/account for other environments.

For releases including signup protection, follow [the anti-abuse migration and rollout](./ANTI_ABUSE.md) **before deploying**. Its additive wallet migration is required even when the optional controls are off.

## Build and deploy

### GitHub Actions

`.github/workflows/deploy.yml` deploys updates to `main` (including merged PRs)
and supports manual runs from the Actions tab. Other branches cannot deploy.
Runs are serialized, and an active deployment is not canceled by a newer commit.

The workflow installs the lockfile with Node 24, runs the regression tests,
builds the Worker and public pages, checks types and packaging, deploys, then
runs `npm run verify:deployment` against the new build. Failed checks mark the
run as failed; they do not automatically roll back production.

Repository configuration:

- Secret `CLOUDFLARE_API_TOKEN`: dedicated token for the production account,
  with permission to deploy `sticker-studio`, validate the existing `sticker`
  R2 binding, and manage its route on `jeremyxie.com`.
- Variable `GOOGLE_AUTH_ENABLED=true`: includes Google sign-in in prerendered
  pages without exposing Google credentials to the build runner.
- Variables `CREDITS_COST_3X3` and `CREDITS_COST_4X4`: public generation prices;
  defaults are 10 and 15. Keep these aligned with the Worker runtime settings.

Database, AI, Google, payment and R2 signing secrets stay on the existing Worker.
The workflow uses `--keep-vars` and inherits existing secrets; it neither creates
secret files nor performs database migrations. The deployment token is available
only to the deploy step. To rotate it, replace the repository Secret and revoke
the old token in Cloudflare after a successful run.

### Local release

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
