import { getStylePresetById, STYLE_PRESETS } from "@/config/styles";
import type { CaptionMode, GridSize, StickerSlotSnapshot } from "@/db/schema";

export interface BuildPromptInput {
  styleId: string;
  gridSize: GridSize;
  captionMode: CaptionMode;
  subjectDescription: string;
  slots: StickerSlotSnapshot[];
  referenceRoles: Array<"character" | "pet" | "outfit" | "prop">;
}

const ROLE_LABELS: Record<"character" | "pet" | "outfit" | "prop", string> = {
  character: "main character face, hair, and identity",
  pet: "main pet species, fur markings, and appearance",
  outfit: "character clothing and accessories",
  prop: "featured prop or item",
};

export function buildStickerGridPrompt(input: BuildPromptInput): string {
  const style = getStylePresetById(input.styleId) ?? STYLE_PRESETS[0];
  const dims = input.gridSize === "4x4" ? 4 : 3;
  const total = dims * dims;

  const lines: string[] = [
    `Create a single ultra-crisp 4K (4096x4096) 1:1 square sticker sheet arranged in an exact ${dims}x${dims} evenly spaced grid (${total} distinct die-cut stickers total).`,
    ``,
    `[ART STYLE — STRICTLY LOCKED]`,
    style.promptSnippet,
    ``,
    `[LAYOUT & BACKGROUND RULES — CRITICAL FOR AUTO-SLICING]`,
    `- Solid pure #FFFFFF white background across the entire canvas.`,
    `- NO grid lines, NO borders, NO dividing boxes, NO drop shadows on the background.`,
    `- Each of the ${total} stickers must be completely self-contained inside its own ${dims}x${dims} cell with generous uniform pure-white margin around every sticker so nothing touches or overlaps neighboring cells.`,
    `- Keep the exact same character identity, proportions, face, hair/fur, outfit, and color palette across all ${total} stickers.`,
  ];

  if (input.referenceRoles.length > 0) {
    lines.push(``, `[REFERENCE IMAGES]`);
    input.referenceRoles.forEach((role, idx) => {
      lines.push(`- Reference Image ${idx + 1}: Use as ${ROLE_LABELS[role]}.`);
    });
  }

  if (input.subjectDescription.trim()) {
    lines.push(``, `[CHARACTER / SUBJECT DESCRIPTION]`, input.subjectDescription.trim());
  }

  lines.push(``, `[CAPTION RULE]`);
  if (input.captionMode === "none") {
    lines.push(
      `- Pure visual expressions ONLY. Do NOT draw any text, letters, numbers, or speech bubbles anywhere on the image.`
    );
  } else if (input.captionMode === "zh") {
    lines.push(
      `- Include cute, bold, highly legible Simplified Chinese hand-lettered sticker text with a crisp outline next to or below each character, matching the exact text specified for each cell below.`
    );
  } else {
    lines.push(
      `- Include cute, bold, highly legible English cartoon sticker lettering with a crisp outline next to or below each character, matching the exact text specified for each cell below.`
    );
  }

  lines.push(``, `[CELL-BY-CELL EXPRESSIONS (Row 1..${dims}, Col 1..${dims})]`);
  input.slots.slice(0, total).forEach((slot, idx) => {
    const row = Math.floor(idx / dims) + 1;
    const col = (idx % dims) + 1;
    const captionPart =
      input.captionMode !== "none" && slot.caption.trim()
        ? ` | Text: "${slot.caption.trim()}"`
        : "";
    lines.push(`- (Row ${row}, Col ${col}): ${slot.pose}${captionPart}`);
  });

  return lines.join("\n");
}
