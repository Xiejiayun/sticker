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

export interface BuildAnimatedSpritePromptInput {
  styleId: string;
  gridSize: GridSize;
  layoutKind: "single" | "single-16" | "dual" | "quad";
  subjectDescription: string;
  slots: StickerSlotSnapshot[];
  referenceRoles: Array<"character" | "pet" | "outfit" | "prop">;
}

export function buildAnimatedSpritePrompt(input: BuildAnimatedSpritePromptInput): string {
  const style = getStylePresetById(input.styleId) ?? STYLE_PRESETS[0];
  const layoutKind = input.layoutKind;
  const dims = layoutKind === "single" ? 3 : 4;
  const total = dims * dims;

  const headerLine =
    layoutKind === "single-16"
      ? `Create one finished, high-resolution 1:1 square ANIMATION SPRITE SHEET arranged in exactly 4 rows and 4 columns (16 sequential frames total), reading left-to-right, top-to-bottom (Row 1 Col 1 -> Row 4 Col 4) to form ONE ultra-smooth, fluid 16-frame looping sticker animation.`
      : layoutKind === "dual"
        ? `Create one finished, high-resolution 1:1 square ANIMATION SPRITE SHEET arranged in exactly 4 rows and 4 columns (16 cells total): 2 independent smooth 8-frame looping sticker animations. Animation 1 spans Rows 1-2 (Row 1 Col 1..4 then Row 2 Col 1..4); Animation 2 spans Rows 3-4 (Row 3 Col 1..4 then Row 4 Col 1..4).`
        : layoutKind === "quad"
          ? `Create one finished, high-resolution 1:1 square ANIMATION SPRITE SHEET arranged in exactly 4 rows and 4 columns (16 cells total): 4 independent looping sticker animations, where EACH ROW (Col 1 -> Col 2 -> Col 3 -> Col 4) is one complete 4-frame looping animation.`
          : `Create one finished, high-resolution 1:1 square ANIMATION SPRITE SHEET arranged in exactly 3 rows and 3 columns (9 sequential frames total), reading left-to-right, top-to-bottom (Row 1 Col 1 -> Row 3 Col 3) to form ONE continuous, smooth 9-frame looping sticker animation.`;

  const lines: string[] = [
    headerLine,
    `This is final animation artwork: after generation the sheet will be sliced into equal cells and compiled directly into an animated GIF/APNG sticker.`,
    ``,
    `[ANIMATION SPRITE SHEET — LOCKED CAMERA & REGISTRATION RULES]`,
    `- STRICTLY LOCKED CAMERA: Use the exact same front-facing camera angle, focal distance, character height, head-to-body ratio, and horizontal/vertical anchor baseline across every frame of an animation sequence. NO camera zoom, pan, tilt, or sudden scale jumps between frames.`,
    `- CONSISTENT CHARACTER IDENTITY: Keep the exact same character face, hair/fur markings, outfit, colors, and line thickness in every single cell.`,
    `- SMALL INCREMENTAL MOTION & SEAMLESS LOOP: Keep pose changes between adjacent frames SMALL, GENTLE, and FLUID (true animation in-betweens rather than abrupt pose jumps). Follow anticipation -> rising action -> climax hold -> smooth follow-through, and make the final frame of each sequence ease smoothly back into Frame 1.`,
    `- PURE VISUAL ANIMATION ONLY — NO TEXT: Do NOT draw any text, Chinese/English captions, letters, numbers, frame labels ("1", "2", "F1"), arrows, or speech bubbles anywhere on the image. Small iconic motion accents (tiny hearts, sparkles, sweat drops, steam puffs, motion arcs) are encouraged when requested.`,
    ``,
    `[ART STYLE — STRICTLY LOCKED]`,
    style.promptSnippet,
    ``,
    `[LAYOUT & BACKGROUND RULES — CRITICAL FOR AUTO-SLICING]`,
    `- Solid pure #FFFFFF white background across the entire canvas.`,
    `- No white sticker outlines, die-cut rims, offset halos, backing shapes, drop shadows, or ground shadow puddles (clean alpha cutout is computed per frame). Dark contours intrinsic to the selected art style are allowed.`,
    `- NO visible grid lines, borders, dividing boxes, filmstrip frames, watermarks, or titles.`,
    `- Divide the full 1:1 canvas into ${dims}x${dims} equal cells with zero outer sheet margin. Keep the character and all motion accents comfortably inside the central 78% of each cell (at least 11% pure #FFFFFF safety margin on all 4 sides) so nothing is ever clipped or touches a neighbor.`,
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

  if (layoutKind === "single-16") {
    lines.push(``, `[16 SEQUENTIAL ANIMATION FRAMES (Row 1..4, Col 1..4 — 1 ultra-smooth continuous loop)]`);
    input.slots.slice(0, 16).forEach((slot, idx) => {
      const row = Math.floor(idx / 4) + 1;
      const col = (idx % 4) + 1;
      lines.push(`- (Row ${row}, Col ${col} | Frame ${idx + 1}/16): ${slot.pose}`);
    });
  } else if (layoutKind === "dual") {
    lines.push(``, `[2 INDEPENDENT 8-FRAME ANIMATIONS (Clip 1 = Rows 1-2, Clip 2 = Rows 3-4)]`);
    for (let g = 0; g < 2; g++) {
      const clipSlots = input.slots.slice(g * 8, g * 8 + 8);
      const label = clipSlots[0]?.customPose || clipSlots[0]?.animActionId || `Animation ${g + 1}`;
      const startRow = g * 2 + 1;
      lines.push(
        `Animation ${g + 1} (${label} — 8-frame smooth loop across Rows ${startRow}-${startRow + 1}, keep identical scale & baseline across all 8 frames):`
      );
      clipSlots.forEach((slot, fIdx) => {
        const cellIdx = g * 8 + fIdx;
        const row = Math.floor(cellIdx / 4) + 1;
        const col = (cellIdx % 4) + 1;
        lines.push(`- (Row ${row}, Col ${col} | Frame ${fIdx + 1}/8): ${slot.pose}`);
      });
    }
  } else if (layoutKind === "quad") {
    lines.push(``, `[4 INDEPENDENT 4-FRAME ANIMATION STRIPS (Row 1..4, each Col 1..4)]`);
    for (let row = 0; row < 4; row++) {
      const rowSlots = input.slots.slice(row * 4, row * 4 + 4);
      const label = rowSlots[0]?.customPose || rowSlots[0]?.animActionId || `Animation ${row + 1}`;
      lines.push(`Row ${row + 1} (${label} — 4-frame loop, keep identical scale & baseline across Col 1..4):`);
      rowSlots.forEach((slot, col) => {
        lines.push(`- (Row ${row + 1}, Col ${col + 1} | Frame ${col + 1}/4): ${slot.pose}`);
      });
    }
  } else {
    lines.push(``, `[9 SEQUENTIAL ANIMATION FRAMES (Row 1..3, Col 1..3 — 1 continuous loop)]`);
    input.slots.slice(0, total).forEach((slot, idx) => {
      const row = Math.floor(idx / dims) + 1;
      const col = (idx % dims) + 1;
      lines.push(`- (Row ${row}, Col ${col} | Frame ${idx + 1}/9): ${slot.pose}`);
    });
  }

  return lines.join("\n");
}
