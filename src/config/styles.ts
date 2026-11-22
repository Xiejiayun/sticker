export interface StylePreset {
  id: string;
  nameZh: string;
  nameEn: string;
  taglineZh: string;
  taglineEn: string;
  accentColor: string;
  badgeEmoji: string;
  previewImage: string;
  promptSnippet: string;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "chibi-handdrawn",
    nameZh: "日系 Q 版手绘",
    nameEn: "Chibi Hand-Drawn",
    taglineZh: "软萌二头身、彩铅手绘质感、治愈系贴纸",
    taglineEn: "2-head-tall kawaii chibi with warm colored-pencil lineart",
    accentColor: "#FF8FAB",
    badgeEmoji: "🌸",
    previewImage: "/styles/chibi-handdrawn.png",
    promptSnippet:
      "Japanese kawaii chibi hand-drawn sticker illustration, 2-head-tall cute proportions, warm soft ink outlines, gentle colored pencil and pastel shading, charming expressive eyes, clean sticker silhouette",
  },
  {
    id: "3d-blindbox",
    nameZh: "3D 盲盒粘土",
    nameEn: "3D Blind Box Clay",
    taglineZh: "泡泡玛特式潮玩质感、柔和磨砂立体光影",
    taglineEn: "Pop-Mart style vinyl toy with matte clay texture",
    accentColor: "#FFB703",
    badgeEmoji: "🧸",
    previewImage: "/styles/3d-blindbox.png",
    promptSnippet:
      "3D blind box designer vinyl toy character, soft matte clay and PVC material, chunky cute rounded proportions, soft frontal studio lighting contained within the character, expressive toy-like face, clean silhouette without a backing border or rim glow",
  },
  {
    id: "american-bold",
    nameZh: "美式粗线条卡通",
    nameEn: "Retro Bold Cartoon",
    taglineZh: "高饱和赛璐璐平涂、夸张张力、潮酷美漫风",
    taglineEn: "Thick black outlines with vibrant cel-shading",
    accentColor: "#FB5607",
    badgeEmoji: "⚡",
    previewImage: "/styles/american-bold.png",
    promptSnippet:
      "Bold retro American cartoon sticker art, thick dynamic black ink outlines, vibrant flat cel-shading, exaggerated comedic expressions, energetic pop-art color palette",
  },
  {
    id: "flat-vector",
    nameZh: "扁平矢量贴纸",
    nameEn: "Flat Vector Sticker",
    taglineZh: "极简利落几何线条、现代品牌级贴纸视觉",
    taglineEn: "Crisp geometric vector illustration with modern flat colors",
    accentColor: "#3A86FF",
    badgeEmoji: "✨",
    previewImage: "/styles/flat-vector.png",
    promptSnippet:
      "Modern flat vector chat expression illustration, ultra-clean geometric curves, crisp uniform dark stroke weight, harmonious bright flat colors with subtle minimal highlights, clean messaging emote silhouette with no backing border",
  },
  {
    id: "watercolor-cute",
    nameZh: "治愈水彩插画",
    nameEn: "Soft Watercolor",
    taglineZh: "绘本级晕染笔触、温柔细腻、清新氛围感",
    taglineEn: "Delicate storybook watercolor washes and fine ink contours",
    accentColor: "#8ECAE6",
    badgeEmoji: "🎨",
    previewImage: "/styles/watercolor-cute.png",
    promptSnippet:
      "Dreamy storybook watercolor sticker illustration, soft translucent pigment washes, delicate fine-liner contour, warm pastel tones, gentle cozy atmosphere, clean outer contour",
  },
  {
    id: "pixel-retro",
    nameZh: "复古像素风",
    nameEn: "Retro Pixel Art",
    taglineZh: "精致 32-bit 游戏精灵、复古街机可爱感",
    taglineEn: "Crisp 32-bit pixel art sprites with nostalgic game charm",
    accentColor: "#8338EC",
    badgeEmoji: "👾",
    previewImage: "/styles/pixel-retro.png",
    promptSnippet:
      "Crisp 32-bit retro pixel art emote sprite, sharp pixel grid alignment, clean dark pixel outlines, vibrant indie game color palette, adorable readable expressions",
  },
  {
    id: "doodle-meme",
    nameZh: "魔性简笔画",
    nameEn: "Meme Doodle",
    taglineZh: "粗马克笔搞笑涂鸦、灵魂画手、微信斗图神器",
    taglineEn: "Expressive thick-marker comedic doodle for viral chats",
    accentColor: "#2EC4B6",
    badgeEmoji: "🤪",
    previewImage: "/styles/doodle-meme.png",
    promptSnippet:
      "Hilarious viral chat meme doodle sticker, chunky hand-drawn black marker lines, minimal flat spot color accents, wildly expressive funny cartoon faces, witty internet meme energy",
  },
];

export function getStylePresetById(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((style) => style.id === id);
}
