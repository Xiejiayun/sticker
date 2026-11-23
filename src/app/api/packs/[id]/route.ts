import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth";
import { getDb, stickerPacks } from "@/db";
import { deletePackStoreAssets, deleteR2Object, getObjectReadUrl } from "@/lib/r2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  return NextResponse.json({
    pack: {
      ...pack,
      masterImageUrl,
      referenceImages,
    },
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
  const db = getDb();
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
