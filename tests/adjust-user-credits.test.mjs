import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../src/db/schema.ts";
import {
  applyAdjustment,
  backupWallets,
  restoreBackup,
  verifyBackup,
} from "../scripts/adjust-user-credits-20261124.mjs";

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

async function setupDb(t, { migrated = false } = {}) {
  const pg = await PGlite.create();
  t.after(() => pg.close());
  const ddl = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  await pg.exec(ddl.join(";\n"));
  if (!migrated) {
    await pg.exec("ALTER TABLE credit_wallets DROP COLUMN signup_bonus_claimed;");
  }
  return { pg, adapter: createPgliteAdapter(pg) };
}

function makeTempBackupPath(t, name = "backup.json") {
  const dir = mkdtempSync(join(tmpdir(), "sticker-credit-adjust-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, name);
}

test("unmigrated DB: backup, verify, apply to 100, and full restore", async (t) => {
  const { pg, adapter } = await setupDb(t, { migrated: false });
  await pg.exec(`
    INSERT INTO "user" (id, name, email) VALUES
      ('user-a', 'Alice Secret', 'alice-secret@example.invalid'),
      ('user-b', 'Bob Secret', 'bob-secret@example.invalid'),
      ('user-c', 'Carol Secret', 'carol-secret@example.invalid'),
      ('user-d', 'Dave Secret', 'dave-secret@example.invalid');
    INSERT INTO credit_wallets (user_id, balance, updated_at) VALUES
      ('user-a', 865, '2026-11-22T03:43:14.392Z'),
      ('user-b', 885, '2026-11-23T07:10:25.048Z'),
      ('user-c', 100, '2026-11-23T08:00:00.000Z');
    INSERT INTO credit_ledger (user_id, delta, type, note) VALUES
      ('user-a', 1000, 'SIGNUP_BONUS', 'Initial bonus'),
      ('user-a', -135, 'HOLD', 'Packs'),
      ('user-b', 1000, 'SIGNUP_BONUS', 'Initial bonus'),
      ('user-b', -115, 'HOLD', 'Packs'),
      ('user-c', 100, 'SIGNUP_BONUS', 'Initial bonus');
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
    { backedUp: 4, withWallet: 3, withoutWallet: 1, checksumVerified: true }
  );

  const rawBackup = readFileSync(backupFile, "utf8");
  assert.equal(rawBackup.includes("alice-secret@example.invalid"), false);
  assert.equal(rawBackup.includes("Alice Secret"), false);
  assert.ok(readFileSync(backupFile + ".sha256", "utf8").trim().length === 64);

  const verifyResult = await verifyBackup(adapter, backupFile, 100);
  assert.equal(verifyResult.restoreVerified, true);
  assert.equal(verifyResult.fingerprintMatches, true);
  assert.equal(verifyResult.modifiedWallets, 0);
  assert.deepEqual(verifyResult.plannedChanges, [
    { userId: "user-a", oldBalance: 865, newBalance: 100, delta: -765, hadWallet: true },
    { userId: "user-b", oldBalance: 885, newBalance: 100, delta: -785, hadWallet: true },
    { userId: "user-c", oldBalance: 100, newBalance: 100, delta: 0, hadWallet: true },
    { userId: "user-d", oldBalance: 0, newBalance: 100, delta: 100, hadWallet: false },
  ]);

  // Verify did not mutate DB
  assert.equal(
    (await pg.query("SELECT balance FROM credit_wallets WHERE user_id = 'user-a'")).rows[0].balance,
    865
  );

  const applyResult = await applyAdjustment(adapter, backupFile, 100);
  assert.equal(applyResult.applied, true);
  assert.equal(applyResult.matchedUsers, 4);
  assert.equal(applyResult.updatedWallets, 2);
  assert.equal(applyResult.createdWallets, 1);
  assert.equal(applyResult.ledgerEntriesInserted, 3);
  assert.equal(applyResult.restoreVerified, true);

  const balances = (
    await pg.query("SELECT user_id, balance FROM credit_wallets ORDER BY user_id")
  ).rows;
  assert.deepEqual(balances, [
    { user_id: "user-a", balance: 100 },
    { user_id: "user-b", balance: 100 },
    { user_id: "user-c", balance: 100 },
    { user_id: "user-d", balance: 100 },
  ]);

  const ledgerSums = (
    await pg.query(
      "SELECT user_id, sum(delta)::int AS total FROM credit_ledger GROUP BY user_id ORDER BY user_id"
    )
  ).rows;
  assert.deepEqual(ledgerSums, [
    { user_id: "user-a", total: 100 },
    { user_id: "user-b", total: 100 },
    { user_id: "user-c", total: 100 },
    { user_id: "user-d", total: 100 },
  ]);

  const adjustmentRows = (
    await pg.query(
      "SELECT user_id, delta, ref_id FROM credit_ledger WHERE type = 'ADJUSTMENT' ORDER BY user_id"
    )
  ).rows;
  assert.deepEqual(adjustmentRows, [
    { user_id: "user-a", delta: -765, ref_id: applyResult.batchRefId },
    { user_id: "user-b", delta: -785, ref_id: applyResult.batchRefId },
    { user_id: "user-d", delta: 100, ref_id: applyResult.batchRefId },
  ]);

  const restoreResult = await restoreBackup(adapter, backupFile);
  assert.deepEqual(restoreResult, {
    restored: true,
    batchRefId: applyResult.batchRefId,
    restoredWallets: 3,
    deletedCreatedWallets: 1,
    deletedLedgerRows: 3,
  });

  const restoredBalances = (
    await pg.query("SELECT user_id, balance FROM credit_wallets ORDER BY user_id")
  ).rows;
  assert.deepEqual(restoredBalances, [
    { user_id: "user-a", balance: 865 },
    { user_id: "user-b", balance: 885 },
    { user_id: "user-c", balance: 100 },
  ]);

  const remainingLedger = (
    await pg.query(
      "SELECT count(*)::int AS cnt FROM credit_ledger WHERE type <> 'ADJUSTMENT'"
    )
  ).rows[0].cnt;
  assert.equal(remainingLedger, 5);
});

test("migrated DB (with signup_bonus_claimed): backup, verify, apply, and restore", async (t) => {
  const { pg, adapter } = await setupDb(t, { migrated: true });
  await pg.exec(`
    INSERT INTO "user" (id, name, email) VALUES ('u1', 'User One', 'u1@example.invalid');
    INSERT INTO credit_wallets (user_id, balance, signup_bonus_claimed) VALUES ('u1', 500, true);
  `);

  const backupFile = makeTempBackupPath(t);
  await backupWallets(adapter, backupFile);
  const verifyResult = await verifyBackup(adapter, backupFile, 100);
  assert.equal(verifyResult.restoreVerified, true);
  assert.equal(verifyResult.fingerprintMatches, true);

  const applyResult = await applyAdjustment(adapter, backupFile, 100);
  assert.equal(applyResult.updatedWallets, 1);
  assert.equal(
    (await pg.query("SELECT balance FROM credit_wallets WHERE user_id = 'u1'")).rows[0].balance,
    100
  );

  await restoreBackup(adapter, backupFile);
  assert.equal(
    (await pg.query("SELECT balance FROM credit_wallets WHERE user_id = 'u1'")).rows[0].balance,
    500
  );
});

test("concurrency guard: rejects if wallet changed after backup without mutating any rows", async (t) => {
  const { pg, adapter } = await setupDb(t, { migrated: false });
  await pg.exec(`
    INSERT INTO "user" (id, name, email) VALUES
      ('u1', 'U1', 'u1@example.invalid'),
      ('u2', 'U2', 'u2@example.invalid');
    INSERT INTO credit_wallets (user_id, balance) VALUES ('u1', 865), ('u2', 885);
  `);

  const backupFile = makeTempBackupPath(t);
  await backupWallets(adapter, backupFile);

  // Mutate u1 after backup
  await pg.exec("UPDATE credit_wallets SET balance = 855 WHERE user_id = 'u1';");

  const verifyResult = await verifyBackup(adapter, backupFile, 100);
  assert.equal(verifyResult.fingerprintMatches, false);

  await assert.rejects(
    applyAdjustment(adapter, backupFile, 100),
    /Rows changed after backup/
  );

  // Neither u1 nor u2 was adjusted, and no ADJUSTMENT ledger rows exist
  const wallets = (
    await pg.query("SELECT user_id, balance FROM credit_wallets ORDER BY user_id")
  ).rows;
  assert.deepEqual(wallets, [
    { user_id: "u1", balance: 855 },
    { user_id: "u2", balance: 885 },
  ]);
  const adjCount = (
    await pg.query("SELECT count(*)::int AS cnt FROM credit_ledger WHERE type = 'ADJUSTMENT'")
  ).rows[0].cnt;
  assert.equal(adjCount, 0);
});

test("checksum tamper guard: rejects tampered backup in verify, apply, and restore", async (t) => {
  const { pg, adapter } = await setupDb(t, { migrated: false });
  await pg.exec(`
    INSERT INTO "user" (id, name, email) VALUES ('u1', 'U1', 'u1@example.invalid');
    INSERT INTO credit_wallets (user_id, balance) VALUES ('u1', 865);
  `);

  const backupFile = makeTempBackupPath(t);
  await backupWallets(adapter, backupFile);

  const original = readFileSync(backupFile, "utf8");
  writeFileSync(backupFile, original.replace("865", "999"), "utf8");

  await assert.rejects(verifyBackup(adapter, backupFile, 100), /checksum/i);
  await assert.rejects(applyAdjustment(adapter, backupFile, 100), /checksum/i);
  await assert.rejects(restoreBackup(adapter, backupFile), /checksum/i);
});
