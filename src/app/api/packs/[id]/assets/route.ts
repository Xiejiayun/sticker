import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { checkStudioMutation } from "@/lib/studio-request";
import { getDb, stickerPacks } from "@/db";
import { getStoreAssetCreditCost } from "@/config/pricing";
import { addCredits, holdCredits } from "@/lib/credits";
import {
  getPackMasterImage,
  isR2Configured,
  listPackStoreAssets,
  uploadPackStoreAsset,
} from "@/lib/r2";
import { getImageProvider } from "@/lib/ai/factory";
import { buildStoreAssetPrompt } from "@/lib/prompt/asset-builder";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GenerateAssetSchema = z.object({
  kind: z.enum(["cover", "banner", "icon"]),
  platform: z.string().max(40).optional().default("wechat"),
  userPrompt: z.string().max(400).optional().default(""),
  mood: z
    .enum(["auto", "cheerful", "cozy", "office", "festive", "playful"])
    .optional()
    .default("auto"),
});

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
    .select({ id: stickerPacks.id })
    .from(stickerPacks)
    .where(and(eq(stickerPacks.id, id), eq(stickerPacks.userId, session.user.id)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const assets = isR2Configured()
    ? await listPackStoreAssets(session.user.id, id).catch(() => ({}))
    : {};

  return NextResponse.json({
    assets,
    creditCost: getStoreAssetCreditCost(),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const failure = checkStudioMutation(request);
  if (failure) return failure;

  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = GenerateAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Image storage is not configured" }, { status: 503 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: stickerPacks.id,
      status: stickerPacks.status,
      styleId: stickerPacks.styleId,
      themeId: stickerPacks.themeId,
      userPrompt: stickerPacks.userPrompt,
      masterImageUrl: stickerPacks.masterImageUrl,
    })
    .from(stickerPacks)
    .where(and(eq(stickerPacks.id, id), eq(stickerPacks.userId, session.user.id)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Pack not found" }, { status: 404 });
  }

  const pack = rows[0];
  if (pack.status !== "COMPLETED" || !pack.masterImageUrl) {
    return NextResponse.json(
      { error: "Sticker pack must be completed before generating store assets" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const userId = session.user.id;
  const creditsCost = getStoreAssetCreditCost();
  const refId = `${id}:asset:${data.kind}:${crypto.randomUUID().slice(0, 8)}`;

  const remainingBalance = await holdCredits(
    userId,
    creditsCost,
    refId,
    `Generate store ${data.kind} (${data.platform}) for pack ${id}`
  );

  if (remainingBalance === null) {
    return NextResponse.json(
      { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
      { status: 402 }
    );
  }

  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(3 * 60 * 1000)]);

  try {
    const masterBlob = await getPackMasterImage(pack.masterImageUrl, userId);
    const prompt = buildStoreAssetPrompt({
      kind: data.kind,
      platform: data.platform,
      styleId: pack.styleId,
      themeId: pack.themeId,
      packUserPrompt: pack.userPrompt,
      customUserPrompt: data.userPrompt,
      mood: data.mood,
    });

    const provider = getImageProvider();
    const result = await provider.generateAsset({
      signal,
      kind: data.kind,
      prompt,
      aspectRatio: data.kind === "banner" ? "16:9" : "1:1",
      resolution: data.kind === "banner" ? "2K" : "1K",
      referenceImages: [{ image: masterBlob, role: "character" }],
    });

    signal.throwIfAborted();
    const uploaded = await uploadPackStoreAsset({
      userId,
      packId: id,
      kind: data.kind,
      body: result.imageBytes,
      contentType: result.mimeType,
    });

    return NextResponse.json(
      {
        kind: data.kind,
        imageUrl: uploaded.readUrl,
        creditsCost,
        remainingBalance,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = signal.aborted
      ? "Asset generation timed out or was cancelled. Credits refunded."
      : err instanceof Error
        ? err.message
        : "Store asset generation failed";
    console.error(`[pack:${id}:asset:${data.kind}] Generation failed:`, err);

    const refundedBalance = await addCredits(
      userId,
      creditsCost,
      "REFUND",
      refId,
      `Auto refund for failed store ${data.kind} generation`
    );

    return NextResponse.json(
      {
        error: message,
        creditsCost,
        remainingBalance: refundedBalance,
      },
      { status: signal.aborted ? 504 : 502 }
    );
  }
}
