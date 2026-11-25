import { NextResponse } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { getServerSession } from "@/lib/auth";
import { getDb, stickerPacks } from "@/db";
import { deletePackStoreAssets, deleteR2Object, getObjectReadUrl } from "@/lib/r2";
import {
  findPackSetMembers,
  getAnimatedBatchMeta,
  isAnimatedThemeId,
  type PackRowForGrouping,
} from "@/lib/pack-groups";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANIMATED_SET_WINDOW_MS = 2 * 60 * 60 * 1000;

async function resolveAnimatedSetRows<T extends PackRowForGrouping>(
  db: ReturnType<typeof getDb>,
  userId: string,
  pack: T
): Promise<T[]> {
  if (!isAnimatedThemeId(pack.themeId)) return [pack];

  const batchMeta = getAnimatedBatchMeta(pack.slotsConfig);
  if (batchMeta && batchMeta.batchTotal <= 1) return [pack];
  if (!batchMeta && pack.themeId === "anim-sprite-9") return [pack];

  const centerMs =
    pack.createdAt instanceof Date ? pack.createdAt.getTime() : Date.parse(String(pack.createdAt));
  if (!Number.isFinite(centerMs)) return [pack];

  const minDate = new Date(centerMs - ANIMATED_SET_WINDOW_MS);
  const maxDate = new Date(centerMs + ANIMATED_SET_WINDOW_MS);

  const candidates = (await db
    .select()
    .from(stickerPacks)
    .where(
      and(
        eq(stickerPacks.userId, userId),
        eq(stickerPacks.themeId, pack.themeId),
        eq(stickerPacks.styleId, pack.styleId),
        gte(stickerPacks.createdAt, minDate),
        lte(stickerPacks.createdAt, maxDate)
      )
    )
    .limit(64)) as unknown as T[];

  const hasTarget = candidates.some((c) => c.id === pack.id);
  const pool = hasTarget ? candidates : [...candidates, pack];
  return findPackSetMembers(pack.id, pool);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(stickerPacks)
    .where(and(eq(stickerPacks.id, id), eq(stickerPacks.userId, session.user.id)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const pack = rows[0];
  const [masterImageUrl, referenceImages] = await Promise.all([
    pack.masterImageUrl ? getObjectReadUrl(pack.masterImageUrl) : Promise.resolve(null),
    Promise.all(
      (pack.referenceImages ?? []).map(async (ref) => ({
        ...ref,
        previewUrl: await getObjectReadUrl(ref.url),
      }))
    ),
  ]);

  const resolvedPack = {
    ...pack,
    masterImageUrl,
    referenceImages,
  };

  if (isAnimatedThemeId(pack.themeId)) {
    const setMembers = await resolveAnimatedSetRows(db, session.user.id, pack);
    const resolvedSetPacks = await Promise.all(
      setMembers.map(async (member) => ({
        ...member,
        masterImageUrl:
          member.id === pack.id
            ? masterImageUrl
            : member.masterImageUrl
              ? await getObjectReadUrl(member.masterImageUrl)
              : null,
      }))
    );

    return NextResponse.json({
      pack: resolvedPack,
      packs: resolvedSetPacks,
    });
  }

  return NextResponse.json({
    pack: resolvedPack,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const scope = new URL(request.url).searchParams.get("scope");
  const db = getDb();

  if (scope === "set") {
    const found = await db
      .select()
      .from(stickerPacks)
      .where(and(eq(stickerPacks.id, id), eq(stickerPacks.userId, session.user.id)))
      .limit(1);

    if (found.length === 0) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }

    const members = await resolveAnimatedSetRows(db, session.user.id, found[0]);
    const targetIds = members.map((m) => m.id);

    const deleted = await db
      .delete(stickerPacks)
      .where(and(inArray(stickerPacks.id, targetIds), eq(stickerPacks.userId, session.user.id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }

    await Promise.all(
      deleted.flatMap((row) => [
        row.masterImageUrl
          ? deleteR2Object(row.masterImageUrl).catch((err) =>
              console.warn(`[pack:${row.id}] Failed to delete R2 object:`, err)
            )
          : Promise.resolve(),
        deletePackStoreAssets(session.user.id, row.id).catch((err) =>
          console.warn(`[pack:${row.id}] Failed to delete store assets:`, err)
        ),
      ])
    );

    return NextResponse.json({ ok: true, deletedIds: deleted.map((d) => d.id) });
  }

  const deleted = await db
    .delete(stickerPacks)
    .where(and(eq(stickerPacks.id, id), eq(stickerPacks.userId, session.user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const url = deleted[0].masterImageUrl;
  await Promise.all([
    url
      ? deleteR2Object(url).catch((err) =>
          console.warn(`[pack:${id}] Failed to delete R2 object:`, err)
        )
      : Promise.resolve(),
    deletePackStoreAssets(session.user.id, id).catch((err) =>
      console.warn(`[pack:${id}] Failed to delete store assets:`, err)
    ),
  ]);

  return NextResponse.json({ ok: true });
}
