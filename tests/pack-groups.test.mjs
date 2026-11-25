import test from "node:test";
import assert from "node:assert/strict";
import {
  findPackSetMembers,
  getAnimatedBatchMeta,
  groupUserPacks,
  stampAnimatedBatchMeta,
} from "../src/lib/pack-groups.ts";

const REF_A = [{ url: "https://sticker.example/media/refs/u1/char-a.jpg", role: "character", mimeType: "image/jpeg" }];
const REF_B = [{ url: "https://sticker.example/media/refs/u1/char-b.jpg", role: "character", mimeType: "image/jpeg" }];

function makeSlot(index, overrides = {}) {
  return {
    index,
    pose: `pose-${index}`,
    poseZh: `动作-${index}`,
    caption: `词${index}`,
    ...overrides,
  };
}

function makeAnimRow(id, minutesOffset, overrides = {}) {
  return {
    id,
    status: "COMPLETED",
    gridSize: "4x4",
    styleId: "3d-blindbox",
    themeId: "anim-sprite-16",
    captionMode: "zh",
    userPrompt: "",
    masterImageUrl: `https://sticker.example/media/packs/u1/${id}/master.png`,
    creditsCost: 15,
    createdAt: new Date(Date.parse("2026-11-25T07:00:00Z") + minutesOffset * 60_000),
    slotsConfig: [makeSlot(0)],
    referenceImages: REF_A,
    ...overrides,
  };
}

test("explicit animBatchId groups all sheets of a 16-clip animated set into 1 pack entry", () => {
  const batchId = "aaaaaaaa-1111-4222-8333-bbbbbbbbbbbb";
  const rows = Array.from({ length: 16 }, (_, idx) => {
    const baseSlots = [
      makeSlot(0, { sourceThemeId: "daily-essentials", sourceSlotIndex: idx, animGroup: 0, animFrame: 0 }),
    ];
    return makeAnimRow(`sheet-${idx}`, idx * 0.75, {
      slotsConfig: stampAnimatedBatchMeta(baseSlots, {
        batchId,
        batchIndex: idx,
        batchTotal: 16,
        setCount: 16,
        setThemeId: "daily-essentials",
      }),
    });
  });

  // Reverse input order (like DB ORDER BY created_at DESC)
  const grouped = groupUserPacks([...rows].reverse());
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].batchId, batchId);
  assert.equal(grouped[0].sheetCount, 16);
  assert.equal(grouped[0].clipCount, 16);
  assert.equal(grouped[0].totalClipCount, 16);
  assert.equal(grouped[0].framesPerClip, 16);
  assert.equal(grouped[0].setThemeId, "daily-essentials");
  assert.equal(grouped[0].previewImageUrls.length, 4);
  assert.equal(grouped[0].packIds[0], "sheet-0");
  assert.equal(grouped[0].packIds[15], "sheet-15");

  const meta = getAnimatedBatchMeta(rows[3].slotsConfig);
  assert.deepEqual(meta, {
    batchId,
    batchIndex: 3,
    batchTotal: 16,
    setCount: 16,
    setThemeId: "daily-essentials",
  });
});

test("explicit animBatchId with partial failure keeps completed sheets accessible and tracks failure count", () => {
  const batchId = "cccccccc-1111-4222-8333-dddddddddddd";
  const rows = [0, 1, 2, 3].map((idx) =>
    makeAnimRow(`p-${idx}`, idx, {
      status: idx === 0 ? "FAILED" : "COMPLETED",
      masterImageUrl: idx === 0 ? null : `https://sticker.example/media/packs/u1/p-${idx}/master.png`,
      slotsConfig: stampAnimatedBatchMeta([makeSlot(0)], {
        batchId,
        batchIndex: idx,
        batchTotal: 4,
        setCount: 4,
      }),
    })
  );

  const grouped = groupUserPacks(rows);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].status, "COMPLETED");
  assert.equal(grouped[0].primaryPack.id, "p-1");
  assert.equal(grouped[0].completedSheetCount, 3);
  assert.equal(grouped[0].failedSheetCount, 1);
  assert.equal(grouped[0].clipCount, 3);
  assert.equal(grouped[0].totalClipCount, 4);
  assert.equal(grouped[0].totalCreditsCost, 45);
});

