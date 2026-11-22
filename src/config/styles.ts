export type StyleCategory = "illustration" | "3d-craft" | "pop-fun";

export interface StylePreset {
  id: string;
  category: StyleCategory;
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
    category: "illustration",
    nameZh: "日系 Q 版手绘",
    nameEn: "Chibi Hand-Drawn",
    taglineZh: "软萌二头身、彩铅手绘质感、治愈系贴纸",
    taglineEn: "2-head-tall kawaii chibi with warm colored-pencil lineart",
    accentColor: "#FF8FAB",
    badgeEmoji: "🌸",
    previewImage: "/styles/chibi-handdrawn.webp",
    promptSnippet:
      "Japanese kawaii chibi hand-drawn sticker illustration, 2-head-tall cute proportions, warm soft ink outlines, gentle colored pencil and pastel shading, charming expressive eyes, clean sticker silhouette",
  },
  {
    id: "3d-blindbox",
    category: "3d-craft",
    nameZh: "3D 盲盒粘土",
    nameEn: "3D Blind Box Clay",
    taglineZh: "泡泡玛特式潮玩质感、柔和磨砂立体光影",
    taglineEn: "Pop-Mart style vinyl toy with matte clay texture",
    accentColor: "#FFB703",
    badgeEmoji: "🧸",
    previewImage: "/styles/3d-blindbox.webp",
    promptSnippet:
      "3D blind box designer vinyl toy character, soft matte clay and PVC material, chunky cute rounded proportions, soft frontal studio lighting contained within the character, expressive toy-like face, clean silhouette without a backing border or rim glow",
  },
  {
    id: "american-bold",
    category: "pop-fun",
    nameZh: "美式粗线条卡通",
    nameEn: "Retro Bold Cartoon",
    taglineZh: "高饱和赛璐璐平涂、夸张张力、潮酷美漫风",
    taglineEn: "Thick black outlines with vibrant cel-shading",
    accentColor: "#FB5607",
    badgeEmoji: "⚡",
    previewImage: "/styles/american-bold.webp",
    promptSnippet:
      "Bold retro American cartoon sticker art, thick dynamic black ink outlines, vibrant flat cel-shading, exaggerated comedic expressions, energetic pop-art color palette",
  },
  {
    id: "flat-vector",
    category: "pop-fun",
    nameZh: "扁平矢量贴纸",
    nameEn: "Flat Vector Sticker",
    taglineZh: "极简利落几何线条、现代品牌级贴纸视觉",
    taglineEn: "Crisp geometric vector illustration with modern flat colors",
    accentColor: "#3A86FF",
    badgeEmoji: "✨",
    previewImage: "/styles/flat-vector.webp",
    promptSnippet:
      "Modern flat vector chat expression illustration, ultra-clean geometric curves, crisp uniform dark stroke weight, harmonious bright flat colors with subtle minimal highlights, clean messaging emote silhouette with no backing border",
  },
  {
    id: "watercolor-cute",
    category: "illustration",
    nameZh: "治愈水彩插画",
    nameEn: "Soft Watercolor",
    taglineZh: "绘本级晕染笔触、温柔细腻、清新氛围感",
    taglineEn: "Delicate storybook watercolor washes and fine ink contours",
    accentColor: "#8ECAE6",
    badgeEmoji: "🎨",
    previewImage: "/styles/watercolor-cute.webp",
    promptSnippet:
      "Dreamy storybook watercolor sticker illustration, soft translucent pigment washes, delicate fine-liner contour, warm pastel tones, gentle cozy atmosphere, clean outer contour",
  },
  {
    id: "pixel-retro",
    category: "pop-fun",
    nameZh: "复古像素风",
    nameEn: "Retro Pixel Art",
    taglineZh: "精致 32-bit 游戏精灵、复古街机可爱感",
    taglineEn: "Crisp 32-bit pixel art sprites with nostalgic game charm",
    accentColor: "#8338EC",
    badgeEmoji: "👾",
    previewImage: "/styles/pixel-retro.webp",
    promptSnippet:
      "Crisp 32-bit retro pixel art emote sprite, sharp pixel grid alignment, clean dark pixel outlines, vibrant indie game color palette, adorable readable expressions",
  },
  {
    id: "doodle-meme",
    category: "pop-fun",
    nameZh: "魔性简笔画",
    nameEn: "Meme Doodle",
    taglineZh: "粗马克笔搞笑涂鸦、灵魂画手、微信斗图神器",
    taglineEn: "Expressive thick-marker comedic doodle for viral chats",
    accentColor: "#2EC4B6",
    badgeEmoji: "🤪",
    previewImage: "/styles/doodle-meme.webp",
    promptSnippet:
      "Hilarious viral chat meme doodle sticker, chunky hand-drawn black marker lines, minimal flat spot color accents, wildly expressive funny cartoon faces, witty internet meme energy",
  },
  {
    id: "plush-felt",
    category: "3d-craft",
    nameZh: "羊毛毡毛绒",
    nameEn: "Cozy Wool Felt",
    taglineZh: "软糯手作羊毛毡质感、蓬松绒毛细节、温暖治愈",
    taglineEn: "Handmade needle-felted wool plush with soft fuzzy fibers",
    accentColor: "#FFD6A5",
    badgeEmoji: "🧶",
    previewImage: "/styles/plush-felt.webp",
    promptSnippet:
      "Cute handmade needle-felted wool plush character, soft fuzzy tactile wool fibers, warm cozy studio lighting contained within the subject, tiny stitched craft details, charming rounded miniature doll proportions, clean silhouette without a backing border",
  },
  {
    id: "crayon-storybook",
    category: "illustration",
    nameZh: "童趣蜡笔涂鸦",
    nameEn: "Crayon Storybook",
    taglineZh: "油画棒与蜡笔颗粒肌理、童真绘本手绘温度",
    taglineEn: "Playful wax crayon and oil-pastel storybook texture",
    accentColor: "#CAFFBF",
    badgeEmoji: "🖍️",
    previewImage: "/styles/crayon-storybook.webp",
    promptSnippet:
      "Charming children's picture-book illustration drawn with soft wax crayons and oil pastels, rich grainy pastel stroke texture, warm whimsical hand-sketched outlines, cheerful cozy palette, clean outer silhouette",
  },
  {
    id: "anime-cel",
    category: "illustration",
    nameZh: "日系动漫赛璐璐",
    nameEn: "Anime Cel-Shaded",
    taglineZh: "精致二次元番剧画风、通透明亮高光、灵动大眼",
    taglineEn: "Crisp modern Japanese anime cel-shading and glossy eyes",
    accentColor: "#BDB2FF",
    badgeEmoji: "💫",
    previewImage: "/styles/anime-cel.webp",
    promptSnippet:
      "Crisp modern Japanese anime cel-shaded character emote illustration, refined clean dark lineart, bright luminous anime eyes, sharp two-tone cel shadows and glossy hair highlights, expressive dynamic anime emotion, clean silhouette without a backing border",
  },
  {
    id: "guochao-ink",
    category: "illustration",
    nameZh: "国潮水墨萌趣",
    nameEn: "Guochao Ink Cute",
    taglineZh: "东方毛笔墨韵碰撞 Q 萌造型、朱砂黛绿国风配色",
    taglineEn: "Playful modern Chinese brush-ink art with vermilion accents",
    accentColor: "#FFADAD",
    badgeEmoji: "🏮",
    previewImage: "/styles/guochao-ink.webp",
    promptSnippet:
      "Playful modern Chinese Guochao cute ink-wash character illustration, expressive calligraphic brush outlines with subtle dry-brush texture, harmonious vermilion red, warm gold, and soft celadon mineral wash accents, adorable modern chibi charm, clean silhouette",
  },
  {
    id: "y2k-glossy",
    category: "3d-craft",
    nameZh: "Y2K 糖果果冻",
    nameEn: "Y2K Glossy Jelly",
    taglineZh: "晶莹果冻光泽、千禧糖果渐变、元气闪耀质感",
    taglineEn: "Glossy translucent candy-pop jelly with Y2K highlights",
    accentColor: "#9BF6FF",
    badgeEmoji: "🍬",
    previewImage: "/styles/y2k-glossy.webp",
    promptSnippet:
      "Playful Y2K glossy candy-jelly 3D-inspired illustration, plump translucent gummy shine, crisp bright specular highlights, vibrant pastel-neon candy gradients, energetic cute pop aesthetic, clean silhouette without a backing border or rim glow",
  },
];

export function getStylePresetById(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((style) => style.id === id);
}
