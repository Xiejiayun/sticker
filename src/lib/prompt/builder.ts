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
    `Create one finished, high-resolution 1:1 square chat-expression sheet at the requested output resolution, arranged in exactly ${dims} rows and ${dims} columns (${total} distinct expressions total).`,
    `This is final artwork: after generation the sheet will only be sliced into equal cells, not repaired or repainted.`,
    ``,
    `[ART STYLE — STRICTLY LOCKED]`,
    style.promptSnippet,
    ``,
    `[LAYOUT & BACKGROUND RULES — CRITICAL FOR AUTO-SLICING]`,
    `- Solid pure #FFFFFF white background across the entire canvas.`,
    `- No white sticker outlines, die-cut rims, offset halos, backing shapes, glow or drop shadows. Dark contours intrinsic to the selected art style are allowed.`,
    `- NO visible grid lines, frames, dividing boxes, cell numbers, watermarks or sheet titles.`,
    `- Divide the full canvas into equal cells with no extra outer sheet margin. Place exactly one complete expression in each cell.`,
    `- Keep the character, props, motion marks and any caption inside the central 80% of each cell, leaving the same 10% clear safety margin on each side. Nothing may touch an edge or cross into a neighboring cell.`,
    `- Use a consistent character scale and visual center across all cells. Faces, hands and props must be complete, anatomically coherent and readable at chat-icon size.`,
    `- Keep the exact same character identity, proportions, face, hair/fur, outfit, and color palette across all ${total} stickers.`,
    `- Make each requested pose and emotion visibly distinct. Render finished, clean edges and restrained details instead of decorative clutter.`,
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
      `- Include bold, highly legible Simplified Chinese lettering next to or below each character, matching the exact text specified for each cell below. Use dark high-contrast letters with no white outline, and keep all lettering inside the cell safety margin.`
    );
  } else {
    lines.push(
      `- Include bold, highly legible English lettering next to or below each character, matching the exact text specified for each cell below. Use dark high-contrast letters with no white outline, and keep all lettering inside the cell safety margin.`
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
