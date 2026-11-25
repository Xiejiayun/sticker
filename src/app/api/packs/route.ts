import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { checkStudioMutation } from "@/lib/studio-request";
import { getDb, stickerPacks } from "@/db";
import { getGridCreditCost } from "@/config/pricing";
import { getStylePresetById } from "@/config/styles";
import { getThemePackById, isCustomThemeId, resolveSlotsForGeneration } from "@/config/themes";
import {
  getAnimatedPackLayout,
  isAnimatedSpriteThemeId,
  resolveAnimatedSlotsForGeneration,
} from "@/config/animations";
import { addCredits, holdCredits } from "@/lib/credits";
import { getObjectReadUrl, getReferenceImage, isOwnedReferenceUrl, isR2Configured, referenceExists, uploadBufferToR2 } from "@/lib/r2";
import { enhanceSubjectDescription } from "@/lib/prompt/enhancer";
import { buildAnimatedSpritePrompt, buildStickerGridPrompt } from "@/lib/prompt/builder";
import { getImageProvider } from "@/lib/ai/factory";
import type { ReferenceImageInput } from "@/lib/ai/types";

const CreatePackSchema = z.object({
  gridSize: z.enum(["3x3", "4x4"]),
  styleId: z.string().min(1),
  themeId: z.string().min(1),
  captionMode: z.enum(["none", "zh", "en"]),
  poseVariant: z.number().int().min(0).max(10).optional().default(0),
  userPrompt: z.string().max(600).default(""),
  slots: z
    .array(
      z.object({
        index: z.number().int().min(0).max(15),
        pose: z.string().max(320),
        poseZh: z.string().max(120).optional(),
        caption: z.string().max(16),
        sourceThemeId: z.string().max(64).optional(),
        sourceSlotIndex: z.number().int().min(0).max(15).optional(),
        customPose: z.string().max(60).optional(),
        animGroup: z.number().int().min(0).max(3).optional(),
        animFrame: z.number().int().min(0).max(15).optional(),
        animActionId: z.string().max(64).optional(),
        animLoopMode: z.enum(["loop", "pingpong"]).optional(),
        animFps: z.number().int().min(2).max(16).optional(),
      })
    )
    .optional(),
  references: z
    .array(
      z.object({
        url: z.string().url().max(2048),
        role: z.enum(["character", "pet", "outfit", "prop"]),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      })
    )
    .max(4)
    .default([]),
});

export async function GET(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: stickerPacks.id, status: stickerPacks.status, gridSize: stickerPacks.gridSize,
      styleId: stickerPacks.styleId, themeId: stickerPacks.themeId, userPrompt: stickerPacks.userPrompt,
      creditsCost: stickerPacks.creditsCost, createdAt: stickerPacks.createdAt,
      masterImageUrl: stickerPacks.masterImageUrl,
    })
    .from(stickerPacks)
    .where(eq(stickerPacks.userId, session.user.id))
    .orderBy(desc(stickerPacks.createdAt))
    .limit(50);

  const packs = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      masterImageUrl: row.masterImageUrl ? await getObjectReadUrl(row.masterImageUrl) : null,
    }))
  );

  return NextResponse.json({ packs });
}

