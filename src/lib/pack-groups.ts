import type {
  CaptionMode,
  GridSize,
  ReferenceImageRecord,
  StickerPackStatus,
  StickerSlotSnapshot,
} from "@/db/schema";

const ANIM_SINGLE_9 = "anim-sprite-9";
const ANIM_SINGLE_16 = "anim-sprite-16";
const ANIM_DUAL = "anim-sprite-dual";
const ANIM_QUAD = "anim-sprite-quad";

const LEGACY_BATCH_MAX_GAP_MS = 8 * 60 * 1000;
const MAX_ANIMATED_SET_CLIPS = 16;

export interface AnimatedBatchMeta {
  batchId: string;
  batchIndex: number;
  batchTotal: number;
  setCount: number;
  setThemeId?: string;
}

export interface PackRowForGrouping {
  id: string;
  status: StickerPackStatus;
  gridSize: GridSize;
  styleId: string;
  themeId: string;
  captionMode?: CaptionMode;
  userPrompt: string;
  masterImageUrl: string | null;
  creditsCost: number;
  createdAt: Date | string;
  slotsConfig?: StickerSlotSnapshot[] | null;
  referenceImages?: ReferenceImageRecord[] | null;
}

export interface GroupedPackSet<T extends PackRowForGrouping = PackRowForGrouping> {
  groupKey: string;
  batchId: string | null;
  members: T[];
  primaryPack: T;
  packIds: string[];
  isAnimated: boolean;
  status: StickerPackStatus;
  sheetCount: number;
  completedSheetCount: number;
  failedSheetCount: number;
  clipCount: number;
  totalClipCount: number;
  framesPerClip: number | null;
  setThemeId: string | null;
  totalCreditsCost: number;
  previewImageUrls: string[];
  createdAt: string;
}

export function isAnimatedThemeId(themeId: string): boolean {
  return (
    themeId === ANIM_SINGLE_9 ||
    themeId === ANIM_SINGLE_16 ||
    themeId === ANIM_DUAL ||
    themeId === ANIM_QUAD
  );
}

export function getAnimatedSheetGeometry(
  themeId: string,
  gridSize: GridSize
): { groupCount: number; framesPerGroup: 4 | 8 | 9 | 16 } {
  if (themeId === ANIM_SINGLE_16) {
    return { groupCount: 1, framesPerGroup: 16 };
  }
  if (themeId === ANIM_DUAL) {
    return { groupCount: 2, framesPerGroup: 8 };
  }
  if (themeId === ANIM_QUAD || (themeId !== ANIM_SINGLE_9 && gridSize === "4x4")) {
    return { groupCount: 4, framesPerGroup: 4 };
  }
  return { groupCount: 1, framesPerGroup: 9 };
}

export function getAnimatedBatchMeta(
  slotsConfig?: StickerSlotSnapshot[] | null
): AnimatedBatchMeta | null {
  const first = Array.isArray(slotsConfig) ? slotsConfig[0] : undefined;
  if (!first || typeof first.animBatchId !== "string" || first.animBatchId.trim().length === 0) {
    return null;
  }
  return {
    batchId: first.animBatchId.trim(),
    batchIndex:
      typeof first.animBatchIndex === "number" && Number.isInteger(first.animBatchIndex) && first.animBatchIndex >= 0
        ? first.animBatchIndex
        : 0,
    batchTotal:
      typeof first.animBatchTotal === "number" && Number.isInteger(first.animBatchTotal) && first.animBatchTotal >= 1
        ? first.animBatchTotal
        : 1,
    setCount:
      typeof first.animSetCount === "number" && Number.isInteger(first.animSetCount) && first.animSetCount >= 1
        ? first.animSetCount
        : 1,
    ...(typeof first.animSetThemeId === "string" && first.animSetThemeId.trim().length > 0
      ? { setThemeId: first.animSetThemeId.trim() }
      : {}),
  };
}

