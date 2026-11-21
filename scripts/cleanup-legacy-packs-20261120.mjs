// Explicitly authorized one-time cleanup. Only sticker_packs is changed.
import { neon } from "@neondatabase/serverless";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const [mode, filename] = process.argv.slice(2);
if (!["--backup", "--verify", "--apply", "--restore"].includes(mode) || !filename || !process.env.DATABASE_URL) {
  throw new Error("Usage: DATABASE_URL=... node scripts/cleanup-legacy-packs-20261120.mjs --backup|--verify|--apply|--restore <local-backup.json>");
}
const sql = neon(process.env.DATABASE_URL);
const hash = value => createHash("sha256").update(value).digest("hex");

if (mode === "--backup") {
  const rows = await sql.query("SELECT to_jsonb(p) AS record, md5(to_jsonb(p)::text) AS fingerprint FROM sticker_packs p ORDER BY id");
  const body = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), rows });
  await writeFile(filename, body, { flag: "wx", mode: 0o600 });
  await writeFile(filename + ".sha256", hash(body), { flag: "wx", mode: 0o600 });
  if (hash(await readFile(filename)) !== hash(body)) throw new Error("Backup verification failed");
  console.log(JSON.stringify({ backedUp: rows.length, bytes: Buffer.byteLength(body), checksumVerified: true }));
} else {
  const body = await readFile(filename);
  if (hash(body) !== (await readFile(filename + ".sha256", "utf8")).trim()) throw new Error("Backup checksum does not match");
  const backup = JSON.parse(body);
  if (backup.version !== 1 || !Array.isArray(backup.rows)) throw new Error("Invalid backup format");
  const records = JSON.stringify(backup.rows.map(row => row.record));
  if (mode === "--apply" || mode === "--verify") {
    // Prove the saved JSON can recreate complete rows before deleting anything.
    const restored = await sql.transaction([
      sql.query("CREATE TEMP TABLE r2_restore_check (LIKE sticker_packs INCLUDING DEFAULTS) ON COMMIT DROP"),
      sql.query("INSERT INTO r2_restore_check SELECT * FROM jsonb_populate_recordset(NULL::sticker_packs, $1::jsonb)", [records]),
      sql.query("SELECT id, md5(to_jsonb(p)::text) AS fingerprint FROM r2_restore_check p ORDER BY id"),
    ]);
    const expected = new Map(backup.rows.map(row => [row.record.id, row.fingerprint]));
    const rows = restored[2];
    if (rows.length !== expected.size || rows.some(row => expected.get(row.id) !== row.fingerprint)) throw new Error("Backup restore verification failed; nothing deleted");
    if (mode === "--verify") {
      console.log(JSON.stringify({ restoreVerified: true, packs: rows.length, deletedPacks: 0 }));
      process.exit(0);
    }
    const targets = JSON.stringify(backup.rows.map(row => ({ id: row.record.id, fingerprint: row.fingerprint })));
    const deleted = await sql.query(`
      WITH targets AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS t(id uuid, fingerprint text)),
      matched AS MATERIALIZED (
        SELECT p.id FROM sticker_packs p JOIN targets t ON p.id=t.id
        WHERE md5(to_jsonb(p)::text)=t.fingerprint FOR UPDATE OF p
      ), deleted AS (
        DELETE FROM sticker_packs p USING matched m WHERE p.id=m.id
        AND (SELECT count(*) FROM matched)=(SELECT count(*) FROM targets)
        RETURNING p.id
      ) SELECT count(*)::int AS count FROM deleted`, [targets]);
    if (deleted[0].count !== backup.rows.length) throw new Error("Rows changed after backup; cleanup did not complete. Inspect the verified backup before retrying.");
    console.log(JSON.stringify({ deletedPacks: deleted[0].count, restoreVerified: true, tablesChanged: ["sticker_packs"] }));
  } else {
    // Restores missing rows; never overwrites newer or existing records.
    const restored = await sql.query("INSERT INTO sticker_packs SELECT * FROM jsonb_populate_recordset(NULL::sticker_packs, $1::jsonb) ON CONFLICT (id) DO NOTHING RETURNING id", [records]);
    console.log(JSON.stringify({ restoredPacks: restored.length }));
  }
}
