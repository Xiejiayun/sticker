import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { compileFunction } from "node:vm";
import ts from "typescript";
import * as packGroupsMod from "../src/lib/pack-groups.ts";

const source = fs.readFileSync(new URL("../src/app/api/packs/[id]/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const VALID_UUID = "11111111-2222-4333-8444-555555555555";
const SIBLING_UUID = "22222222-3333-4444-8555-666666666666";
const BATCH_UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const MASTER_URL = `https://sticker.example/media/packs/user-a/${VALID_UUID}/master.png`;
const SIBLING_MASTER_URL = `https://sticker.example/media/packs/user-a/${SIBLING_UUID}/master.png`;

function fixture(options = {}) {
  const counts = { select: 0, delete: 0, deletedR2: [], deletedAssets: [] };
  const primaryRow = options.missing
    ? []
    : options.primaryRows ?? [
        {
          id: VALID_UUID,
          userId: "user-a",
          status: "COMPLETED",
          themeId: "daily-essentials",
          gridSize: "3x3",
          styleId: "chibi-handdrawn",
          userPrompt: "cat",
          creditsCost: 10,
          createdAt: new Date("2026-11-25T07:00:00Z"),
          masterImageUrl: MASTER_URL,
          slotsConfig: [],
          referenceImages: [],
        },
      ];
  const candidateRows = options.candidateRows ?? primaryRow;
  const deletedRows = options.deletedRows ?? candidateRows;

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            counts.select++;
            return counts.select === 1 ? primaryRow : candidateRows;
          },
        }),
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: async () => {
          counts.delete++;
          return deletedRows;
        },
      }),
    }),
  };

  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "drizzle-orm": {
      and: (...args) => args,
      eq: () => true,
      gte: () => true,
      inArray: () => true,
      lte: () => true,
    },
    "@/lib/auth": { getServerSession: async () => (options.anonymous ? null : { user: { id: "user-a" } }) },
    "@/db": {
      getDb: () => db,
      stickerPacks: {
        id: "id",
        userId: "user_id",
        themeId: "theme_id",
        styleId: "style_id",
        createdAt: "created_at",
      },
    },
    "@/lib/r2": {
      getObjectReadUrl: async (url) => `${url}?signature=test-only`,
      deleteR2Object: async (url) => {
        counts.deletedR2.push(url);
      },
      deletePackStoreAssets: async (userId, packId) => {
        assert.equal(userId, "user-a");
        counts.deletedAssets.push(packId);
      },
    },
    "@/lib/pack-groups": packGroupsMod,
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
  assert.equal(body.packs, undefined);
  assert.equal(counts.select, 1);

  const delRes = await DELETE(new Request(`https://sticker.example/api/packs/${VALID_UUID}`, { method: "DELETE" }), ctx);
  assert.equal(delRes.status, 200);
  assert.equal(counts.delete, 1);
  assert.deepEqual(counts.deletedR2, [MASTER_URL]);
  assert.deepEqual(counts.deletedAssets, [VALID_UUID]);
});

test("animated set GET returns all sibling packs in order and DELETE ?scope=set removes all sheets", async () => {
  const sheet0 = {
    id: VALID_UUID,
    userId: "user-a",
    status: "COMPLETED",
    themeId: "anim-sprite-16",
    gridSize: "4x4",
    styleId: "3d-blindbox",
    captionMode: "zh",
    userPrompt: "",
    creditsCost: 15,
    createdAt: new Date("2026-11-25T07:00:00Z"),
    masterImageUrl: MASTER_URL,
    slotsConfig: [
      {
        index: 0,
        pose: "Frame 1/16",
        caption: "早安",
        animBatchId: BATCH_UUID,
        animBatchIndex: 0,
        animBatchTotal: 2,
        animSetCount: 2,
      },
    ],
    referenceImages: [],
  };
  const sheet1 = {
    ...sheet0,
    id: SIBLING_UUID,
    createdAt: new Date("2026-11-25T07:01:00Z"),
    masterImageUrl: SIBLING_MASTER_URL,
    slotsConfig: [
      {
        index: 0,
        pose: "Frame 1/16",
        caption: "收到",
        animBatchId: BATCH_UUID,
        animBatchIndex: 1,
        animBatchTotal: 2,
        animSetCount: 2,
      },
    ],
  };

  const getFixture = fixture({
    primaryRows: [sheet1],
    candidateRows: [sheet1, sheet0],
  });
  const getRes = await getFixture.GET(
    new Request(`https://sticker.example/api/packs/${SIBLING_UUID}`),
    { params: Promise.resolve({ id: SIBLING_UUID }) }
  );
  assert.equal(getRes.status, 200);
  const body = await getRes.json();
  assert.equal(body.pack.id, SIBLING_UUID);
  assert.equal(body.packs.length, 2);
  assert.deepEqual(
    body.packs.map((p) => p.id),
    [VALID_UUID, SIBLING_UUID]
  );
  assert.match(body.packs[0].masterImageUrl, /\?signature=test-only$/);
  assert.match(body.packs[1].masterImageUrl, /\?signature=test-only$/);

  const delFixture = fixture({
    primaryRows: [sheet0],
    candidateRows: [sheet0, sheet1],
    deletedRows: [sheet0, sheet1],
  });
  const delRes = await delFixture.DELETE(
    new Request(`https://sticker.example/api/packs/${VALID_UUID}?scope=set`, { method: "DELETE" }),
    { params: Promise.resolve({ id: VALID_UUID }) }
  );
  assert.equal(delRes.status, 200);
  const delBody = await delRes.json();
  assert.deepEqual(delBody.deletedIds, [VALID_UUID, SIBLING_UUID]);
  assert.deepEqual(delFixture.counts.deletedR2, [MASTER_URL, SIBLING_MASTER_URL]);
  assert.deepEqual(delFixture.counts.deletedAssets, [VALID_UUID, SIBLING_UUID]);
});
