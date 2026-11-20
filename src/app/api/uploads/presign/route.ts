import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { createPresignedUploadUrl, isR2Configured } from "@/lib/r2";

const PresignSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024), // max 10MB
});

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = PresignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upload request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isR2Configured()) {
    return NextResponse.json({
      mode: "inline",
      message: "R2 not configured; client may send compressed data URI directly in local dev",
    });
  }

  const ext = EXT_MAP[parsed.data.contentType] ?? "jpg";
  const key = `refs/${session.user.id}/${crypto.randomUUID()}.${ext}`;
  const signed = await createPresignedUploadUrl({
    key,
    contentType: parsed.data.contentType,
  });

  return NextResponse.json({
    mode: "r2",
    uploadUrl: signed.uploadUrl,
    key: signed.key,
    publicUrl: signed.publicUrl,
  });
}
