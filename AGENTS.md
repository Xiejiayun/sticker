# Production releases

- The production Worker is `sticker-studio`; the custom domain is `sticker.jeremyxie.com`. Use `.github/workflows/deploy.yml` on `main`, not a local build containing `.env.local`.
- Node 24: `npm ci`, `node --test tests/*.test.mjs`, `npm run cf:build`, `npm run typecheck`, then `npx wrangler deploy --dry-run`. After promotion, `npm run verify:deployment` must check the exact build on production.
- Routine releases upload a version and promote that exact ID. Never replace this with `wrangler deploy` on push, or widen the routine token to manage domains. Use the reviewed manual full release for infrastructure changes.
- Follow [release, acceptance and rollback](docs/CLOUDFLARE_DEPLOYMENT.md) and [Turnstile/email rollout](docs/ANTI_ABUSE.md). Never log binding values or verification tokens; no database migrations in the deploy workflow.
