export type StorePlatformId =
  | "wechat"
  | "line"
  | "whatsapp"
  | "telegram"
  | "discord"
  | "slack";

export type DiscordMode = "emoji" | "sticker";

export interface PlatformCompanionSpec {
  width: number;
  height: number;
  maxBytes: number;
  format: "png" | "jpg";
  requiresTransparency: boolean;
  labelZh: string;
  labelEn: string;
}

export interface StorePlatformSpec {
  id: StorePlatformId;
  nameZh: string;
  nameEn: string;
  badgeZh: string;
  badgeEn: string;
  summaryZh: string;
  summaryEn: string;
  stickerWidth: number;
  stickerHeight: number;
  stickerFormat: "png" | "webp";
  stickerMaxBytes: number;
  animatedFormat: "gif" | null;
  animatedMaxBytes: number | null;
  requiresTransparency: boolean;
  validCounts: number[] | { min: number; max: number } | null;
  thumbnails?: PlatformCompanionSpec;
  cover?: PlatformCompanionSpec;
  icon?: PlatformCompanionSpec;
  banner?: PlatformCompanionSpec;
}

export const STORE_PLATFORM_SPECS: Record<StorePlatformId, StorePlatformSpec> = {
  wechat: {
    id: "wechat",
    nameZh: "微信表情开放平台",
    nameEn: "WeChat Sticker Store",
    badgeZh: "全套物料",
    badgeEn: "Full Bundle",
    summaryZh: "240×240 主图 + 120×120 缩略图 + 封面 + 50×50 图标 + 750×400 无字横幅",
    summaryEn: "240×240 stickers + 120×120 thumbs + Cover + 50×50 Icon + 750×400 Banner",
    stickerWidth: 240,
    stickerHeight: 240,
    stickerFormat: "png",
    stickerMaxBytes: 100 * 1024,
    animatedFormat: "gif",
    animatedMaxBytes: 100 * 1024,
    requiresTransparency: true,
    validCounts: [16, 24],
    thumbnails: {
      width: 120,
      height: 120,
      maxBytes: 50 * 1024,
      format: "png",
      requiresTransparency: true,
      labelZh: "表情缩略图 (120×120)",
      labelEn: "Thumbnails (120×120)",
    },
    cover: {
      width: 240,
      height: 240,
      maxBytes: 80 * 1024,
      format: "png",
      requiresTransparency: true,
      labelZh: "表情封面 (240×240)",
      labelEn: "Store Cover (240×240)",
    },
    icon: {
      width: 50,
      height: 50,
      maxBytes: 30 * 1024,
      format: "png",
      requiresTransparency: true,
      labelZh: "聊天面板图标 (50×50)",
      labelEn: "Chat Panel Icon (50×50)",
    },
    banner: {
      width: 750,
      height: 400,
      maxBytes: 80 * 1024,
      format: "jpg",
      requiresTransparency: false,
      labelZh: "详情页横幅 (750×400 无字)",
      labelEn: "Detail Banner (750×400 No Text)",
    },
  },
  line: {
    id: "line",
    nameZh: "LINE Creators Market",
    nameEn: "LINE Creators Market",
    badgeZh: "含 Main/Tab",
    badgeEn: "Main + Tab",
    summaryZh: "370×320 透明 PNG + 240×240 Main 主图 + 96×74 Tab 图标",
    summaryEn: "370×320 transparent PNG + 240×240 Main + 96×74 Tab",
    stickerWidth: 370,
    stickerHeight: 320,
    stickerFormat: "png",
    stickerMaxBytes: 1024 * 1024,
    animatedFormat: null,
    animatedMaxBytes: null,
    requiresTransparency: true,
    validCounts: [8, 16, 24, 32, 40],
    cover: {
      width: 240,
      height: 240,
      maxBytes: 1024 * 1024,
      format: "png",
      requiresTransparency: true,
      labelZh: "Main 主图 (240×240)",
      labelEn: "Main Image (240×240)",
    },
    icon: {
      width: 96,
      height: 74,
      maxBytes: 1024 * 1024,
      format: "png",
      requiresTransparency: true,
      labelZh: "Tab 聊天标签图标 (96×74)",
      labelEn: "Tab Icon (96×74)",
    },
  },
  whatsapp: {
    id: "whatsapp",
    nameZh: "WhatsApp 贴纸包",
    nameEn: "WhatsApp Stickers",
    badgeZh: "WebP <100KB",
    badgeEn: "WebP <100KB",
    summaryZh: "512×512 透明 WebP (≤100KB) + 96×96 托盘图标 (≤50KB)",
    summaryEn: "512×512 transparent WebP (≤100KB) + 96×96 Tray Icon (≤50KB)",
    stickerWidth: 512,
    stickerHeight: 512,
    stickerFormat: "webp",
    stickerMaxBytes: 100 * 1024,
    animatedFormat: null,
    animatedMaxBytes: null,
    requiresTransparency: true,
    validCounts: { min: 3, max: 30 },
    icon: {
      width: 96,
      height: 96,
      maxBytes: 50 * 1024,
      format: "png",
      requiresTransparency: true,
      labelZh: "Tray 托盘图标 (96×96)",
      labelEn: "Tray Icon (96×96)",
    },
  },
  telegram: {
    id: "telegram",
    nameZh: "Telegram Stickers",
    nameEn: "Telegram Stickers",
    badgeZh: "512px 高清",
    badgeEn: "512px HD",
    summaryZh: "512×512 透明 PNG (≤512KB) + 可选 100×100 贴纸包图标",
    summaryEn: "512×512 transparent PNG (≤512KB) + optional 100×100 Pack Icon",
    stickerWidth: 512,
    stickerHeight: 512,
    stickerFormat: "png",
    stickerMaxBytes: 512 * 1024,
    animatedFormat: null,
    animatedMaxBytes: null,
    requiresTransparency: true,
    validCounts: { min: 1, max: 120 },
    icon: {
      width: 100,
      height: 100,
      maxBytes: 512 * 1024,
      format: "png",
      requiresTransparency: true,
      labelZh: "贴纸包图标 (100×100 可选)",
      labelEn: "Pack Icon (100×100 Optional)",
    },
  },
  discord: {
    id: "discord",
    nameZh: "Discord",
    nameEn: "Discord",
    badgeZh: "Emoji / 贴纸",
    badgeEn: "Emoji / Sticker",
    summaryZh: "Emoji 128×128 (≤256KB) 或 服务器贴纸 320×320 (≤512KB)",
    summaryEn: "Emoji 128×128 (≤256KB) or Server Sticker 320×320 (≤512KB)",
    stickerWidth: 128,
    stickerHeight: 128,
    stickerFormat: "png",
    stickerMaxBytes: 256 * 1024,
    animatedFormat: "gif",
    animatedMaxBytes: 256 * 1024,
    requiresTransparency: false,
    validCounts: null,
  },
  slack: {
    id: "slack",
    nameZh: "Slack 自定义表情",
    nameEn: "Slack Custom Emoji",
    badgeZh: "严控 <128KB",
    badgeEn: "Strict <128KB",
    summaryZh: "128×128 正方形 PNG 或 GIF，单文件严格小于 128KB",
    summaryEn: "128×128 square PNG or GIF, strictly under 128KB per file",
    stickerWidth: 128,
    stickerHeight: 128,
    stickerFormat: "png",
    stickerMaxBytes: 127 * 1024,
    animatedFormat: "gif",
    animatedMaxBytes: 127 * 1024,
    requiresTransparency: false,
    validCounts: null,
  },
};