export function stampAnimatedBatchMeta(
  slotsConfig: StickerSlotSnapshot[],
  meta: AnimatedBatchMeta
): StickerSlotSnapshot[] {
  if (slotsConfig.length === 0) return slotsConfig;
  const [first, ...rest] = slotsConfig;
  return [
    {
      ...first,
      animBatchId: meta.batchId,
      animBatchIndex: meta.batchIndex,
      animBatchTotal: meta.batchTotal,
      animSetCount: meta.setCount,
      ...(meta.setThemeId ? { animSetThemeId: meta.setThemeId } : {}),
    },
    ...rest,
  ];
}

function toTimestampMs(value: Date | string): number {
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : String(value);
}

function buildReferenceSignature(refs?: ReferenceImageRecord[] | null): string {
  if (!Array.isArray(refs) || refs.length === 0) return "";
  return refs.map((r) => `${r.role}:${r.url}`).join("|");
}

function extractClipSignatures(row: PackRowForGrouping): string[] {
  const { groupCount, framesPerGroup } = getAnimatedSheetGeometry(row.themeId, row.gridSize);
  const slots = Array.isArray(row.slotsConfig) ? row.slotsConfig : [];
  const signatures: string[] = [];
  for (let g = 0; g < groupCount; g++) {
    const first = slots[g * framesPerGroup];
    if (!first) continue;
    if (first.sourceThemeId && typeof first.sourceSlotIndex === "number") {
      signatures.push(`theme:${first.sourceThemeId}:${first.sourceSlotIndex}`);
    } else if (
      first.animActionId &&
      first.animActionId !== "custom" &&
      first.animActionId !== "theme-slot"
    ) {
      signatures.push(`preset:${first.animActionId}:${(first.caption ?? "").trim()}`);
    } else {
      const cleanedPose = (first.poseZh ?? "")
        .replace(/^第\d+帧（[^）]+）：/, "")
        .trim();
      signatures.push(
        `custom:${(first.customPose ?? "").trim()}|${(first.caption ?? "").trim()}|${cleanedPose}`
      );
    }
  }
  return signatures;
}

function inferSetThemeId(members: PackRowForGrouping[]): string | null {
  for (const m of members) {
    const meta = getAnimatedBatchMeta(m.slotsConfig);
    if (meta?.setThemeId) return meta.setThemeId;
  }

  const themeIds = new Set<string>();
  let totalClips = 0;
  for (const m of members) {
    const { groupCount, framesPerGroup } = getAnimatedSheetGeometry(m.themeId, m.gridSize);
    const slots = Array.isArray(m.slotsConfig) ? m.slotsConfig : [];
    for (let g = 0; g < groupCount; g++) {
      totalClips++;
      const first = slots[g * framesPerGroup];
      if (first?.sourceThemeId) {
        themeIds.add(first.sourceThemeId);
      }
    }
  }
  if (totalClips > 0 && themeIds.size === 1) {
    return Array.from(themeIds)[0];
  }
  return null;
}

function resolveGroupStatus(members: PackRowForGrouping[]): StickerPackStatus {
  if (members.some((m) => m.status === "PROCESSING")) return "PROCESSING";
  if (members.some((m) => m.status === "PENDING")) {
    return members.some((m) => m.status === "COMPLETED") ? "PROCESSING" : "PENDING";
  }
  if (members.some((m) => m.status === "COMPLETED")) return "COMPLETED";
  return "FAILED";
}

