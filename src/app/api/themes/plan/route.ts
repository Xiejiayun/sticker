import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/auth";
import { checkStudioMutation } from "@/lib/studio-request";
import {
  ThemePlannerNotConfiguredError,
  planCustomThemeSlots,
} from "@/lib/prompt/theme-planner";

const PlanThemeSchema = z.object({
  idea: z.string().trim().min(2).max(160),
  gridSize: z.enum(["3x3", "4x4"]),
  captionMode: z.enum(["none", "zh", "en"]),
  tone: z.enum(["auto", "cute", "funny", "sarcastic", "polite"]).optional().default("auto"),
  locale: z.enum(["zh", "en"]).optional().default("zh"),
  styleId: z.string().max(64).optional(),
  subjectDescription: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  const session = await getServerSession(request.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const failure = checkStudioMutation(request);
  if (failure) return failure;

  const body = await request.json().catch(() => null);
  const parsed = PlanThemeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const slots = await planCustomThemeSlots(parsed.data, request.signal);
    return NextResponse.json({ slots });
  } catch (err) {
    if (err instanceof ThemePlannerNotConfiguredError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 503 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Failed to plan custom theme";
    console.error("[themes/plan] Failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
