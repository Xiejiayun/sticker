import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { checkTurnstile } from "@/lib/turnstile";
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
  const failure = await checkTurnstile(request.headers, "upload");
  if (failure) return NextResponse.json({ error: failure.message, code: failure.code }, { status: failure.status });

  const body = await request.json().catch(() => null);
  const parsed = PresignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid upload request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!isR2Configured()) {
    return NextResponse.json({ error: "Image storage is not configured" }, { status: 503 });
  }

  const ext = EXT_MAP[parsed.data.contentType] ?? "jpg";
  const key = `refs/${session.user.id}/${crypto.randomUUID()}.${ext}`;
  const signed = await createPresignedUploadUrl({
    key,
    contentType: parsed.data.contentType,
    fileSize: parsed.data.fileSize,
  });

  return NextResponse.json({
    mode: "r2",
    uploadUrl: signed.uploadUrl,
    url: signed.url,
  });
}