function finalizeGroup<T extends PackRowForGrouping>(
  groupKey: string,
  batchId: string | null,
  members: T[]
): GroupedPackSet<T> {
  const ordered = [...members].sort((a, b) => {
    const ma = getAnimatedBatchMeta(a.slotsConfig);
    const mb = getAnimatedBatchMeta(b.slotsConfig);
    if (ma && mb && ma.batchId === mb.batchId && ma.batchIndex !== mb.batchIndex) {
      return ma.batchIndex - mb.batchIndex;
    }
    const dt = toTimestampMs(a.createdAt) - toTimestampMs(b.createdAt);
    if (dt !== 0) return dt;
    return a.id.localeCompare(b.id);
  });

  const primaryPack =
    ordered.find((m) => m.status === "COMPLETED" && Boolean(m.masterImageUrl)) ??
    ordered.find((m) => m.status === "COMPLETED") ??
    ordered[0];

  const isAnimated = isAnimatedThemeId(primaryPack.themeId);
  const completedMembers = ordered.filter((m) => m.status === "COMPLETED");
  const failedMembers = ordered.filter((m) => m.status === "FAILED");

  let totalClipCount = 0;
  let completedClipCount = 0;
  let framesPerClip: number | null = null;

  if (isAnimated) {
    framesPerClip = getAnimatedSheetGeometry(primaryPack.themeId, primaryPack.gridSize).framesPerGroup;
    for (const m of ordered) {
      const count = getAnimatedSheetGeometry(m.themeId, m.gridSize).groupCount;
      totalClipCount += count;
      if (m.status === "COMPLETED") {
        completedClipCount += count;
      }
    }
  } else {
    totalClipCount = primaryPack.gridSize === "4x4" ? 16 : 9;
    completedClipCount = completedMembers.length > 0 ? totalClipCount : 0;
  }

  const clipCount = completedMembers.length > 0 ? completedClipCount : totalClipCount;
  const previewImageUrls = completedMembers
    .map((m) => m.masterImageUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);

  let latestMs = -Infinity;
  let latestCreatedAt = toIsoString(primaryPack.createdAt);
  for (const m of ordered) {
    const ms = toTimestampMs(m.createdAt);
    if (ms >= latestMs) {
      latestMs = ms;
      latestCreatedAt = toIsoString(m.createdAt);
    }
  }

  const nonFailedCredits = ordered
    .filter((m) => m.status !== "FAILED")
    .reduce((sum, m) => sum + m.creditsCost, 0);
  const totalCreditsCost =
    nonFailedCredits > 0 ? nonFailedCredits : ordered.reduce((sum, m) => sum + m.creditsCost, 0);

  return {
    groupKey,
    batchId,
    members: ordered,
    primaryPack,
    packIds: ordered.map((m) => m.id),
    isAnimated,
    status: resolveGroupStatus(ordered),
    sheetCount: ordered.length,
    completedSheetCount: completedMembers.length,
    failedSheetCount: failedMembers.length,
    clipCount,
    totalClipCount,
    framesPerClip,
    setThemeId: isAnimated ? inferSetThemeId(ordered) : null,
    totalCreditsCost,
    previewImageUrls,
    createdAt: latestCreatedAt,
  };
}

interface OpenLegacyGroup<T extends PackRowForGrouping> {
  styleId: string;
  themeId: string;
  gridSize: GridSize;
  userPrompt: string;
  captionMode?: CaptionMode;
  refSignature: string;
  lastTimestampMs: number;
  totalClips: number;
  seenClipSignatures: Set<string>;
  firstSourceThemeId?: string;
  members: T[];
}

/**
 * Groups raw `sticker_packs` rows into logical user-facing packs/sets.
 * - Static packs remain 1:1.
 * - Animated packs with explicit `animBatchId` group strictly by `animBatchId`.
 * - Legacy multi-sheet animated packs (created before `animBatchId`) group
 *   sequentially when style, theme, prompt, reference images, timing, and
 *   non-overlapping clips match a single batch run.
 */