test("legacy animated sheets without animBatchId group sequential multi-sheet runs but split distinct sets", () => {
  // Legacy run 1: 6 sheets of anim-sprite-16 from daily-essentials (slots 0..5), 45s apart
  const run1 = Array.from({ length: 6 }, (_, i) =>
    makeAnimRow(`run1-${i}`, i * 0.75, {
      slotsConfig: [
        makeSlot(0, { sourceThemeId: "daily-essentials", sourceSlotIndex: i, animActionId: "theme-slot" }),
      ],
    })
  );

  // Legacy run 2: immediately 30s later, same reference & theme restarted at slot 0..3 -> MUST NOT merge with run 1
  const run2 = Array.from({ length: 4 }, (_, i) =>
    makeAnimRow(`run2-${i}`, 6 * 0.75 + 0.5 + i * 0.75, {
      slotsConfig: [
        makeSlot(0, { sourceThemeId: "daily-essentials", sourceSlotIndex: i, animActionId: "theme-slot" }),
      ],
    })
  );

  // Legacy run 3: different reference photo 30s later -> MUST NOT merge
  const run3 = [
    makeAnimRow("run3-0", 12, {
      referenceImages: REF_B,
      slotsConfig: [
        makeSlot(0, { sourceThemeId: "cute-pet", sourceSlotIndex: 0, animActionId: "theme-slot" }),
      ],
    }),
  ];

  // Static pack & single-9 animated pack -> NEVER merged
  const staticPack = {
    id: "static-1",
    status: "COMPLETED",
    gridSize: "3x3",
    styleId: "3d-blindbox",
    themeId: "daily-essentials",
    captionMode: "zh",
    userPrompt: "",
    masterImageUrl: "https://sticker.example/media/packs/u1/static-1/master.png",
    creditsCost: 10,
    createdAt: new Date("2026-11-25T07:20:00Z"),
    slotsConfig: [makeSlot(0)],
    referenceImages: REF_A,
  };
  const single9a = makeAnimRow("s9-a", 21, { themeId: "anim-sprite-9", gridSize: "3x3" });
  const single9b = makeAnimRow("s9-b", 22, { themeId: "anim-sprite-9", gridSize: "3x3" });

  const allRows = [...run1, ...run2, ...run3, staticPack, single9a, single9b];
  const grouped = groupUserPacks(allRows);

  assert.equal(grouped.length, 6);
  const gRun1 = grouped.find((g) => g.packIds.includes("run1-0"));
  const gRun2 = grouped.find((g) => g.packIds.includes("run2-0"));
  assert.ok(gRun1 && gRun2);
  assert.equal(gRun1.sheetCount, 6);
  assert.equal(gRun1.clipCount, 6);
  assert.equal(gRun2.sheetCount, 4);
  assert.equal(gRun2.clipCount, 4);

  // findPackSetMembers resolves the entire run 1 from any member ID
  const found = findPackSetMembers("run1-4", allRows);
  assert.deepEqual(
    found.map((m) => m.id),
    run1.map((m) => m.id)
  );
});

test("legacy dual 2x8 sheets group cleanly up to 16 clips (8 sheets) and split when exceeding 16", () => {
  // 8 dual sheets = 16 clips (max set size) + 1 more dual sheet = must split into 16 + 2
  const rows = Array.from({ length: 9 }, (_, sheetIdx) =>
    makeAnimRow(`dual-${sheetIdx}`, sheetIdx * 0.8, {
      themeId: "anim-sprite-dual",
      slotsConfig: [
        makeSlot(0, { sourceThemeId: "office-worker", sourceSlotIndex: sheetIdx * 2, animActionId: "theme-slot" }),
        ...Array.from({ length: 7 }, (_, f) => makeSlot(f + 1)),
        makeSlot(8, { sourceThemeId: "office-worker", sourceSlotIndex: sheetIdx * 2 + 1, animActionId: "theme-slot" }),
        ...Array.from({ length: 7 }, (_, f) => makeSlot(f + 9)),
      ],
    })
  );

  const grouped = groupUserPacks(rows);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].clipCount, 2); // newest (sheet 8)
  assert.equal(grouped[1].clipCount, 16); // sheets 0..7
  assert.equal(grouped[1].sheetCount, 8);
});

test("two separate legacy single-16 runs with the same preset action do not merge", () => {
  const r1 = makeAnimRow("single-a", 0, {
    slotsConfig: [makeSlot(0, { animActionId: "wave-hi", caption: "早安" })],
  });
  const r2 = makeAnimRow("single-b", 1, {
    slotsConfig: [makeSlot(0, { animActionId: "wave-hi", caption: "早安" })],
  });

  const grouped = groupUserPacks([r1, r2]);
  assert.equal(grouped.length, 2);
});
