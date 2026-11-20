import { after, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { getDb, stickerPacks } from "@/db";
import { getGridCreditCost } from "@/config/pricing";
import { getStylePresetById } from "@/config/styles";
import { buildDefaultSlots, getThemePackById } from "@/config/themes";
import { addCredits, holdCredits } from "@/lib/credits";
import { getObjectReadUrl, isR2Configured, uploadBufferToR2 } from "@/lib/r2";
import { enhanceSubjectDescription } from "@/lib/prompt/enhancer";
import { buildStickerGridPrompt } from "@/lib/prompt/builder";
import { getImageProvider } from "@/lib/ai/factory";
import type { ReferenceImageInput } from "@/lib/ai/types";

const CreatePackSchema = z.object({
  gridSize: z.enum(["3x3", "4x4"]),
  styleId: z.string().min(1),
  themeId: z.string().min(1),
  captionMode: z.enum(["none", "zh", "en"]),
  userPrompt: z.string().max(600).default(""),
  slots: z
    .array(
      z.object({
        index: z.number().int().min(0).max(15),
        pose: z.string().min(1).max(200),
        caption: z.string().max(16),
      })
    )
    .optional(),
  references: z
    .array(
      z.object({
        key: z.string().min(1),
        role: z.enum(["character", "pet", "outfit", "prop"]),
        mimeType: z.string().min(1),
      })
    )
    .max(4)
    .default([]),
});

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

async function resolveMasterImageUrl(key: string | null): Promise<string | null> {
  if (!key) return null;
  if (key.startsWith("data:") || key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }
  if (!isR2Configured()) return null;
  return getObjectReadUrl(key, 3600);
}

export async function GET(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(stickerPacks)
    .where(eq(stickerPacks.userId, session.user.id))
    .orderBy(desc(stickerPacks.createdAt))
    .limit(50);

  const packs = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      masterImageUrl: await resolveMasterImageUrl(row.masterImageKey),
    }))
  );

  return NextResponse.json({ packs });
}

export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreatePackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!getStylePresetById(data.styleId)) {
    return NextResponse.json({ error: "Invalid styleId" }, { status: 400 });
  }
  if (!getThemePackById(data.themeId)) {
    return NextResponse.json({ error: "Invalid themeId" }, { status: 400 });
  }

  if (!data.userPrompt.trim() && data.references.length === 0) {
    return NextResponse.json(
      { error: "Please provide a character description or at least one reference photo." },
      { status: 400 }
    );
  }

  const expectedCount = data.gridSize === "4x4" ? 16 : 9;
  const defaultSlots = buildDefaultSlots(data.themeId, data.gridSize, data.captionMode);
  const slotsConfig =
    data.slots && data.slots.length === expectedCount
      ? data.slots.map((s, idx) => ({
          index: idx,
          pose: defaultSlots[idx]?.pose ?? s.pose,
          caption: data.captionMode === "none" ? "" : s.caption.trim().slice(0, 12),
        }))
      : defaultSlots;

  const creditsCost = getGridCreditCost(data.gridSize);
  const packId = crypto.randomUUID();
  const userId = session.user.id;

  // 1. Atomically hold credits
  const remainingBalance = await holdCredits(
    userId,
    creditsCost,
    packId,
    `Generate ${data.gridSize} sticker pack (${data.styleId})`
  );

  if (remainingBalance === null) {
    return NextResponse.json(
      { error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" },
      { status: 402 }
    );
  }

  // 2. Insert PENDING pack record
  const db = getDb();
  await db.insert(stickerPacks).values({
    id: packId,
    userId,
    status: "PENDING",
    gridSize: data.gridSize,
    styleId: data.styleId,
    themeId: data.themeId,
    captionMode: data.captionMode,
    userPrompt: data.userPrompt.trim(),
    slotsConfig,
    referenceKeys: data.references,
    creditsCost,
  });

  // 3. Run generation asynchronously (mapped to ctx.waitUntil on Cloudflare Workers)
  after(async () => {
    try {
      await db
        .update(stickerPacks)
        .set({ status: "PROCESSING", updatedAt: new Date() })
        .where(eq(stickerPacks.id, packId));

      const enhancedDesc = await enhanceSubjectDescription(data.userPrompt);
      const finalPrompt = buildStickerGridPrompt({
        styleId: data.styleId,
        gridSize: data.gridSize,
        captionMode: data.captionMode,
        subjectDescription: enhancedDesc,
        slots: slotsConfig,
        referenceRoles: data.references.map((r) => r.role),
      });

      const resolvedRefs: ReferenceImageInput[] = await Promise.all(
        data.references.map(async (ref) => {
          const url =
            ref.key.startsWith("data:") || ref.key.startsWith("http")
              ? ref.key
              : await getObjectReadUrl(ref.key, 900);
          return {
            url,
            mimeType: ref.mimeType,
            role: ref.role,
          };
        })
      );

      const provider = getImageProvider();
      const result = await provider.generateGrid({
        prompt: finalPrompt,
        aspectRatio: "1:1",
        resolution: "4K",
        gridSize: data.gridSize,
        referenceImages: resolvedRefs,
        slotsPreview: slotsConfig.map((s) => ({ index: s.index, caption: s.caption })),
      });

      let masterImageKey: string;
      if (isR2Configured()) {
        const ext =
          result.mimeType === "image/webp"
            ? "webp"
            : result.mimeType === "image/svg+xml"
              ? "svg"
              : "png";
        masterImageKey = `packs/${userId}/${packId}/master.${ext}`;
        await uploadBufferToR2({
          key: masterImageKey,
          body: result.imageBytes,
          contentType: result.mimeType,
        });
      } else {
        // Local dev fallback without R2
        masterImageKey = bytesToDataUrl(result.imageBytes, result.mimeType);
      }

      await db
        .update(stickerPacks)
        .set({
          status: "COMPLETED",
          finalPrompt,
          masterImageKey,
          updatedAt: new Date(),
        })
        .where(eq(stickerPacks.id, packId));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed";
      console.error(`[pack:${packId}] Generation failed:`, err);

      await db
        .update(stickerPacks)
        .set({
          status: "FAILED",
          errorMessage: message.slice(0, 500),
          updatedAt: new Date(),
        })
        .where(eq(stickerPacks.id, packId));

      await addCredits(
        userId,
        creditsCost,
        "REFUND",
        packId,
        `Auto refund for failed pack ${packId}`
      );
    }
  });

  return NextResponse.json(
    {
      packId,
      status: "PENDING",
      creditsCost,
      remainingBalance,
    },
    { status: 202 }
  );
}
