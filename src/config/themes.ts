import type { CaptionMode, GridSize, StickerSlotSnapshot } from "@/db/schema";

export interface ThemeSlotPreset {
  pose: string;
  captionZh: string;
  captionEn: string;
}

export interface ThemePack {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  emoji: string;
  slots: ThemeSlotPreset[]; // 16 slots; 3x3 uses first 9, 4x4 uses all 16
}

export const THEME_PACKS: ThemePack[] = [
  {
    id: "daily-essentials",
    nameZh: "日常通用",
    nameEn: "Daily Essentials",
    descriptionZh: "覆盖早安、OK、谢谢、比心、大笑等高频聊天场景",
    descriptionEn: "Everyday reactions: GM, OK, Thanks, Love, LOL & more",
    emoji: "☀️",
    slots: [
      { pose: "cheerfully waving hello with a sunny smile", captionZh: "早安", captionEn: "GM!" },
      { pose: "giving an enthusiastic OK hand sign and wink", captionZh: "OK", captionEn: "OK!" },
      { pose: "clasping hands together gratefully with sparkles", captionZh: "谢谢", captionEn: "Thanks!" },
      { pose: "laughing out loud with tears of joy", captionZh: "哈哈哈", captionEn: "LOL" },
      { pose: "making a cute finger heart with blushing cheeks", captionZh: "比心", captionEn: "Love u" },
      { pose: "tilting head with a big question mark, curious look", captionZh: "嗯？", captionEn: "Huh?" },
      { pose: "giving a confident thumbs up with stars", captionZh: "收到", captionEn: "Got it" },
      { pose: "sleepy yawning with a tiny moon and Zzz", captionZh: "晚安", captionEn: "Night" },
      { pose: "waving goodbye happily", captionZh: "拜拜", captionEn: "Bye!" },
      { pose: "clapping hands excitedly celebrating", captionZh: "太棒了", captionEn: "Yay!" },
      { pose: "peeking shyly from behind hands", captionZh: "害羞", captionEn: "Shy" },
      { pose: "shocked jaw-drop with sweat drop", captionZh: "震惊", captionEn: "OMG!" },
      { pose: "sweating nervously with awkward smile", captionZh: "汗", captionEn: "Oops" },
      { pose: "holding a cup of milk tea happily", captionZh: "喝奶茶", captionEn: "Boba time" },
      { pose: "pumping fist cheering enthusiastically", captionZh: "冲呀", captionEn: "Let's go!" },
      { pose: "nodding seriously in agreement", captionZh: "赞同", captionEn: "Agreed" },
    ],
  },
  {
    id: "office-worker",
    nameZh: "打工人职场",
    nameEn: "Office Worker",
    descriptionZh: "收到、摸鱼、加班、下班啦，职场沟通必备",
    descriptionEn: "Workday moods: Noted, Coffee break, Overtime, Clocking out",
    emoji: "💼",
    slots: [
      { pose: "saluting politely with a professional smile", captionZh: "收到", captionEn: "Noted" },
      { pose: "sneakily relaxing behind a laptop sipping coffee", captionZh: "摸鱼中", captionEn: "Slacking" },
      { pose: "typing frantically with dark circles under eyes", captionZh: "加班中", captionEn: "Overtime" },
      { pose: "running joyfully with bag flying in the air", captionZh: "下班啦", captionEn: "Clocking out" },
      { pose: "melting into a puddle on the desk exhausted", captionZh: "太难了", captionEn: "So tired" },
      { pose: "sipping iced Americano to stay awake", captionZh: "续命", captionEn: "Need coffee" },
      { pose: "cheering with sparkles holding a golden coin", captionZh: "发工资", captionEn: "Payday!" },
      { pose: "holding head in dramatic panic", captionZh: "崩溃", captionEn: "SOS" },
      { pose: "pumping both fists determinedly", captionZh: "加油", captionEn: "You got this" },
      { pose: "staring blankly at a glowing screen", captionZh: "已读", captionEn: "Seen" },
      { pose: "bowing politely apologizing", captionZh: "辛苦了", captionEn: "Thank u" },
      { pose: "holding a meeting notebook nodding", captionZh: "开会中", captionEn: "In a call" },
      { pose: "giving a double thumbs up approvingly", captionZh: "老板大气", captionEn: "Awesome" },
      { pose: "looking at a watch impatiently", captionZh: "快了快了", captionEn: "Almost" },
      { pose: "celebrating Friday with confetti", captionZh: "周五快乐", captionEn: "TGIF!" },
      { pose: "carrying a tiny white flag surrendering", captionZh: "饶了我", captionEn: "Mercy" },
    ],
  },
  {
    id: "couple-love",
    nameZh: "情侣撒娇",
    nameEn: "Couple & Love",
    descriptionZh: "抱抱、贴贴、想你了、哼生气，甜甜的恋爱互动",
    descriptionEn: "Sweet romantic reactions: Hugs, Miss you, Pout, Kiss",
    emoji: "💕",
    slots: [
      { pose: "opening arms wide asking for a warm hug", captionZh: "抱抱", captionEn: "Hug me" },
      { pose: "holding chin dreamily with floating pink hearts", captionZh: "想你了", captionEn: "Miss u" },
      { pose: "snuggling cheek happily with sparkles", captionZh: "贴贴", captionEn: "Cuddle" },
      { pose: "pouting cheeks turning away playfully grumpy", captionZh: "哼！", captionEn: "Hmph!" },
      { pose: "blowing a sweet kiss with a flying heart", captionZh: "亲亲", captionEn: "Mwah!" },
      { pose: "teary puppy eyes looking super cute and pitiful", captionZh: "委屈", captionEn: "Pls..." },
      { pose: "sitting obediently with hands on lap smiling", captionZh: "乖巧", captionEn: "Good kid" },
      { pose: "hugging a giant red heart joyfully", captionZh: "爱你", captionEn: "Love you" },
      { pose: "tucked in a cozy blanket waving goodnight", captionZh: "晚安吻", captionEn: "Sweet dreams" },
      { pose: "blushing bright red covering face", captionZh: "害羞啦", captionEn: "Blush" },
      { pose: "patting head gently comforting", captionZh: "摸摸头", captionEn: "Pat pat" },
      { pose: "excitedly jumping with heart eyes", captionZh: "超喜欢", captionEn: "Adore!" },
      { pose: "holding a tiny bouquet of roses", captionZh: "送花花", captionEn: "For you" },
      { pose: "poking cheek playfully teasing", captionZh: "戳戳", captionEn: "Poke" },
      { pose: "holding a little fork waiting for dinner", captionZh: "吃啥呀", captionEn: "Dinner?" },
      { pose: "making a pinky promise gesture", captionZh: "拉钩", captionEn: "Promise" },
    ],
  },
  {
    id: "cute-pet",
    nameZh: "萌宠日常",
    nameEn: "Cute Pet",
    descriptionZh: "干饭、暗中观察、求摸摸、委屈巴巴，毛孩子专属",
    descriptionEn: "Playful pet moods: Feeding time, Peeking, Belly rubs, Sleepy",
    emoji: "🐾",
    slots: [
      { pose: "holding a food bowl excitedly with starry eyes", captionZh: "干饭啦", captionEn: "Food!" },
      { pose: "peeking stealthily from behind a wall", captionZh: "暗中观察", captionEn: "Watching" },
      { pose: "rolling over playfully asking for belly rubs", captionZh: "求摸摸", captionEn: "Pet me" },
      { pose: "curled up sleeping peacefully with bubble", captionZh: "困了", captionEn: "Sleepy" },
      { pose: "eyes wide open in dramatic shock, fur puffed up", captionZh: "震惊", captionEn: "What?!" },
      { pose: "blank deadpan stare looking unimpressed", captionZh: "无语", captionEn: "Bruh" },
      { pose: "spinning happily with little paw prints around", captionZh: "开心", captionEn: "Happy!" },
      { pose: "big watery eyes looking innocent and pitiful", captionZh: "委屈巴巴", captionEn: "Sadge" },
      { pose: "wearing tiny cool sunglasses looking smug", captionZh: "得意", captionEn: "Cool" },
      { pose: "chasing a tiny sparkling butterfly", captionZh: "玩耍", captionEn: "Play!" },
      { pose: "hiding ears shyly looking guilty", captionZh: "不是我", captionEn: "Wasn't me" },
      { pose: "giving a cute high-five with paw", captionZh: "击掌", captionEn: "High 5" },
      { pose: "yawning super wide stretching paws", captionZh: "伸懒腰", captionEn: "Stretch" },
      { pose: "sniffing curiously with nose twitching", captionZh: "闻闻", captionEn: "Sniff" },
      { pose: "proudly sitting like a loaf", captionZh: "乖乖坐好", captionEn: "Loaf" },
      { pose: "hugging a favorite plush toy", captionZh: "贴贴", captionEn: "Cozy" },
    ],
  },
  {
    id: "festive-celebration",
    nameZh: "节日祝福",
    nameEn: "Festive & Celebration",
    descriptionZh: "新年快乐、恭喜发财、生日快乐、好运连连",
    descriptionEn: "Celebration stickers: Happy New Year, Birthday, Good Luck, Cheers",
    emoji: "🎉",
    slots: [
      { pose: "holding festive red lanterns smiling brightly", captionZh: "新年快乐", captionEn: "Happy NY!" },
      { pose: "holding shiny gold ingots with joyful grin", captionZh: "恭喜发财", captionEn: "Get Rich!" },
      { pose: "wearing a party hat holding a birthday cake", captionZh: "生日快乐", captionEn: "HBD!" },
      { pose: "surrounded by four-leaf clovers and stars", captionZh: "好运连连", captionEn: "Good Luck" },
      { pose: "clinking festive drinks cheering happily", captionZh: "干杯", captionEn: "Cheers!" },
      { pose: "offering a bright festive bouquet of flowers", captionZh: "送花", captionEn: "Flowers" },
      { pose: "watching colorful fireworks in awe", captionZh: "放烟花", captionEn: "Woohoo!" },
      { pose: "holding a cute red envelope smiling", captionZh: "谢谢老板", captionEn: "Lucky!" },
      { pose: "giving a traditional clasped-hand blessing", captionZh: "大吉大利", captionEn: "Best Wishes" },
      { pose: "popping a party confetti cannon", captionZh: "庆祝", captionEn: "Party!" },
      { pose: "holding a glowing star wishing", captionZh: "心想事成", captionEn: "Make a wish" },
      { pose: "dancing joyfully with musical notes", captionZh: "嗨起来", captionEn: "Dance!" },
      { pose: "hugging a wrapped gift box", captionZh: "礼物", captionEn: "Gift!" },
      { pose: "smiling warmly holding a teacup", captionZh: "平安喜乐", captionEn: "Peace" },
      { pose: "showing off a golden trophy", captionZh: "你最棒", captionEn: "Number 1" },
      { pose: "waving a festive banner happily", captionZh: "节日快乐", captionEn: "Celebrate!" },
    ],
  },
];

export function getThemePackById(id: string): ThemePack | undefined {
  return THEME_PACKS.find((t) => t.id === id);
}

export function buildDefaultSlots(
  themeId: string,
  gridSize: GridSize,
  captionMode: CaptionMode
): StickerSlotSnapshot[] {
  const theme = getThemePackById(themeId) ?? THEME_PACKS[0];
  const count = gridSize === "4x4" ? 16 : 9;
  return theme.slots.slice(0, count).map((slot, index) => ({
    index,
    pose: slot.pose,
    caption:
      captionMode === "none"
        ? ""
        : captionMode === "zh"
          ? slot.captionZh
          : slot.captionEn,
  }));
}
