import { getStylePresetById, STYLE_PRESETS } from "@/config/styles";
import { getThemePackById } from "@/config/themes";
import type { StoreAssetKind } from "@/lib/ai/types";

export type StoreAssetMood = "auto" | "cheerful" | "cozy" | "office" | "festive" | "playful";

export const STORE_ASSET_MOODS: Array<{
  id: StoreAssetMood;
  zh: string;
  en: string;
  promptHint: string;
}> = [
  {
    id: "auto",
    zh: "自动匹配",
    en: "Auto Match",
    promptHint: "harmonious bright storytelling mood matching the original sticker pack theme",
  },
  {
    id: "cheerful",
    zh: "元气明朗",
    en: "Sunny & Upbeat",
    promptHint: "sunny, cheerful, vibrant pastel atmosphere with joyful energy",
  },
  {
    id: "cozy",
    zh: "温馨治愈",
    en: "Cozy & Warm",
    promptHint: "soft warm cozy afternoon atmosphere with gentle comforting lighting",
  },
  {
    id: "office",
    zh: "职场趣味",
    en: "Work & Coffee",
    promptHint: "playful modern desk or coffee break vibe with charming daily props",
  },
  {
    id: "festive",
    zh: "喜庆派对",
    en: "Festive Party",
    promptHint: "celebratory confetti, stars, and warm festive party ambiance",
  },
  {
    id: "playful",
    zh: "搞怪萌趣",
    en: "Playful Meme",
    promptHint: "comedic, expressive, high-energy playful mood full of personality",
  },
];

export interface BuildStoreAssetPromptInput {
  kind: StoreAssetKind;
  platform?: string;
  styleId: string;
  themeId: string;
  packUserPrompt: string;
  customUserPrompt?: string;
  mood?: StoreAssetMood;
}

export function buildStoreAssetPrompt(input: BuildStoreAssetPromptInput): string {
  const style = getStylePresetById(input.styleId) ?? STYLE_PRESETS[0];
  const theme = getThemePackById(input.themeId);
  const moodSpec =
    STORE_ASSET_MOODS.find((m) => m.id === (input.mood ?? "auto")) ?? STORE_ASSET_MOODS[0];

  const lines: string[] = [
    `Reference Image 1 is the finished sticker sheet from this exact character pack.`,
    `Preserve the EXACT same character identity, face, proportions, outfit, colors, and art style as Reference Image 1.`,
    ``,
    `[ART STYLE — STRICTLY LOCKED]`,
    style.promptSnippet,
  ];

  if (theme) {
    lines.push(``, `[PACK THEME CONTEXT]`, `${theme.nameEn} (${theme.descriptionEn})`);
  }

  if (input.packUserPrompt.trim()) {
    lines.push(``, `[ORIGINAL CHARACTER DESCRIPTION]`, input.packUserPrompt.trim());
  }

  if (input.kind === "cover") {
    lines.push(
      ``,
      `[TASK: STICKER PACK STORE COVER IMAGE (1:1 SQUARE)]`,
      `- Create ONE iconic flagship pose (half-body or full-body) of the exact character from Reference Image 1, smiling or waving welcomingly as the storefront cover.`,
      `- Mood: ${moodSpec.promptHint}.`,
      `- Background MUST be solid pure #FFFFFF white across the entire canvas so it cuts cleanly to transparent.`,
      `- NO square frames, NO borders, NO backing cards, NO stickersheet grid, NO drop shadow cast onto the background.`,
      `- Keep the entire character comfortably centered inside the middle 82% of the square so nothing is cropped at edges.`,
      `- ABSOLUTELY ZERO text, NO letters, NO numbers, NO speech bubbles, NO watermarks.`
    );
  } else if (input.kind === "icon") {
    lines.push(
      ``,
      `[TASK: CHAT PANEL TAB ICON (1:1 SQUARE CLOSE-UP)]`,
      `- Create a clean, bold, front-facing HEAD-AND-FACE CLOSE-UP portrait of the character from Reference Image 1 (filling ~75% of the canvas).`,
      `- Optimize for ultra-high legibility at tiny 50x50 pixel chat-tab icon size: bold silhouette, clear eyes and expression, minimal tiny clutter.`,
      `- Background MUST be solid pure #FFFFFF white across the entire canvas so it cuts cleanly to transparent.`,
      `- NO square frames, NO borders, NO hands/props cutting off awkwardly, NO grid.`,
      `- ABSOLUTELY ZERO text, NO letters, NO numbers, NO watermarks.`
    );
  } else {
    lines.push(
      ``,
      `[TASK: STICKER STORE DETAIL PAGE BANNER (16:9 WIDE ILLUSTRATION${input.platform ? ` FOR ${input.platform.toUpperCase()}` : ""})]`,
      `- Create a vibrant, charming, story-driven horizontal 16:9 banner illustration featuring 2 to 3 playful poses or interactive moments of the exact character from Reference Image 1.`,
      `- Mood & Scene: ${moodSpec.promptHint}.`,
      `- Use a lively, rich, colorful illustrated background that stands out distinctly against a light-gray (#EDEDED) or white app UI (avoid a plain flat white background).`,
      `- CRITICAL COMPLIANCE RULE: ABSOLUTELY NO TEXT ANYWHERE IN THE IMAGE. Zero Chinese characters, zero English words, zero letters, zero numbers, zero banners/signs with writing, zero logos, zero watermarks.`
    );
  }

  if (input.customUserPrompt?.trim()) {
    lines.push(
      ``,
      `[USER CUSTOM DIRECTION — PRIORITIZE WHILE KEEPING COMPLIANCE RULES]`,
      input.customUserPrompt.trim()
    );
  }

  return lines.join("\n");
}
