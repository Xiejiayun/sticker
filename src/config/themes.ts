import type { CaptionMode, GridSize, StickerSlotSnapshot } from "@/db/schema";

export interface ThemeSlotPreset {
  pose: string;
  poseZh: string;
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
      { pose: "cheerfully waving hello with a sunny smile", poseZh: "元气满满挥手打招呼", captionZh: "早安", captionEn: "GM!" },
      { pose: "giving an enthusiastic OK hand sign and wink", poseZh: "俏皮眨眼比 OK 手势", captionZh: "OK", captionEn: "OK!" },
      { pose: "clasping hands together gratefully with sparkles", poseZh: "双手合十星光感谢", captionZh: "谢谢", captionEn: "Thanks!" },
      { pose: "laughing out loud with tears of joy", poseZh: "捧腹笑出眼泪", captionZh: "哈哈哈", captionEn: "LOL" },
      { pose: "making a cute finger heart with blushing cheeks", poseZh: "脸红比出手指爱心", captionZh: "比心", captionEn: "Love u" },
      { pose: "tilting head with a big question mark, curious look", poseZh: "歪头冒出大问号", captionZh: "嗯？", captionEn: "Huh?" },
      { pose: "giving a confident thumbs up with stars", poseZh: "自信竖起大拇指", captionZh: "收到", captionEn: "Got it" },
      { pose: "sleepy yawning with a tiny moon and Zzz", poseZh: "打哈欠配小月亮 Zzz", captionZh: "晚安", captionEn: "Night" },
      { pose: "waving goodbye happily", poseZh: "开开心心挥手道别", captionZh: "拜拜", captionEn: "Bye!" },
      { pose: "clapping hands excitedly celebrating", poseZh: "兴奋鼓掌庆祝", captionZh: "太棒了", captionEn: "Yay!" },
      { pose: "peeking shyly from behind hands", poseZh: "捂脸害羞偷看", captionZh: "害羞", captionEn: "Shy" },
      { pose: "shocked jaw-drop with sweat drop", poseZh: "吓到目瞪口呆流冷汗", captionZh: "震惊", captionEn: "OMG!" },
      { pose: "sweating nervously with awkward smile", poseZh: "尴尬流汗假笑", captionZh: "汗", captionEn: "Oops" },
      { pose: "holding a cup of milk tea happily", poseZh: "抱着奶茶满足开心", captionZh: "喝奶茶", captionEn: "Boba time" },
      { pose: "pumping fist cheering enthusiastically", poseZh: "握拳打气加油冲刺", captionZh: "冲呀", captionEn: "Let's go!" },
      { pose: "nodding seriously in agreement", poseZh: "认真点头表示赞同", captionZh: "赞同", captionEn: "Agreed" },
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
      { pose: "saluting politely with a professional smile", poseZh: "职业微笑敬礼收到", captionZh: "收到", captionEn: "Noted" },
      { pose: "sneakily relaxing behind a laptop sipping coffee", poseZh: "躲电脑后偷喝咖啡摸鱼", captionZh: "摸鱼中", captionEn: "Slacking" },
      { pose: "typing frantically with dark circles under eyes", poseZh: "黑眼圈狂敲键盘加班", captionZh: "加班中", captionEn: "Overtime" },
      { pose: "running joyfully with bag flying in the air", poseZh: "拎包飞奔欢呼下班", captionZh: "下班啦", captionEn: "Clocking out" },
      { pose: "melting into a puddle on the desk exhausted", poseZh: "累成一滩融化在桌上", captionZh: "太难了", captionEn: "So tired" },
      { pose: "sipping iced Americano to stay awake", poseZh: "狂炫冰美式续命", captionZh: "续命", captionEn: "Need coffee" },
      { pose: "cheering with sparkles holding a golden coin", poseZh: "捧着大金币闪亮欢呼", captionZh: "发工资", captionEn: "Payday!" },
      { pose: "holding head in dramatic panic", poseZh: "抱头崩溃尖叫", captionZh: "崩溃", captionEn: "SOS" },
      { pose: "pumping both fists determinedly", poseZh: "双手握拳元气加油", captionZh: "加油", captionEn: "You got this" },
      { pose: "staring blankly at a glowing screen", poseZh: "面无表情盯屏幕", captionZh: "已读", captionEn: "Seen" },
      { pose: "bowing politely apologizing", poseZh: "礼貌鞠躬感谢配合", captionZh: "辛苦了", captionEn: "Thank u" },
      { pose: "holding a meeting notebook nodding", poseZh: "捧笔记本当场点头开会", captionZh: "开会中", captionEn: "In a call" },
      { pose: "giving a double thumbs up approvingly", poseZh: "双手点赞狂夸大气", captionZh: "老板大气", captionEn: "Awesome" },
      { pose: "looking at a watch impatiently", poseZh: "焦急看表疯狂催促", captionZh: "快了快了", captionEn: "Almost" },
      { pose: "celebrating Friday with confetti", poseZh: "撒礼花庆祝周五", captionZh: "周五快乐", captionEn: "TGIF!" },
      { pose: "carrying a tiny white flag surrendering", poseZh: "举起小白旗求放过", captionZh: "饶了我", captionEn: "Mercy" },
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
      { pose: "opening arms wide asking for a warm hug", poseZh: "张开双臂求温暖抱抱", captionZh: "抱抱", captionEn: "Hug me" },
      { pose: "holding chin dreamily with floating pink hearts", poseZh: "托腮冒粉红泡泡想你", captionZh: "想你了", captionEn: "Miss u" },
      { pose: "snuggling cheek happily with sparkles", poseZh: "软萌贴脸撒娇", captionZh: "贴贴", captionEn: "Cuddle" },
      { pose: "pouting cheeks turning away playfully grumpy", poseZh: "鼓起腮帮傲娇转头", captionZh: "哼！", captionEn: "Hmph!" },
      { pose: "blowing a sweet kiss with a flying heart", poseZh: "嘟嘴飞吻发射爱心", captionZh: "亲亲", captionEn: "Mwah!" },
      { pose: "teary puppy eyes looking super cute and pitiful", poseZh: "泪眼汪汪委屈求哄", captionZh: "委屈", captionEn: "Pls..." },
      { pose: "sitting obediently with hands on lap smiling", poseZh: "手放膝盖乖巧坐好", captionZh: "乖巧", captionEn: "Good kid" },
      { pose: "hugging a giant red heart joyfully", poseZh: "抱着超大红心满脸甜笑", captionZh: "爱你", captionEn: "Love you" },
      { pose: "tucked in a cozy blanket waving goodnight", poseZh: "裹着小被子挥手晚安", captionZh: "晚安吻", captionEn: "Sweet dreams" },
      { pose: "blushing bright red covering face", poseZh: "脸红透捂住脸蛋", captionZh: "害羞啦", captionEn: "Blush" },
      { pose: "patting head gently comforting", poseZh: "温柔伸手摸摸头安慰", captionZh: "摸摸头", captionEn: "Pat pat" },
      { pose: "excitedly jumping with heart eyes", poseZh: "星星爱心眼开心蹦起", captionZh: "超喜欢", captionEn: "Adore!" },
      { pose: "holding a tiny bouquet of roses", poseZh: "双手捧玫瑰花束递上", captionZh: "送花花", captionEn: "For you" },
      { pose: "poking cheek playfully teasing", poseZh: "调皮伸手戳戳脸颊", captionZh: "戳戳", captionEn: "Poke" },
      { pose: "holding a little fork waiting for dinner", poseZh: "拿小叉子等开饭", captionZh: "吃啥呀", captionEn: "Dinner?" },
      { pose: "making a pinky promise gesture", poseZh: "伸出小拇指拉钩约定", captionZh: "拉钩", captionEn: "Promise" },
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
      { pose: "holding a food bowl excitedly with starry eyes", poseZh: "眼睛发光端碗等干饭", captionZh: "干饭啦", captionEn: "Food!" },
      { pose: "peeking stealthily from behind a wall", poseZh: "躲在墙角探头暗中观察", captionZh: "暗中观察", captionEn: "Watching" },
      { pose: "rolling over playfully asking for belly rubs", poseZh: "翻身露肚皮求摸摸", captionZh: "求摸摸", captionEn: "Pet me" },
      { pose: "curled up sleeping peacefully with bubble", poseZh: "蜷成一团吹鼻涕泡睡觉", captionZh: "困了", captionEn: "Sleepy" },
      { pose: "eyes wide open in dramatic shock, fur puffed up", poseZh: "炸毛瞪大眼满脸震惊", captionZh: "震惊", captionEn: "What?!" },
      { pose: "blank deadpan stare looking unimpressed", poseZh: "生无可恋死鱼眼无语", captionZh: "无语", captionEn: "Bruh" },
      { pose: "spinning happily with little paw prints around", poseZh: "围着小爪印开心转圈", captionZh: "开心", captionEn: "Happy!" },
      { pose: "big watery eyes looking innocent and pitiful", poseZh: "大水汪汪眼委屈装无辜", captionZh: "委屈巴巴", captionEn: "Sadge" },
      { pose: "wearing tiny cool sunglasses looking smug", poseZh: "戴酷炫小墨镜一脸得意", captionZh: "得意", captionEn: "Cool" },
      { pose: "chasing a tiny sparkling butterfly", poseZh: "扑腾爪子追小蝴蝶", captionZh: "玩耍", captionEn: "Play!" },
      { pose: "hiding ears shyly looking guilty", poseZh: "心虚捂住耳朵装傻", captionZh: "不是我", captionEn: "Wasn't me" },
      { pose: "giving a cute high-five with paw", poseZh: "伸出毛茸茸小爪击掌", captionZh: "击掌", captionEn: "High 5" },
      { pose: "yawning super wide stretching paws", poseZh: "张大嘴伸长爪子伸懒腰", captionZh: "伸懒腰", captionEn: "Stretch" },
      { pose: "sniffing curiously with nose twitching", poseZh: "凑近好奇嗅一嗅", captionZh: "闻闻", captionEn: "Sniff" },
      { pose: "proudly sitting like a loaf", poseZh: "揣手手乖巧面包蹲", captionZh: "乖乖坐好", captionEn: "Loaf" },
      { pose: "hugging a favorite plush toy", poseZh: "抱着最爱的毛绒玩具贴贴", captionZh: "贴贴", captionEn: "Cozy" },
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
      { pose: "holding festive red lanterns smiling brightly", poseZh: "手提喜庆红灯笼笑盈盈", captionZh: "新年快乐", captionEn: "Happy NY!" },
      { pose: "holding shiny gold ingots with joyful grin", poseZh: "捧着闪亮金元宝咧嘴笑", captionZh: "恭喜发财", captionEn: "Get Rich!" },
      { pose: "wearing a party hat holding a birthday cake", poseZh: "戴派对帽捧生日蛋糕", captionZh: "生日快乐", captionEn: "HBD!" },
      { pose: "surrounded by four-leaf clovers and stars", poseZh: "四叶草和星星环绕好运", captionZh: "好运连连", captionEn: "Good Luck" },
      { pose: "clinking festive drinks cheering happily", poseZh: "举杯欢呼快乐干杯", captionZh: "干杯", captionEn: "Cheers!" },
      { pose: "offering a bright festive bouquet of flowers", poseZh: "双手递上鲜艳花束", captionZh: "送花", captionEn: "Flowers" },
      { pose: "watching colorful fireworks in awe", poseZh: "仰望绚烂烟花满眼惊叹", captionZh: "放烟花", captionEn: "Woohoo!" },
      { pose: "holding a cute red envelope smiling", poseZh: "手捧大红包开心收下", captionZh: "谢谢老板", captionEn: "Lucky!" },
      { pose: "giving a traditional clasped-hand blessing", poseZh: "抱拳作揖送吉祥祝福", captionZh: "大吉大利", captionEn: "Best Wishes" },
      { pose: "popping a party confetti cannon", poseZh: "拉响礼花筒满屏彩带", captionZh: "庆祝", captionEn: "Party!" },
      { pose: "holding a glowing star wishing", poseZh: "捧起许愿星真诚许愿", captionZh: "心想事成", captionEn: "Make a wish" },
      { pose: "dancing joyfully with musical notes", poseZh: "伴着音符欢乐起舞", captionZh: "嗨起来", captionEn: "Dance!" },
      { pose: "hugging a wrapped gift box", poseZh: "怀抱精美蝴蝶结礼物盒", captionZh: "礼物", captionEn: "Gift!" },
      { pose: "smiling warmly holding a teacup", poseZh: "手捧热茶温暖祝福", captionZh: "平安喜乐", captionEn: "Peace" },
      { pose: "showing off a golden trophy", poseZh: "高举金色冠军奖杯夸赞", captionZh: "你最棒", captionEn: "Number 1" },
      { pose: "waving a festive banner happily", poseZh: "挥舞喜庆彩旗欢庆", captionZh: "节日快乐", captionEn: "Celebrate!" },
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
    poseZh: slot.poseZh,
    caption:
      captionMode === "none"
        ? ""
        : captionMode === "zh"
          ? slot.captionZh
          : slot.captionEn,
  }));
}