export interface ComplianceCheckItem {
  id: string;
  status: "pass" | "warn" | "info";
  labelZh: string;
  labelEn: string;
}

export function evaluatePlatformChecklist(input: {
  platform: StorePlatformId;
  stickerCount: number;
  removeBackground: boolean;
  animated: boolean;
  hasAiCover?: boolean;
  hasAiIcon?: boolean;
  hasAiBanner?: boolean;
  discordMode?: DiscordMode;
}): ComplianceCheckItem[] {
  const spec = STORE_PLATFORM_SPECS[input.platform];
  const items: ComplianceCheckItem[] = [];

  // 1. Count check
  if (input.platform === "wechat") {
    const valid = input.stickerCount === 16 || input.stickerCount === 24;
    items.push({
      id: "count",
      status: valid ? "pass" : "warn",
      labelZh: valid
        ? `表情数量 ${input.stickerCount} 张（符合微信专辑 16/24 张要求）`
        : `当前为 ${input.stickerCount} 张（微信专辑需 16 或 24 张；9 张可用于单品投稿）`,
      labelEn: valid
        ? `${input.stickerCount} stickers (matches WeChat 16/24-pack rule)`
        : `${input.stickerCount} stickers (WeChat albums require 16 or 24; 9 works for individual singles)`,
    });
  } else if (input.platform === "line") {
    const counts = spec.validCounts as number[];
    const exact = counts.includes(input.stickerCount);
    items.push({
      id: "count",
      status: exact ? "pass" : "info",
      labelZh: exact
        ? `表情数量 ${input.stickerCount} 张（符合 LINE 8/16/24/32/40 张档位）`
        : `当前 ${input.stickerCount} 张（LINE 上架需选 8 张，导出包内可任选 8 张上传）`,
      labelEn: exact
        ? `${input.stickerCount} stickers (matches LINE tier)`
        : `${input.stickerCount} stickers (select 8 of them when submitting an 8-pack on LINE)`,
    });
  } else if (Array.isArray(spec.validCounts)) {
    const valid = spec.validCounts.includes(input.stickerCount);
    items.push({
      id: "count",
      status: valid ? "pass" : "warn",
      labelZh: `${input.stickerCount} 张贴纸`,
      labelEn: `${input.stickerCount} stickers`,
    });
  } else if (spec.validCounts) {
    const valid =
      input.stickerCount >= spec.validCounts.min && input.stickerCount <= spec.validCounts.max;
    items.push({
      id: "count",
      status: valid ? "pass" : "warn",
      labelZh: valid
        ? `数量 ${input.stickerCount} 张（符合 ${spec.validCounts.min}~${spec.validCounts.max} 张要求）`
        : `需 ${spec.validCounts.min}~${spec.validCounts.max} 张`,
      labelEn: valid
        ? `${input.stickerCount} stickers (within ${spec.validCounts.min}–${spec.validCounts.max})`
        : `Requires ${spec.validCounts.min}–${spec.validCounts.max} stickers`,
    });
  }

  // 2. Transparency check
  if (spec.requiresTransparency) {
    items.push({
      id: "transparency",
      status: input.removeBackground ? "pass" : "warn",
      labelZh: input.removeBackground
        ? "已启用透明背景（无白底硬边框）"
        : "建议开启透明背景，避免审稿因白底/直角边框被退回",
      labelEn: input.removeBackground
        ? "Transparent background enabled (no hard white box)"
        : "Transparent background recommended to avoid rectangular box rejection",
    });
  }

  // 3. Format & byte budget check
  const activeDims =
    input.platform === "discord" && input.discordMode === "sticker"
      ? { w: 320, h: 320, maxKb: 512 }
      : {
          w: spec.stickerWidth,
          h: spec.stickerHeight,
          maxKb: Math.round(spec.stickerMaxBytes / 1024),
        };

  if (input.animated && spec.animatedFormat === null) {
    items.push({
      id: "animation",
      status: "warn",
      labelZh: `${spec.nameZh} 静态投稿路径将导出合规静态 ${spec.stickerFormat.toUpperCase()}（如需动图请留意平台 APNG/WebM 规范）`,
      labelEn: `${spec.nameEn} store bundle exports compliant static ${spec.stickerFormat.toUpperCase()}`,
    });
  } else {
    const fmt = input.animated && spec.animatedFormat ? "GIF" : spec.stickerFormat.toUpperCase();
    items.push({
      id: "size",
      status: "pass",
      labelZh: `主图自动对齐 ${activeDims.w}×${activeDims.h} ${fmt} 且自动压至 ≤${activeDims.maxKb}KB`,
      labelEn: `Stickers sized to ${activeDims.w}×${activeDims.h} ${fmt} and compressed ≤${activeDims.maxKb}KB`,
    });
  }

  // 4. Companion assets check
  if (input.platform === "wechat") {
    items.push({
      id: "companions",
      status: "pass",
      labelZh: `配套齐备：120×120 缩略图 · 封面(${input.hasAiCover ? "AI精绘" : "贴纸"}) · 图标(${input.hasAiIcon ? "AI精绘" : "裁切"}) · 无字横幅(${input.hasAiBanner ? "AI精绘" : "模板"})`,
      labelEn: `All WeChat companion assets included (${input.hasAiBanner ? "AI Banner" : "No-text template"})`,
    });
  } else if (spec.cover || spec.icon) {
    const partsZh: string[] = [];
    const partsEn: string[] = [];
    if (spec.cover) {
      partsZh.push(spec.cover.labelZh);
      partsEn.push(spec.cover.labelEn);
    }
    if (spec.icon) {
      partsZh.push(spec.icon.labelZh);
      partsEn.push(spec.icon.labelEn);
    }
    items.push({
      id: "companions",
      status: "pass",
      labelZh: `已包含配套图标：${partsZh.join(" + ")}`,
      labelEn: `Companion assets included: ${partsEn.join(" + ")}`,
    });
  }

  return items;
}
