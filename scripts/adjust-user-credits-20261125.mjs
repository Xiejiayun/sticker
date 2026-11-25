// Explicitly authorized tiered credit adjustment. Only credit_wallets and credit_ledger are changed.
// Defaults: furnace09@gmail.com -> 1000, furnace2026@gmail.com -> 1000, all other users -> 100.
import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DEFAULT_OTHER_BALANCE = 100;
export const DEFAULT_EMAIL_TARGETS = Object.freeze({
  "furnace09@gmail.com": 1000,
  "furnace2026@gmail.com": 1000,
});

const BATCH_REF_PREFIX = "adjust-credits-20261125:";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertBalance(balance, label = "target balance") {
  if (!Number.isSafeInteger(balance) || balance < 0) {
    throw new Error(`Invalid ${label}: ${balance}`);
  }
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function normalizePolicy(options = {}) {
  const defaultBalance =
    options.defaultBalance !== undefined
      ? Number(options.defaultBalance)
      : DEFAULT_OTHER_BALANCE;
  assertBalance(defaultBalance, "default balance");

  const rawTargets =
    options.emailTargets !== undefined ? options.emailTargets : DEFAULT_EMAIL_TARGETS;
  const emailTargets = {};
  for (const [email, amount] of Object.entries(rawTargets)) {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      throw new Error(`Invalid email target key: ${email}`);
    }
    const parsed = Number(amount);
    assertBalance(parsed, `target balance for ${normalized}`);
    emailTargets[normalized] = parsed;
  }

  return { defaultBalance, emailTargets };
}

export function createNeonAdapter(databaseUrl) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const sql = neon(databaseUrl);
  return {
    query: (text, params = []) => sql.query(text, params),
    transaction: (queries) =>
      sql.transaction(queries.map(({ text, params = [] }) => sql.query(text, params))),
  };
}

async function readVerifiedBackupFile(filename) {
  const body = await readFile(filename);
  const expectedHash = (await readFile(filename + ".sha256", "utf8")).trim();
  const actualHash = sha256(body);
  if (actualHash !== expectedHash) {
    throw new Error("Backup checksum does not match");
  }
  const backup = JSON.parse(body.toString("utf8"));
  if (backup?.version !== 1 || !Array.isArray(backup.rows)) {
    throw new Error("Invalid backup format");
  }
  return {
    backup,
    batchRefId: `${BATCH_REF_PREFIX}${actualHash.slice(0, 12)}`,
  };
}

async function verifyTempTableRoundTrip(adapter, backup) {
  const walletRows = backup.rows.filter((row) => row.had_wallet);
  if (walletRows.length === 0) return;

  const records = JSON.stringify(walletRows.map((row) => row.wallet));
  const restored = await adapter.transaction([
    {
      text: "CREATE TEMP TABLE wallet_restore_check (LIKE credit_wallets INCLUDING DEFAULTS) ON COMMIT DROP",
    },
    {
      text: "INSERT INTO wallet_restore_check SELECT * FROM jsonb_populate_recordset(NULL::credit_wallets, $1::jsonb)",
      params: [records],
    },
    {
      text: "SELECT user_id, md5(to_jsonb(w)::text) AS fingerprint FROM wallet_restore_check w ORDER BY user_id",
    },
  ]);

  const expected = new Map(walletRows.map((row) => [row.user_id, row.fingerprint]));
  const rows = restored[2] ?? [];
  if (
    rows.length !== expected.size ||
    rows.some((row) => expected.get(row.user_id) !== row.fingerprint)
  ) {
    throw new Error("Backup restore verification failed; nothing modified");
  }
}