export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const failure = checkStudioMutation(request);
  if (failure) return failure;

  const body = await request.json().catch(() => null);
  const parsed = CreatePackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!isR2Configured()) {
    return NextResponse.json({ error: "Image storage is not configured" }, { status: 503 });
  }
  for (const reference of data.references) {
    if (!isOwnedReferenceUrl(reference.url, session.user.id)) {
      return NextResponse.json({ error: "Invalid or unavailable reference image" }, { status: 400 });
    }
  }
  if (data.references.length > 0) {
    const existsList = await Promise.all(data.references.map((ref) => referenceExists(ref.url)));
    if (existsList.some((exists) => !exists)) {
      return NextResponse.json({ error: "Invalid or unavailable reference image" }, { status: 400 });
    }
  }
  if (!getStylePresetById(data.styleId)) {
    return NextResponse.json({ error: "Invalid styleId" }, { status: 400 });
  }
  const animatedThemeId = isAnimatedSpriteThemeId(data.themeId) ? data.themeId : null;
  const isAnimatedSprite = animatedThemeId !== null;
  if (!getThemePackById(data.themeId) && !isCustomThemeId(data.themeId) && !isAnimatedSprite) {
    return NextResponse.json({ error: "Invalid themeId" }, { status: 400 });
  }

  const effectiveGridSize = animatedThemeId
    ? getAnimatedPackLayout(animatedThemeId, data.gridSize).expectedGridSize
    : data.gridSize;

  if (!data.userPrompt.trim() && data.references.length === 0) {
    return NextResponse.json(
      { error: "Please provide a character description or at least one reference photo." },
      { status: 400 }
    );
  }

  const slotsConfig = animatedThemeId
    ? resolveAnimatedSlotsForGeneration({
        themeId: animatedThemeId,
        captionMode: data.captionMode,
        slots: data.slots,
      })
    : resolveSlotsForGeneration({
        themeId: data.themeId,
        gridSize: effectiveGridSize,
        captionMode: data.captionMode,
        slots: data.slots,
        poseVariant: data.poseVariant,
      });

  const creditsCost = getGridCreditCost(effectiveGridSize);
  const packId = crypto.randomUUID();
  const userId = session.user.id;

  // 1. Atomically hold credits
  const remainingBalance = await holdCredits(
    userId,
    creditsCost,
    packId,
    isAnimatedSprite
      ? `Generate ${effectiveGridSize} animated sprite pack (${data.styleId})`
      : `Generate ${effectiveGridSize} sticker pack (${data.styleId})`
  );

  if (remainingBalance === null) {
    return NextResponse.json(
      { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
      { status: 402 }
    );
  }

  // 2. Insert PENDING pack record
  const db = getDb();
  try {
    await db.insert(stickerPacks).values({
      id: packId,
      userId,
      status: "PENDING",
      gridSize: effectiveGridSize,
      styleId: data.styleId,
      themeId: data.themeId,
      captionMode: data.captionMode,
      userPrompt: data.userPrompt.trim(),
      slotsConfig,
      referenceImages: data.references,
      creditsCost,
    });
  } catch (err) {
    console.error(`[pack:${packId}] Failed to create sticker pack record:`, err);
    const refundedBalance = await addCredits(
      userId,
      creditsCost,
      "REFUND",
      packId,
      `Auto refund for failed pack creation ${packId}`
    );
    return NextResponse.json(
      { error: "Failed to create sticker pack", remainingBalance: refundedBalance },
      { status: 500 }
    );
  }

  // Keep the HTTP request open. after()/waitUntil() is cancelled 30 seconds
  // after a response on Workers, even while the image provider is still working.
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(5 * 60 * 1000)]);
  return await (async () => {
    try {
      await db
        .update(stickerPacks)
        .set({ status: "PROCESSING", updatedAt: new Date() })
        .where(eq(stickerPacks.id, packId));

      const [enhancedDesc, resolvedRefs] = await Promise.all([
        enhanceSubjectDescription(data.userPrompt, signal),
        Promise.all(
          data.references.map(async (ref): Promise<ReferenceImageInput> => ({
            image: await getReferenceImage(ref.url, userId),
            role: ref.role,
          }))
        ),
      ]);
      const finalPrompt = isAnimatedSprite
        ? buildAnimatedSpritePrompt({
            styleId: data.styleId,
            gridSize: effectiveGridSize,
            layoutKind: getAnimatedPackLayout(data.themeId, effectiveGridSize).kind,
            subjectDescription: enhancedDesc,
            slots: slotsConfig,
            referenceRoles: data.references.map((r) => r.role),
          })
        : buildStickerGridPrompt({
            styleId: data.styleId,
            gridSize: effectiveGridSize,
            captionMode: data.captionMode,
            subjectDescription: enhancedDesc,
            slots: slotsConfig,
            referenceRoles: data.references.map((r) => r.role),
          });

      const provider = getImageProvider();
      const result = await provider.generateGrid({
        signal,
        prompt: finalPrompt,
        aspectRatio: "1:1",
        resolution: "4K",
        gridSize: effectiveGridSize,
        referenceImages: resolvedRefs,
        slotsPreview: slotsConfig.map((s) => ({ index: s.index, caption: s.caption })),
      });

      signal.throwIfAborted();
      const ext = result.mimeType === "image/webp" ? "webp" : result.mimeType === "image/svg+xml" ? "svg" : "png";
      const masterImageUrl = await uploadBufferToR2({
        key: `packs/${userId}/${packId}/master.${ext}`,
        body: result.imageBytes,
        contentType: result.mimeType,
      });

      const readUrl = await getObjectReadUrl(masterImageUrl);
      await db
        .update(stickerPacks)
        .set({
          status: "COMPLETED",
          finalPrompt,
          masterImageUrl,
          updatedAt: new Date(),
        })
        .where(eq(stickerPacks.id, packId));

      return NextResponse.json({
        packId, status: "COMPLETED", creditsCost, remainingBalance,
        pack: { id: packId, status: "COMPLETED", masterImageUrl: readUrl, errorMessage: null, gridSize: effectiveGridSize },
      }, { status: 201 });
    } catch (err) {
      const message = signal.aborted
        ? "Generation timed out or the connection was closed. Please try again."
        : err instanceof Error ? err.message : "Generation failed";
      console.error(`[pack:${packId}] Generation failed:`, err);

      await db
        .update(stickerPacks)
        .set({
          status: "FAILED",
          errorMessage: message.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(stickerPacks.id, packId));

      const refundedBalance = await addCredits(
        userId,
        creditsCost,
        "REFUND",
        packId,
        `Auto refund for failed pack ${packId}`
      );

      return NextResponse.json({
        packId, status: "FAILED", creditsCost, remainingBalance: refundedBalance, error: message,
        pack: { id: packId, status: "FAILED", masterImageUrl: null, errorMessage: message, gridSize: effectiveGridSize },
      }, { status: signal.aborted ? 504 : 502 });
    }
  })();
}
