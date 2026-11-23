import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compileFunction } from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(new URL("../src/app/api/packs/[id]/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const VALID_UUID = "11111111-2222-4333-8444-555555555555";
const MASTER_URL = `https://sticker.example/media/packs/user-a/${VALID_UUID}/master.png`;

function fixture(options = {}) {
  const counts = { select: 0, delete: 0, deletedR2: 0, deletedAssets: 0 };
  const row = options.missing
    ? []
    : [{ id: VALID_UUID, userId: "user-a", status: "COMPLETED", masterImageUrl: MASTER_URL }];

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            counts.select++;
            return row;
          },
        }),
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: async () => {
          counts.delete++;
          return row;
        },
      }),
    }),
  };

  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "drizzle-orm": { and: (...args) => args, eq: () => true },
    "@/lib/auth": { getServerSession: async () => (options.anonymous ? null : { user: { id: "user-a" } }) },
    "@/db": { getDb: () => db, stickerPacks: { id: "id", userId: "user_id" } },
    "@/lib/r2": {
      getObjectReadUrl: async (url) => `${url}?signature=test-only`,
      deleteR2Object: async (url) => {
        assert.equal(url, MASTER_URL);
        counts.deletedR2++;
      },
      deletePackStoreAssets: async (userId, packId) => {
        assert.equal(userId, "user-a");
        assert.equal(packId, VALID_UUID);
        counts.deletedAssets++;
      },
    },
  };

  const mod = { exports: {} };
  compileFunction(compiled, ["require", "module", "exports"])((id) => {
    assert.ok(id in modules, `Unexpected dependency: ${id}`);
    return modules[id];
  }, mod, mod.exports);

  return { counts, GET: mod.exports.GET, DELETE: mod.exports.DELETE };
}

test("unauthenticated GET and DELETE return 401 even when id is not a UUID", async () => {
  const { GET, DELETE, counts } = fixture({ anonymous: true });
  const ctx = { params: Promise.resolve({ id: "deployment-check" }) };
  assert.equal((await GET(new Request("https://sticker.example/api/packs/deployment-check"), ctx)).status, 401);
  assert.equal((await DELETE(new Request("https://sticker.example/api/packs/deployment-check", { method: "DELETE" }), ctx)).status, 401);
  assert.equal(counts.select, 0);
  assert.equal(counts.delete, 0);
});

test("authenticated GET and DELETE reject malformed UUIDs with 404 without querying DB", async () => {
  const { GET, DELETE, counts } = fixture();
  for (const badId of ["not-a-uuid", "1234", `${VALID_UUID}-extra`]) {
    const ctx = { params: Promise.resolve({ id: badId }) };
    const getRes = await GET(new Request(`https://sticker.example/api/packs/${badId}`), ctx);
    assert.equal(getRes.status, 404);
    const delRes = await DELETE(new Request(`https://sticker.example/api/packs/${badId}`, { method: "DELETE" }), ctx);
    assert.equal(delRes.status, 404);
  }
  assert.equal(counts.select, 0);
  assert.equal(counts.delete, 0);
});

test("authenticated GET and DELETE with valid UUID query DB and handle R2 cleanup", async () => {
  const { GET, DELETE, counts } = fixture();
  const ctx = { params: Promise.resolve({ id: VALID_UUID }) };

  const getRes = await GET(new Request(`https://sticker.example/api/packs/${VALID_UUID}`), ctx);
  assert.equal(getRes.status, 200);
  const body = await getRes.json();
  assert.equal(body.pack.id, VALID_UUID);
  assert.match(body.pack.masterImageUrl, /\?signature=test-only$/);
  assert.equal(counts.select, 1);

  const delRes = await DELETE(new Request(`https://sticker.example/api/packs/${VALID_UUID}`, { method: "DELETE" }), ctx);
  assert.equal(delRes.status, 200);
  assert.equal(counts.delete, 1);
  assert.equal(counts.deletedR2, 1);
  assert.equal(counts.deletedAssets, 1);
});