export async function backupWallets(adapter, filename) {
  // Never include email or name PII in the backup file.
  const rows = await adapter.query(`
    SELECT u.id AS user_id,
           w.user_id IS NOT NULL AS had_wallet,
           to_jsonb(w) AS wallet,
           md5(coalesce(to_jsonb(w)::text, 'null')) AS fingerprint
    FROM "user" u
    LEFT JOIN credit_wallets w ON w.user_id = u.id
    ORDER BY u.id
  `);

  const body = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), rows });
  const digest = sha256(body);

  await mkdir(dirname(resolve(filename)), { recursive: true });
  await writeFile(filename, body, { flag: "wx", mode: 0o600 });
  await writeFile(filename + ".sha256", digest, { flag: "wx", mode: 0o600 });

  if (sha256(await readFile(filename)) !== digest) {
    throw new Error("Backup verification failed");
  }

  const withWallet = rows.filter((row) => row.had_wallet).length;
  return {
    backedUp: rows.length,
    withWallet,
    withoutWallet: rows.length - withWallet,
    bytes: Buffer.byteLength(body),
    checksumVerified: true,
  };
}

export async function verifyBackup(adapter, filename, options = {}) {
  const { defaultBalance, emailTargets } = normalizePolicy(options);
  const { backup, batchRefId } = await readVerifiedBackupFile(filename);
  await verifyTempTableRoundTrip(adapter, backup);

  const liveRows = await adapter.query(
    `
    SELECT u.id AS user_id,
           lower(trim(u.email)) AS normalized_email,
           w.user_id IS NOT NULL AS had_wallet,
           w.balance AS balance,
           md5(coalesce(to_jsonb(w)::text, 'null')) AS fingerprint
    FROM "user" u
    LEFT JOIN credit_wallets w ON w.user_id = u.id
    ORDER BY u.id
    `
  );

  const liveMap = new Map(liveRows.map((row) => [row.user_id, row]));
  let fingerprintMatches = liveRows.length === backup.rows.length;
  let matchedOverrideCount = 0;

  const plannedChanges = backup.rows.map((row) => {
    const live = liveMap.get(row.user_id);
    if (!live || live.fingerprint !== row.fingerprint) {
      fingerprintMatches = false;
    }
    const email = live?.normalized_email ?? "";
    const hasOverride = Object.prototype.hasOwnProperty.call(emailTargets, email);
    if (hasOverride) matchedOverrideCount++;
    const targetBalance = hasOverride ? emailTargets[email] : defaultBalance;
    const oldBalance = row.had_wallet ? Number(row.wallet?.balance ?? 0) : 0;
    return {
      userId: row.user_id,
      tier: hasOverride ? "vip" : "default",
      oldBalance,
      newBalance: targetBalance,
      delta: targetBalance - oldBalance,
      hadWallet: Boolean(row.had_wallet),
    };
  });

  const withWallet = backup.rows.filter((row) => row.had_wallet).length;
  return {
    restoreVerified: true,
    fingerprintMatches,
    batchRefId,
    defaultBalance,
    configuredOverrides: Object.keys(emailTargets).length,
    matchedOverrideCount,
    users: backup.rows.length,
    withWallet,
    withoutWallet: backup.rows.length - withWallet,
    plannedChanges,
    modifiedWallets: 0,
  };
}

