import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "@/lib/auth";
import { getDb, stickerPacks } from "@/db";
import { deleteR2Object, getObjectReadUrl } from "@/lib/r2";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
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
  const masterImageUrl = pack.masterImageUrl ? await getObjectReadUrl(pack.masterImageUrl) : null;

  return NextResponse.json({
    pack: {
      ...pack,
      masterImageUrl,
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
  const db = getDb();
  const deleted = await db
    .delete(stickerPacks)
    .where(and(eq(stickerPacks.id, id), eq(stickerPacks.userId, session.user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const url = deleted[0].masterImageUrl;
  if (url) {
    await deleteR2Object(url).catch((err) =>
      console.warn(`[pack:${id}] Failed to delete R2 object:`, err)
    );
  }

  return NextResponse.json({ ok: true });
}
