import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { compileFunction } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../src/db/schema.ts";
import { getSignupBonusCredits } from "../src/config/pricing.ts";
import * as accessControl from "../src/lib/access-control.ts";
import { checkTurnstile } from "../src/lib/turnstile.ts";
import * as mail from "../src/lib/verification-email.ts";
import {
  applyAdjustment,
  backupWallets,
  restoreBackup,
  verifyBackup,
} from "../scripts/adjust-user-credits-20261125.mjs";

const require = createRequire(import.meta.url);
const origin = "https://sticker.example";
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

function load(file, dependencies) {
  const js = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  compileFunction(js, ["require", "module", "exports"])(
    (id) => dependencies[id] ?? require(id),
    mod,
    mod.exports
  );
  return mod.exports;
}

function setEnv(t, overrides) {
  for (const [key, value] of Object.entries(overrides)) {
    const previous = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
}

function createPgliteAdapter(pg) {
  return {
    query: async (text, params = []) => (await pg.query(text, params)).rows,
    transaction: (queries) =>
      pg.transaction(async (tx) => {
        const results = [];
        for (const { text, params = [] } of queries) {
          results.push((await tx.query(text, params)).rows);
        }
        return results;
      }),
  };
}

function makeTempBackupPath(t, name = "backup.json") {
  const dir = mkdtempSync(join(tmpdir(), "sticker-credit-tier-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, name);
}

test("default allowlist permits furnace09 and furnace2026 Gmail accounts and blocks others", (t) => {
  setEnv(t, {
    AUTH_ACCESS_ALLOWLIST: undefined,
    CREDITS_SIGNUP_BONUS: undefined,
    CREDITS_VIP_EMAILS: undefined,
    CREDITS_VIP_SIGNUP_BONUS: undefined,
  });

  assert.equal(accessControl.isAccessAllowlistEnabled(), true);
  assert.equal(accessControl.isEmailAllowed("furnace09@gmail.com"), true);
  assert.equal(accessControl.isEmailAllowed("  FURNACE2026@GMAIL.COM "), true);
  assert.equal(accessControl.isEmailAllowed("other@gmail.com"), false);
  assert.equal(accessControl.isEmailAllowed(""), false);
  assert.equal(accessControl.isEmailAllowed(null), false);

  assert.equal(getSignupBonusCredits(), 100);
  assert.equal(
    accessControl.getSignupBonusCreditsForEmail("furnace09@gmail.com", getSignupBonusCredits()),
    1000
  );
  assert.equal(
    accessControl.getSignupBonusCreditsForEmail("FURNACE2026@gmail.com", getSignupBonusCredits()),
    1000
  );
  assert.equal(
    accessControl.getSignupBonusCreditsForEmail("other@gmail.com", getSignupBonusCredits()),
    100
  );

  process.env.AUTH_ACCESS_ALLOWLIST = "*";
  assert.equal(accessControl.isAccessAllowlistEnabled(), false);
  assert.equal(accessControl.isEmailAllowed("anyone@example.invalid"), true);

  process.env.AUTH_ACCESS_ALLOWLIST = "alpha@example.com, beta@example.com";
  assert.equal(accessControl.isAccessAllowlistEnabled(), true);
  assert.equal(accessControl.isEmailAllowed("alpha@example.com"), true);
  assert.equal(accessControl.isEmailAllowed("furnace09@gmail.com"), false);
});

test("Better Auth enforces allowlist on signup, signin, existing sessions, and grants tiered credits", async (t) => {
  setEnv(t, {
    NODE_ENV: "test",
    DATABASE_URL: "pglite://test",
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: crypto.randomUUID(),
    AUTH_REQUIRE_VERIFIED_EMAIL: "false",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined,
    TURNSTILE_SECRET: undefined,
    AUTH_ACCESS_ALLOWLIST: undefined,
    CREDITS_SIGNUP_BONUS: undefined,
    CREDITS_VIP_EMAILS: undefined,
    CREDITS_VIP_SIGNUP_BONUS: undefined,
  });

  const pg = await PGlite.create();
  t.after(() => pg.close());
  const ddl = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  await pg.exec(ddl.join(";\n"));

  const db = { ...schema, getDb: () => drizzle(pg, { schema }) };
  const credits = load("src/lib/credits.ts", {
    "@/db": db,
    "@/config/pricing": { getSignupBonusCredits },
    "@/lib/access-control": accessControl,
    "@/lib/verification-email": mail,
  });
  const authMod = load("src/lib/auth.ts", {
    "@/db": db,
    "@/db/schema": schema,
    "@/lib/access-control": accessControl,
    "@/lib/credits": credits,
    "@/lib/turnstile": { checkTurnstile },
    "@/lib/verification-email": mail,
  });
  const auth = authMod.getAuth();

  const post = (path, body) =>
    auth.handler(
      new Request(`${origin}/api/auth/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify(body),
      })
    );

  // 1. Non-allowlisted email is rejected with 403 ACCESS_NOT_ALLOWED
  const blockedSignup = await post("sign-up/email", {
    email: "stranger@gmail.com",
    password: "password-12345",
    name: "Stranger",
  });
  assert.equal(blockedSignup.status, 403);
  assert.equal((await blockedSignup.json()).code, "ACCESS_NOT_ALLOWED");

  const blockedSignin = await post("sign-in/email", {
    email: "stranger@gmail.com",
    password: "password-12345",
  });
  assert.equal(blockedSignin.status, 403);
  assert.equal((await blockedSignin.json()).code, "ACCESS_NOT_ALLOWED");

  // 2. Allowlisted furnace09 & furnace2026 can sign up and each gets 1000 credits
  for (const vipEmail of ["furnace09@gmail.com", "furnace2026@gmail.com"]) {
    const res = await post("sign-up/email", {
      email: vipEmail,
      password: "password-12345",
      name: vipEmail.split("@")[0],
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(await credits.getCreditBalance(body.user.id), 1000);
  }

  // 3. Open allowlist temporarily to create a regular user (gets default 100 credits)
  process.env.AUTH_ACCESS_ALLOWLIST = "*";
  const regularSignup = await post("sign-up/email", {
    email: "regular@example.invalid",
    password: "password-12345",
    name: "Regular",
  });
  assert.equal(regularSignup.status, 200);
  const regularCookie = regularSignup.headers.get("set-cookie")?.split(";")[0];
  assert.ok(regularCookie);
  const regularData = await regularSignup.json();
  assert.equal(await credits.getCreditBalance(regularData.user.id), 100);

  // Regular session works while open
  const openSession = await authMod.getServerSession(new Headers({ cookie: regularCookie }));
  assert.equal(openSession?.user?.email, "regular@example.invalid");

  // 4. Re-enable default allowlist: existing regular session is immediately invalidated
  delete process.env.AUTH_ACCESS_ALLOWLIST;
  const blockedServerSession = await authMod.getServerSession(new Headers({ cookie: regularCookie }));
  assert.equal(blockedServerSession, null);

  const getSessionResponse = await auth.handler(
    new Request(`${origin}/api/auth/get-session`, {
      method: "GET",
      headers: { cookie: regularCookie, origin },
    })
  );
  assert.equal(getSessionResponse.status, 200);
  assert.equal(await getSessionResponse.json(), null);

  // 5. Turnstile gate still runs BEFORE allowlist (required by verify:deployment)
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site";
  process.env.TURNSTILE_SECRET = "test-secret";
  const turnstileFirst = await post("sign-in/email", {
    email: "release-check@example.invalid",
    password: "Not-A-User-Password",
  });
  assert.equal(turnstileFirst.status, 403);
  assert.equal((await turnstileFirst.json()).code, "TURNSTILE_REJECTED");
});

test("tiered credit adjustment script sets furnace09 & furnace2026 to 1000, others to 100, and restores cleanly", async (t) => {
  const pg = await PGlite.create();
  t.after(() => pg.close());
  const ddl = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  await pg.exec(ddl.join(";\n"));
  const adapter = createPgliteAdapter(pg);

  await pg.exec(`
    INSERT INTO "user" (id, name, email) VALUES
      ('u-f09', 'Owner One', 'Furnace09@gmail.com'),
      ('u-f26', 'Owner Two', 'furnace2026@gmail.com'),
      ('u-other-1', 'Other One', 'other1@example.invalid'),
      ('u-other-2', 'Other Two', 'other2@example.invalid');
    INSERT INTO credit_wallets (user_id, balance, updated_at) VALUES
      ('u-f09', 100, '2026-11-24T10:00:00.000Z'),
      ('u-other-1', 50, '2026-11-24T10:00:00.000Z');
  `);

  const backupFile = makeTempBackupPath(t);
  const backupResult = await backupWallets(adapter, backupFile);
  assert.deepEqual(
    {
      backedUp: backupResult.backedUp,
      withWallet: backupResult.withWallet,
      withoutWallet: backupResult.withoutWallet,
      checksumVerified: backupResult.checksumVerified,
    },
    { backedUp: 4, withWallet: 2, withoutWallet: 2, checksumVerified: true }
  );

  // Backup must not contain email or name PII
  const rawBackup = readFileSync(backupFile, "utf8");
  assert.equal(rawBackup.toLowerCase().includes("furnace09@gmail.com"), false);
  assert.equal(rawBackup.includes("Owner One"), false);

  const verifyResult = await verifyBackup(adapter, backupFile);
  assert.equal(verifyResult.restoreVerified, true);
  assert.equal(verifyResult.fingerprintMatches, true);
  assert.equal(verifyResult.matchedOverrideCount, 2);
  assert.deepEqual(verifyResult.plannedChanges, [
    { userId: "u-f09", tier: "vip", oldBalance: 100, newBalance: 1000, delta: 900, hadWallet: true },
    { userId: "u-f26", tier: "vip", oldBalance: 0, newBalance: 1000, delta: 1000, hadWallet: false },
    { userId: "u-other-1", tier: "default", oldBalance: 50, newBalance: 100, delta: 50, hadWallet: true },
    { userId: "u-other-2", tier: "default", oldBalance: 0, newBalance: 100, delta: 100, hadWallet: false },
  ]);

  const applyResult = await applyAdjustment(adapter, backupFile);
  assert.equal(applyResult.applied, true);
  assert.equal(applyResult.matchedUsers, 4);
  assert.equal(applyResult.updatedWallets, 2);
  assert.equal(applyResult.createdWallets, 2);
  assert.equal(applyResult.ledgerEntriesInserted, 4);

  const balances = (
    await pg.query("SELECT user_id, balance FROM credit_wallets ORDER BY user_id")
  ).rows;
  assert.deepEqual(balances, [
    { user_id: "u-f09", balance: 1000 },
    { user_id: "u-f26", balance: 1000 },
    { user_id: "u-other-1", balance: 100 },
    { user_id: "u-other-2", balance: 100 },
  ]);

  // Restore rolls back both modified and newly created wallets + ADJUSTMENT ledger rows
  const restoreResult = await restoreBackup(adapter, backupFile);
  assert.deepEqual(restoreResult, {
    restored: true,
    batchRefId: applyResult.batchRefId,
    restoredWallets: 2,
    deletedCreatedWallets: 2,
    deletedLedgerRows: 4,
  });

  const restoredBalances = (
    await pg.query("SELECT user_id, balance FROM credit_wallets ORDER BY user_id")
  ).rows;
  assert.deepEqual(restoredBalances, [
    { user_id: "u-f09", balance: 100 },
    { user_id: "u-other-1", balance: 50 },
  ]);

  // Tamper check
  writeFileSync(backupFile, rawBackup.replace("100", "999"), "utf8");
  await assert.rejects(verifyBackup(adapter, backupFile), /checksum/i);
});