export async function applyAdjustment(adapter, filename, options = {}) {
  const { defaultBalance, emailTargets } = normalizePolicy(options);
  const { backup, batchRefId } = await readVerifiedBackupFile(filename);
  if (backup.rows.length === 0) {
    throw new Error("Backup contains no user rows; nothing to adjust");
  }
  await verifyTempTableRoundTrip(adapter, backup);

  const targets = JSON.stringify(
    backup.rows.map((row) => ({
      user_id: row.user_id,
      had_wallet: Boolean(row.had_wallet),
      fingerprint: row.fingerprint,
    }))
  );
  const overrides = JSON.stringify(
    Object.entries(emailTargets).map(([email, target_balance]) => ({
      email,
      target_balance,
    }))
  );

  const result = await adapter.query(
    `
    WITH targets AS (
      SELECT * FROM jsonb_to_recordset($1::jsonb) AS t(user_id text, had_wallet boolean, fingerprint text)
    ),
    overrides AS (
      SELECT * FROM jsonb_to_recordset($2::jsonb) AS o(email text, target_balance integer)
    ),
    resolved_targets AS (
      SELECT
        t.user_id,
        t.had_wallet,
        t.fingerprint,
        coalesce(o.target_balance, $3::integer) AS target_balance
      FROM targets t
      JOIN "user" u ON u.id = t.user_id
      LEFT JOIN overrides o ON o.email = lower(trim(u.email))
    ),
    matched_existing AS MATERIALIZED (
      SELECT w.user_id, w.balance AS old_balance, rt.target_balance
      FROM credit_wallets w
      JOIN resolved_targets rt ON rt.user_id = w.user_id AND rt.had_wallet
      WHERE md5(to_jsonb(w)::text) = rt.fingerprint
      FOR UPDATE OF w
    ),
    matched_missing AS MATERIALIZED (
      SELECT u.id AS user_id, rt.target_balance
      FROM "user" u
      JOIN resolved_targets rt ON rt.user_id = u.id AND NOT rt.had_wallet
      WHERE NOT EXISTS (SELECT 1 FROM credit_wallets w WHERE w.user_id = u.id)
      FOR UPDATE OF u
    ),
    guard AS (
      SELECT (
        (SELECT count(*) FROM matched_existing) = (SELECT count(*) FROM targets WHERE had_wallet)
        AND (SELECT count(*) FROM matched_missing) = (SELECT count(*) FROM targets WHERE NOT had_wallet)
      ) AS ok
    ),
    updated AS (
      UPDATE credit_wallets w
      SET balance = m.target_balance, updated_at = now()
      FROM matched_existing m
      WHERE (SELECT ok FROM guard)
        AND w.user_id = m.user_id
        AND m.old_balance <> m.target_balance
      RETURNING w.user_id, m.old_balance, w.balance AS new_balance, 'updated'::text AS action
    ),
    inserted AS (
      INSERT INTO credit_wallets (user_id, balance)
      SELECT m.user_id, m.target_balance
      FROM matched_missing m
      WHERE (SELECT ok FROM guard)
      RETURNING user_id, 0::integer AS old_balance, balance AS new_balance, 'created'::text AS action
    ),
    changed AS (
      SELECT * FROM updated
      UNION ALL
      SELECT * FROM inserted
    ),
    recorded AS (
      INSERT INTO credit_ledger (user_id, delta, type, ref_id, note)
      SELECT
        user_id,
        new_balance - old_balance,
        'ADJUSTMENT',
        $4::text,
        CASE
          WHEN action = 'created' THEN format('Initialized wallet balance to %s credits', new_balance)
          ELSE format('Adjusted balance from %s to %s credits', old_balance, new_balance)
        END
      FROM changed
      RETURNING user_id, delta
    )
    SELECT
      (SELECT ok FROM guard) AS ok,
      ((SELECT count(*) FROM matched_existing) + (SELECT count(*) FROM matched_missing))::int AS matched_count,
      coalesce((SELECT jsonb_agg(jsonb_build_object(
        'userId', user_id,
        'oldBalance', old_balance,
        'newBalance', new_balance,
        'delta', new_balance - old_balance,
        'action', action
      ) ORDER BY user_id) FROM changed), '[]'::jsonb) AS changes,
      (SELECT count(*)::int FROM recorded) AS ledger_count
    `,
    [targets, overrides, defaultBalance, batchRefId]
  );

  const summary = result[0];
  if (!summary?.ok) {
    throw new Error(
      "Rows changed after backup; adjustment did not complete. Inspect the verified backup before retrying."
    );
  }

  const changes = Array.isArray(summary.changes) ? summary.changes : [];
  const updatedWallets = changes.filter((c) => c.action === "updated").length;
  const createdWallets = changes.filter((c) => c.action === "created").length;

  return {
    applied: true,
    defaultBalance,
    batchRefId,
    matchedUsers: summary.matched_count,
    updatedWallets,
    createdWallets,
    ledgerEntriesInserted: summary.ledger_count,
    changes,
    restoreVerified: true,
  };
}