export function groupUserPacks<T extends PackRowForGrouping>(rows: T[]): GroupedPackSet<T>[] {
  const chronological = [...rows].sort((a, b) => {
    const dt = toTimestampMs(a.createdAt) - toTimestampMs(b.createdAt);
    if (dt !== 0) return dt;
    const ma = getAnimatedBatchMeta(a.slotsConfig);
    const mb = getAnimatedBatchMeta(b.slotsConfig);
    if (ma && mb && ma.batchId === mb.batchId && ma.batchIndex !== mb.batchIndex) {
      return ma.batchIndex - mb.batchIndex;
    }
    return a.id.localeCompare(b.id);
  });

  const explicitBatches = new Map<string, T[]>();
  const standaloneGroups: Array<{ key: string; members: T[] }> = [];
  const legacyGroups: OpenLegacyGroup<T>[] = [];
  let openLegacy: OpenLegacyGroup<T> | null = null;

  for (const row of chronological) {
    if (!isAnimatedThemeId(row.themeId)) {
      standaloneGroups.push({ key: `pack:${row.id}`, members: [row] });
      continue;
    }

    const batchMeta = getAnimatedBatchMeta(row.slotsConfig);
    if (batchMeta) {
      const existing = explicitBatches.get(batchMeta.batchId);
      if (existing) {
        existing.push(row);
      } else {
        explicitBatches.set(batchMeta.batchId, [row]);
      }
      continue;
    }

    // Legacy single-9 animated packs are always standalone (count = 1).
    if (row.themeId === ANIM_SINGLE_9) {
      standaloneGroups.push({ key: `pack:${row.id}`, members: [row] });
      continue;
    }

    const rowTimeMs = toTimestampMs(row.createdAt);
    const rowPrompt = row.userPrompt.trim();
    const rowRefSig = buildReferenceSignature(row.referenceImages);
    const rowClips = getAnimatedSheetGeometry(row.themeId, row.gridSize).groupCount;
    const rowClipSigs = extractClipSignatures(row);
    const firstSlot = Array.isArray(row.slotsConfig) ? row.slotsConfig[0] : undefined;

    const canJoinOpen =
      openLegacy !== null &&
      openLegacy.styleId === row.styleId &&
      openLegacy.themeId === row.themeId &&
      openLegacy.gridSize === row.gridSize &&
      openLegacy.userPrompt === rowPrompt &&
      openLegacy.refSignature === rowRefSig &&
      (openLegacy.captionMode === undefined ||
        row.captionMode === undefined ||
        openLegacy.captionMode === row.captionMode) &&
      rowTimeMs - openLegacy.lastTimestampMs <= LEGACY_BATCH_MAX_GAP_MS &&
      openLegacy.totalClips + rowClips <= MAX_ANIMATED_SET_CLIPS &&
      !(
        openLegacy.firstSourceThemeId &&
        firstSlot?.sourceThemeId === openLegacy.firstSourceThemeId &&
        firstSlot?.sourceSlotIndex === 0
      ) &&
      !rowClipSigs.some((sig) => openLegacy!.seenClipSignatures.has(sig));

    if (canJoinOpen && openLegacy) {
      openLegacy.members.push(row);
      openLegacy.lastTimestampMs = rowTimeMs;
      openLegacy.totalClips += rowClips;
      for (const sig of rowClipSigs) {
        openLegacy.seenClipSignatures.add(sig);
      }
    } else {
      openLegacy = {
        styleId: row.styleId,
        themeId: row.themeId,
        gridSize: row.gridSize,
        userPrompt: rowPrompt,
        captionMode: row.captionMode,
        refSignature: rowRefSig,
        lastTimestampMs: rowTimeMs,
        totalClips: rowClips,
        seenClipSignatures: new Set(rowClipSigs),
        firstSourceThemeId: firstSlot?.sourceThemeId,
        members: [row],
      };
      legacyGroups.push(openLegacy);
    }
  }

  const results: GroupedPackSet<T>[] = [];

  for (const [batchId, members] of explicitBatches.entries()) {
    results.push(finalizeGroup(`batch:${batchId}`, batchId, members));
  }
  for (const item of standaloneGroups) {
    results.push(finalizeGroup(item.key, null, item.members));
  }
  for (const legacy of legacyGroups) {
    const key =
      legacy.members.length > 1
        ? `legacy:${legacy.members[0].id}`
        : `pack:${legacy.members[0].id}`;
    results.push(finalizeGroup(key, null, legacy.members));
  }

  return results.sort((a, b) => {
    const dt = toTimestampMs(b.createdAt) - toTimestampMs(a.createdAt);
    if (dt !== 0) return dt;
    return b.primaryPack.id.localeCompare(a.primaryPack.id);
  });
}

export function findPackSetMembers<T extends PackRowForGrouping>(
  targetId: string,
  candidateRows: T[]
): T[] {
  const groups = groupUserPacks(candidateRows);
  const found = groups.find((g) => g.members.some((m) => m.id === targetId));
  if (found) return found.members;
  const direct = candidateRows.find((r) => r.id === targetId);
  return direct ? [direct] : [];
}
