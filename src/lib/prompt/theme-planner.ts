import { getStylePresetById } from "@/config/styles";
import { buildCustomActionPose, sanitizeCustomAction } from "@/config/themes";
import type { CaptionMode, GridSize, StickerSlotSnapshot } from "@/db/schema";

export type ThemePlanTone = "auto" | "cute" | "funny" | "sarcastic" | "polite";

export interface PlanCustomThemeInput {
  idea: string;
  gridSize: GridSize;
  captionMode: CaptionMode;
  tone?: ThemePlanTone;
  locale?: "zh" | "en";
  styleId?: string;
  subjectDescription?: string;
}

export class ThemePlannerNotConfiguredError extends Error {
  readonly code = "LLM_NOT_CONFIGURED";
  constructor() {
    super("AI theme planner is not configured");
  }
}

const TONE_GUIDANCE: Record<ThemePlanTone, string> = {
  auto: "Match the natural vibe of the user's theme idea.",
  cute: "Warm, adorable, sweet, healing, and expressive.",
  funny: "Comedic, exaggerated, meme-worthy, and playful.",
  sarcastic: "Witty, deadpan, teasing banter (friendly and safe-for-work).",
  polite: "Courteous, warm, friendly, and suitable for colleagues or elders.",
};

function getPlannerConfig() {
  const explicitlyDisabled = process.env.LLM_THEME_PLAN_ENABLED === "false";
  const apiKey = (
    process.env.LLM_THEME_PLAN_API_KEY ||
    process.env.LLM_ENHANCE_API_KEY ||
    ""
  ).trim();
  const apiBase = (
    process.env.LLM_THEME_PLAN_API_BASE ||
    process.env.LLM_ENHANCE_API_BASE ||
    "https://openrouter.ai/api/v1"
  ).replace(/\/$/, "");
  const model =
    process.env.LLM_THEME_PLAN_MODEL ||
    process.env.LLM_ENHANCE_MODEL ||
    "google/gemini-2.5-flash";

  return {
    configured: !explicitlyDisabled && apiKey.length > 0,
    apiKey,
    apiBase,
    model,
  };
}

export function isThemePlannerConfigured(): boolean {
  return getPlannerConfig().configured;
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1);
  }
  const firstBracket = candidate.indexOf("[");
  const lastBracket = candidate.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return candidate.slice(firstBracket, lastBracket + 1);
  }
  return candidate;
}

function sanitizeCaptionText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/["'`\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12);
}

export function parseThemePlanResponse(
  rawContent: string,
  options: {
    gridSize: GridSize;
    captionMode: CaptionMode;
    locale?: "zh" | "en";
  }
): StickerSlotSnapshot[] {
  const expectedCount = options.gridSize === "4x4" ? 16 : 9;
  const jsonText = extractJsonText(rawContent);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("AI returned malformed JSON for theme plan");
  }

  const rawSlots = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { slots?: unknown }).slots)
      ? (parsed as { slots: unknown[] }).slots
      : null;

  if (!rawSlots || rawSlots.length < expectedCount) {
    throw new Error(`AI returned too few slots (expected ${expectedCount})`);
  }

  const preferZh = options.captionMode === "zh" || (options.captionMode === "none" && options.locale !== "en");
  const result: StickerSlotSnapshot[] = [];

  for (let i = 0; i < expectedCount; i++) {
    const item = rawSlots[i];
    if (!item || typeof item !== "object") {
      throw new Error(`Invalid slot entry at index ${i}`);
    }
    const rec = item as Record<string, unknown>;
    const rawPoseZh = typeof rec.poseZh === "string" ? sanitizeCustomAction(rec.poseZh) : "";
    const rawPoseEn = typeof rec.pose === "string" ? sanitizeCustomAction(rec.pose) : "";
    const chosenAction = preferZh ? (rawPoseZh || rawPoseEn) : (rawPoseEn || rawPoseZh);

    if (!chosenAction) {
      throw new Error(`Empty action description at index ${i}`);
    }

    const built = buildCustomActionPose(chosenAction, 0);
    const captionZh = sanitizeCaptionText(rec.captionZh);
    const captionEn = sanitizeCaptionText(rec.captionEn);
    const caption =
      options.captionMode === "none"
        ? ""
        : options.captionMode === "zh"
          ? captionZh || captionEn
          : captionEn || captionZh;

    result.push({
      index: i,
      pose: built.pose,
      poseZh: rawPoseZh || built.poseZh,
      caption,
      customPose: chosenAction,
    });
  }

  return result;
}

export async function planCustomThemeSlots(
  input: PlanCustomThemeInput,
  signal?: AbortSignal
): Promise<StickerSlotSnapshot[]> {
  const config = getPlannerConfig();
  if (!config.configured) {
    throw new ThemePlannerNotConfiguredError();
  }

  const count = input.gridSize === "4x4" ? 16 : 9;
  const tone = input.tone ?? "auto";
  const style = input.styleId ? getStylePresetById(input.styleId) : undefined;
  const fetchSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(25_000)])
    : AbortSignal.timeout(25_000);

  const systemPrompt = [
    `You are a chat sticker pack director. Plan exactly ${count} distinct, visually expressive sticker poses for a ${input.gridSize} sticker sheet.`,
    `Return ONLY valid JSON with shape: {"slots":[{"pose":"short English visual action (<=55 chars)","poseZh":"简洁中文动作画面描述(10~20字)","captionZh":"2~5字中文短文案","captionEn":"1~2 word English caption (<=12 chars)"}]}`,
    `Rules:`,
    `- Exactly ${count} items in "slots", all visibly distinct in gesture, expression, and small props.`,
    `- Describe concrete visual actions/expressions (hands, face, props) suitable for small chat stickers.`,
    `- Keep everything safe-for-work, friendly, and copyright-free.`,
    `- Tone: ${TONE_GUIDANCE[tone]}`,
  ].join("\n");

  const userLines = [`Theme idea: ${input.idea.trim()}`];
  if (style) {
    userLines.push(`Art style context: ${style.nameEn} (${style.nameZh})`);
  }
  if (input.subjectDescription?.trim()) {
    userLines.push(`Character/subject context: ${input.subjectDescription.trim().slice(0, 200)}`);
  }

  const response = await fetch(`${config.apiBase}/chat/completions`, {
    signal: fetchSignal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.7,
      max_tokens: count === 16 ? 1800 : 1100,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userLines.join("\n") },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Theme planner upstream error (HTTP ${response.status})`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Theme planner returned empty response");
  }

  return parseThemePlanResponse(content, {
    gridSize: input.gridSize,
    captionMode: input.captionMode,
    locale: input.locale,
  });
}