export async function restoreBackup(adapter, filename) {
  const { backup, batchRefId } = await readVerifiedBackupFile(filename);

  const walletRecords = backup.rows.filter((row) => row.had_wallet).map((row) => row.wallet);
  const missingWalletUserIds = backup.rows
    .filter((row) => !row.had_wallet)
    .map((row) => row.user_id);

  const queries = [];
  let walletQueryIdx = -1;
  let deleteCreatedQueryIdx = -1;

  if (walletRecords.length > 0) {
    walletQueryIdx = queries.length;
    queries.push({
      text: `
        INSERT INTO credit_wallets
        SELECT * FROM jsonb_populate_recordset(NULL::credit_wallets, $1::jsonb)
        ON CONFLICT (user_id) DO UPDATE
          SET balance = EXCLUDED.balance,
              updated_at = EXCLUDED.updated_at
        RETURNING user_id, balance
      `,
      params: [JSON.stringify(walletRecords)],
    });
  }

  if (missingWalletUserIds.length > 0) {
    deleteCreatedQueryIdx = queries.length;
    queries.push({
      text: `
        DELETE FROM credit_wallets w
        WHERE w.user_id = ANY($1::text[])
          AND NOT EXISTS (
            SELECT 1 FROM credit_ledger l
            WHERE l.user_id = w.user_id AND l.ref_id IS DISTINCT FROM $2::text
          )
        RETURNING w.user_id
      `,
      params: [missingWalletUserIds, batchRefId],
    });
  }

  const deleteLedgerQueryIdx = queries.length;
  queries.push({
    text: "DELETE FROM credit_ledger WHERE ref_id = $1::text RETURNING user_id, delta",
    params: [batchRefId],
  });

  const results = await adapter.transaction(queries);
  return {
    restored: true,
    batchRefId,
    restoredWallets: walletQueryIdx >= 0 ? (results[walletQueryIdx]?.length ?? 0) : 0,
    deletedCreatedWallets:
      deleteCreatedQueryIdx >= 0 ? (results[deleteCreatedQueryIdx]?.length ?? 0) : 0,
    deletedLedgerRows: results[deleteLedgerQueryIdx]?.length ?? 0,
  };
}

function parseCliOptions(rest) {
  let defaultBalance = DEFAULT_OTHER_BALANCE;
  let customOverrides = null;

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token === "--default") {
      defaultBalance = Number(rest[++i]);
    } else if (token === "--set") {
      const pair = rest[++i] ?? "";
      const eqIdx = pair.lastIndexOf("=");
      if (eqIdx <= 0) {
        throw new Error(`Invalid --set argument "${pair}". Expected <email>=<credits>`);
      }
      if (!customOverrides) customOverrides = {};
      customOverrides[pair.slice(0, eqIdx)] = Number(pair.slice(eqIdx + 1));
    } else {
      throw new Error(`Unknown option: ${token}`);
    }
  }

  return {
    defaultBalance,
    emailTargets: customOverrides ?? DEFAULT_EMAIL_TARGETS,
  };
}

async function main() {
  const [mode, filename, ...rest] = process.argv.slice(2);
  if (
    !["--backup", "--verify", "--apply", "--restore"].includes(mode) ||
    !filename ||
    !process.env.DATABASE_URL
  ) {
    throw new Error(
      "Usage: DATABASE_URL=... node scripts/adjust-user-credits-20261125.mjs --backup|--verify|--apply|--restore <local-backup.json> [--default 100] [--set email=1000]"
    );
  }

  const options = parseCliOptions(rest);
  const adapter = createNeonAdapter(process.env.DATABASE_URL);

  if (mode === "--backup") {
    console.log(JSON.stringify(await backupWallets(adapter, filename)));
  } else if (mode === "--verify") {
    console.log(JSON.stringify(await verifyBackup(adapter, filename, options)));
  } else if (mode === "--apply") {
    console.log(JSON.stringify(await applyAdjustment(adapter, filename, options)));
  } else {
    console.log(JSON.stringify(await restoreBackup(adapter, filename)));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
