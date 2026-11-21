# R2 image storage

Production uses the private `sticker` bucket in account
`9198bde6a94accd267e7ead951ed037e`, bound as `STICKER_IMAGES`.
No S3 API credentials or public bucket access are required. The Worker needs a
random `R2_SIGNING_SECRET` of at least 32 characters, uploaded as a secret.
Generate binding/runtime types with `npm run cf:types` after config changes.

## Data flow

1. The browser compresses reference photos to JPEG (maximum dimension 1536).
2. Authenticated `POST /api/uploads/presign` validates the MIME type and size
   (maximum 10 MiB), creates an owner-scoped random path and signs a PUT permission
   valid for ten minutes. The permission binds the exact path, MIME type and size.
3. The browser streams the upload through `/media/refs/{userId}/{uuid}.jpg` into
   the R2 binding. Existing objects cannot be overwritten with a replayed upload.
4. The database stores a stable URL such as
   `https://sticker.jeremyxie.com/media/refs/{userId}/{uuid}.jpg`.
   Pack creation accepts only existing reference URLs owned by the current user.
5. Generated images are written to `packs/{userId}/{packId}/master.{extension}` in
   R2. Only their stable application URL is stored in the database.
6. Authorized pack reads issue one-hour signed GET URLs. The media handler checks
   their signatures and streams R2 data directly, without invoking Next or the DB.
   Stored URLs have no expiry/signature; unsigned direct reads return 403.
7. AI generation reads reference bytes directly through the R2 binding, with
   owner, MIME type and size checks. OpenAI edits receives multipart image files;
   chat and Gemini receive inline image content. This content is transient and
   is never written to the database. The Worker does not fetch its own media URL:
   same-zone `fetch()` can bypass the Worker and fail with 522 at the origin.

There is no Base64/database fallback. Unconfigured storage returns an explicit
503. The physical database column names `master_image_key` and `reference_keys`
are retained for rollback compatibility; they now contain a stable URL and an
array of `{url, role, mimeType}` objects. ORM properties are `masterImageUrl` and
`referenceImages`. API list responses omit reference data and internal fields.
Clients must refresh after an hour to obtain fresh image permissions.

The bucket remains private. Query string redaction prevents image permission
signatures from being retained in Worker observability URLs. Image responses use
private caching, `nosniff`, and a sandbox CSP, including for mock-generated SVGs.
R2 incurs its normal storage/request charges beyond applicable free allowances;
this integration does not upgrade the Workers plan.

## Local development and validation

Use `npm run dev` with a local `R2_SIGNING_SECRET`; the OpenNext development
integration uses a local simulated bucket. Local data stays local unless a remote
binding is explicitly configured. Build in an isolated directory without secret
`.env` files; pass build variables in the process environment as described in
[the deployment runbook](./CLOUDFLARE_DEPLOYMENT.md).

Run `npm run test:storage`, `npm run test:references`, `npm run typecheck`, `npm run cf:build`, and the
production-config `wrangler deploy --dry-run`. Validate actual R2 signed upload,
read, forbidden unsigned read, and upload replay after deployment. These checks
do not prove paid AI generation fits Workers Free CPU limits.

## Authorized cleanup and recovery

The user requested deletion of existing packs and their inline image data.
Use the versioned `scripts/cleanup-legacy-packs-20261120.mjs` with `DATABASE_URL`
provided only through the process environment:

```
node scripts/cleanup-legacy-packs-20261120.mjs --backup <protected-backup.json>
node scripts/cleanup-legacy-packs-20261120.mjs --apply <protected-backup.json>
```

Backups contain private images and must stay outside version control. The apply
step checks the SHA-256 checksum and verifies restoration into a temporary DB
table before deleting any rows. It deletes only the exact backed-up records,
requiring unchanged row fingerprints. It changes only `sticker_packs`, preserving
users, wallets, ledger entries, payments, and records created after the backup.
No physical schema migration is required for this rollout.

For recovery, first roll back the Worker to the recorded pre-R2 version (which
understands legacy inline images), then run the same script with `--restore` and
the verified backup. Restore inserts missing rows without overwriting newer ones.
Keep the R2 bucket and newly created objects during a code rollback. A Worker
rollback does not restore deleted database records.
