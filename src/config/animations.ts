import type { CaptionMode, GridSize, StickerSlotSnapshot } from "@/db/schema";

export const ANIM_SPRITE_SINGLE_THEME_ID = "anim-sprite-9";
export const ANIM_SPRITE_QUAD_THEME_ID = "anim-sprite-quad";

export type AnimatedSpriteThemeId =
  | typeof ANIM_SPRITE_SINGLE_THEME_ID
  | typeof ANIM_SPRITE_QUAD_THEME_ID;

export type AnimationLoopMode = "loop" | "pingpong";
export type SpriteAlignMode = "ncc" | "bottom-center" | "centroid" | "none";
export type AnimationActionCategory = "daily" | "funny" | "love" | "work-life";

export interface AnimationFrameBeat {
  pose: string;
  poseZh: string;
}

export interface AnimatedActionPreset {
  id: string;
  emoji: string;
  category: AnimationActionCategory;
  nameZh: string;
  nameEn: string;
  captionZh: string;
  captionEn: string;
  defaultFps: number;
  defaultLoopMode: AnimationLoopMode;
  recommendedAlign: SpriteAlignMode;
  frames4: [AnimationFrameBeat, AnimationFrameBeat, AnimationFrameBeat, AnimationFrameBeat];
  frames9: [
    AnimationFrameBeat,
    AnimationFrameBeat,
    AnimationFrameBeat,
    AnimationFrameBeat,
    AnimationFrameBeat,
    AnimationFrameBeat,
    AnimationFrameBeat,
    AnimationFrameBeat,
    AnimationFrameBeat,
  ];
}

export const ANIMATION_CATEGORIES: Array<{
  id: AnimationActionCategory;
  nameZh: string;
  nameEn: string;
}> = [
  { id: "daily", nameZh: "高频日常", nameEn: "Daily Chat" },
  { id: "funny", nameZh: "搞笑魔性", nameEn: "Funny & Meme" },
  { id: "love", nameZh: "贴贴撒娇", nameEn: "Cute & Love" },
  { id: "work-life", nameZh: "职场干饭", nameEn: "Work & Food" },
];

export const ANIMATED_ACTION_PRESETS: AnimatedActionPreset[] = [
  {
    id: "wave-hi",
    emoji: "👋",
    category: "daily",
    nameZh: "元气挥手早安",
    nameEn: "Cheerful Wave",
    captionZh: "早安",
    captionEn: "Hi!",
    defaultFps: 8,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "facing front smiling brightly, right hand raised slightly to the left side ready to wave", poseZh: "微笑抬手准备挥手" },
      { pose: "body slightly leaning right, right hand waving outward to the right with happy sparkling eyes", poseZh: "身体微倾右手向右挥出" },
      { pose: "right hand swinging back inward toward cheek with wide joyful grin and tiny bounce", poseZh: "右手回摆开心大笑微弹" },
      { pose: "right hand waving outward again with cheerful wink, settling smoothly toward frame 1", poseZh: "眨眼再挥手平滑衔接首帧" },
    ],
    frames9: [
      { pose: "facing front with bright smile, right arm lifting up beside shoulder", poseZh: "正面微笑抬起右手" },
      { pose: "right hand raised high tilted inward, eyes curving happily", poseZh: "右手举高内倾眉眼弯弯" },
      { pose: "right hand swinging briskly outward to the right with small motion arcs", poseZh: "右手欢快向右挥出带动态弧线" },
      { pose: "peak outward wave, slight cheerful hop upward with beaming grin", poseZh: "挥手最高点轻轻跃起灿烂笑" },
      { pose: "right hand swinging back inward across cheek, soft landing squash", poseZh: "右手回摆轻落弹性微压" },
      { pose: "right hand swinging outward a second time with playful wink", poseZh: "俏皮眨眼再次向右挥手" },
      { pose: "holding happy wave with tiny floating sparkles beside hand", poseZh: "举手微笑身旁冒出小星光" },
      { pose: "right hand swinging gently back inward, relaxed warm grin", poseZh: "右手轻柔回摆保持暖笑" },
      { pose: "right arm easing smoothly back toward starting raised position to loop seamlessly", poseZh: "顺滑回到起势位置准备循环" },
    ],
  },
  {
    id: "lol-laugh",
    emoji: "🤣",
    category: "funny",
    nameZh: "拍桌狂笑",
    nameEn: "Burst Laughing",
    captionZh: "哈哈哈",
    captionEn: "LOL",
    defaultFps: 10,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "eyes squeezed shut giggling, shoulders hunched up, hands lifted slightly", poseZh: "眯眼憋笑耸肩抬手" },
      { pose: "head thrown slightly back laughing wide open mouth, slapping thighs with joy tears", poseZh: "仰头大笑拍腿笑出眼泪" },
      { pose: "leaning forward laughing hard, body shaking slightly, sparkling tear drops flying out", poseZh: "前倾狂笑泪花飞溅" },
      { pose: "bouncing back upright still grinning wide with eyes shut, ready to laugh again", poseZh: "弹回正位笑得停不下来" },
    ],
    frames9: [
      { pose: "starting to chuckle with puffed cheeks and eyes narrowing playfully", poseZh: "鼓脸眯眼开始偷笑" },
      { pose: "bursting into laughter, mouth opening wide, shoulders rising", poseZh: "绷不住张嘴大笑耸肩" },
      { pose: "head tilting back laughing heartily, hands raised up", poseZh: "仰头开怀大笑双手扬起" },
      { pose: "slapping down excitedly with squeezed-shut eyes and first joy tears appearing", poseZh: "激动拍打笑出第一滴泪" },
      { pose: "peak uncontrollable laughter, leaning slightly forward, two cartoon tears flying out", poseZh: "狂笑高潮前倾泪花飞溅" },
      { pose: "rebounding upward shaking with laughter, cheeks rosy", poseZh: "笑到颤抖回弹脸颊泛红" },
      { pose: "second slap downward laughing hard, open joyful mouth", poseZh: "再来一下拍打笑得前仰后合" },
      { pose: "leaning back catching breath with huge beaming grin and tiny tear", poseZh: "喘口气依旧咧嘴大笑" },
      { pose: "settling back into giggly crouched posture ready to loop smoothly into frame 1", poseZh: "收势回到偷笑姿态无缝循环" },
    ],
  },
  {
    id: "finger-heart",
    emoji: "🫶",
    category: "love",
    nameZh: "比心发射爱心",
    nameEn: "Sending Hearts",
    captionZh: "比心",
    captionEn: "Love u",
    defaultFps: 8,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "hands cupped near chest blushing shyly with warm smile", poseZh: "双手捧胸前害羞脸红" },
      { pose: "raising hands to form a cute finger heart, one small pink heart popping out", poseZh: "抬手比心冒出一颗小粉心" },
      { pose: "beaming with winking eye as two glowing pink hearts float upward", poseZh: "眨眼甜笑两颗爱心飘起" },
      { pose: "hearts drifting higher and fading gently, hands lowering softly toward chest", poseZh: "爱心升空散开双手轻回" },
    ],
    frames9: [
      { pose: "standing front with sweet smile, hands tucked close to chest", poseZh: "正面甜笑双手放胸前" },
      { pose: "blushing cheeks deepening, raising right hand forward", poseZh: "脸颊泛红抬起右手" },
      { pose: "forming a crisp finger heart gesture, tiny pink spark appearing at fingertips", poseZh: "比出手指爱心指尖闪光" },
      { pose: "small bright pink heart popping out from fingertips with playful wink", poseZh: "俏皮眨眼指尖弹出小爱心" },
      { pose: "pink heart expanding slightly and floating upward, second mini heart appearing", poseZh: "爱心变大上飘冒出第二颗" },
      { pose: "both cheeks glowing happily as hearts rise higher with tiny sparkles", poseZh: "开心眯眼爱心伴星光上升" },
      { pose: "gentle cheerful sway while floating hearts drift upward", poseZh: "身体轻晃目送爱心飘高" },
      { pose: "hearts fading out softly at upper margin, sweet satisfied smile", poseZh: "爱心轻散露出满足甜笑" },
      { pose: "hand easing gently back toward chest matching frame 1 posture", poseZh: "手势柔缓收回衔接首帧" },
    ],
  },
  {
    id: "nod-ok",
    emoji: "👌",
    category: "daily",
    nameZh: "连连点头收到",
    nameEn: "Enthusiastic Nod",
    captionZh: "收到",
    captionEn: "Got it!",
    defaultFps: 8,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "upright attentive posture giving a crisp OK hand sign with bright eyes", poseZh: "精神饱满比出 OK 手势" },
      { pose: "head nodding firmly downward with confident happy closed-eye smile", poseZh: "用力点头自信微笑" },
      { pose: "head bouncing back up slightly with sparkle near OK hand", poseZh: "抬头回弹手旁冒出星光" },
      { pose: "gentle second nod settling smoothly back to attentive upright pose", poseZh: "轻点第二下回到首帧" },
    ],
    frames9: [
      { pose: "upright alert pose, raising right hand into OK gesture", poseZh: "精神抬头抬手比 OK" },
      { pose: "head lifting slightly in anticipation, bright determined eyes", poseZh: "微微仰头准备确认" },
      { pose: "head nodding briskly downward, soft squash in posture", poseZh: "干脆利落用力点头" },
      { pose: "bottom of nod with happy curved eyes and bright sparkle beside OK hand", poseZh: "点头最低点眯眼笑带星光" },
      { pose: "rebounding upright cheerfully with proud grin", poseZh: "元气弹起露出自信笑容" },
      { pose: "second crisp nod downward confirming enthusiastically", poseZh: "再次用力点头表示没问题" },
      { pose: "bouncing back up with small shining stars around head", poseZh: "抬头回弹头顶闪小星星" },
      { pose: "holding steady OK sign with warm reassuring smile", poseZh: "稳稳比 OK 暖心微笑" },
      { pose: "easing smoothly back into starting upright OK posture", poseZh: "平滑回到起势无缝循环" },
    ],
  },
  {
    id: "typing-work",
    emoji: "💻",
    category: "work-life",
    nameZh: "疯狂敲键盘搬砖",
    nameEn: "Furious Typing",
    captionZh: "搬砖中",
    captionEn: "Working!",
    defaultFps: 11,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "leaning over a compact laptop, left paw/hand raised high, right hand pressing keyboard, intense focused eyes", poseZh: "左手高抬右手狂敲键盘眼神专注" },
      { pose: "left hand striking keyboard while right hand lifts up fast, tiny motion lines", poseZh: "左手砸下右手抬起带速度线" },
      { pose: "both hands blurring rapidly over keys, determined clenched mouth, tiny sweat drop", poseZh: "双手飞速连击冒出一滴汗" },
      { pose: "right hand striking down as left lifts again, screen glowing softly on face", poseZh: "右手回敲左手抬起无缝衔接" },
    ],
    frames9: [
      { pose: "sitting behind a cute compact laptop, hands poised above keyboard", poseZh: "端坐电脑前双手蓄势待发" },
      { pose: "left hand slamming down on keyboard, right hand raised", poseZh: "左手猛敲键盘右手高抬" },
      { pose: "right hand slamming down, left hand bouncing up, focused narrow eyes", poseZh: "右手猛敲左手弹起眼神犀利" },
      { pose: "rapid alternating typing, small speed lines above wrists", poseZh: "双手交替狂敲手腕冒速度线" },
      { pose: "leaning closer to glowing screen typing at peak speed, tiny sweat drop", poseZh: "凑近屏幕极限手速冒汗" },
      { pose: "intense typing burst with tiny comic spark popping from keyboard", poseZh: "敲出火花火力全开" },
      { pose: "shoulders bouncing rhythmically as hands drum rapidly on keys", poseZh: "肩膀跟着节奏狂敲键盘" },
      { pose: "determined glance forward while fingers still tapping fast", poseZh: "坚定盯屏手指不停连击" },
      { pose: "hands returning cleanly to raised alternating typing stance for seamless loop", poseZh: "双手回到起敲节奏无缝循环" },
    ],
  },
  {
    id: "eat-yummy",
    emoji: "🍜",
    category: "work-life",
    nameZh: "大口干饭咀嚼",
    nameEn: "Happy Munching",
    captionZh: "干饭啦",
    captionEn: "Yummy!",
    defaultFps: 8,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "holding a cute bowl and spoon/chopsticks, mouth open ready to take a bite, sparkling hungry eyes", poseZh: "端碗张嘴准备大口干饭" },
      { pose: "cheeks puffed full chewing happily, eyes closed in bliss", poseZh: "腮帮子鼓鼓闭眼幸福咀嚼" },
      { pose: "chewing with cheeks squished softly and happy musical note or sparkle popping up", poseZh: "Q弹咀嚼冒出开心星光" },
      { pose: "swallowing with beaming satisfied smile, lifting spoon for the next bite", poseZh: "满足微笑再次举勺准备干饭" },
    ],
    frames9: [
      { pose: "holding a steaming cute food bowl happily with sparkling eyes", poseZh: "捧着冒热气美食碗两眼放光" },
      { pose: "lifting spoon/chopsticks with food toward wide-open mouth", poseZh: "举起美味送向张大的嘴" },
      { pose: "taking a big happy bite, cheeks starting to puff out", poseZh: "一大口咬下去腮帮子鼓起" },
      { pose: "cheeks puffed wide chewing blissfully with closed curved eyes", poseZh: "鼓脸幸福咀嚼眉眼弯弯" },
      { pose: "chewing squash beat, body swaying happily right, tiny sparkle appearing", poseZh: "边嚼边开心右晃冒小星光" },
      { pose: "chewing stretch beat, body swaying left with rosy blushing cheeks", poseZh: "边嚼边左晃脸颊红扑扑" },
      { pose: "final happy chew with little floating stars of deliciousness", poseZh: "最后一口满足咀嚼星光飘起" },
      { pose: "beaming wide satisfied smile, patting or cradling bowl happily", poseZh: "露出超级满足的灿烂笑容" },
      { pose: "dipping spoon back into bowl ready to scoop smoothly into frame 1", poseZh: "重新舀起美味衔接首帧循环" },
    ],
  },
  {
    id: "angry-steam",
    emoji: "💢",
    category: "funny",
    nameZh: "气鼓鼓冒烟",
    nameEn: "Fuming Mad",
    captionZh: "哼！",
    captionEn: "Hmph!",
    defaultFps: 10,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "arms crossed frowning, cheeks puffing out with furrowed brows", poseZh: "抱臂皱眉鼓起脸颊" },
      { pose: "face turning slightly red, small white steam puffs popping from ears/head", poseZh: "气得脸红头顶开始冒白烟" },
      { pose: "stomping one foot with angry comic vein symbol and bigger steam clouds", poseZh: "气鼓鼓跺脚冒出怒气符号与白烟" },
      { pose: "huffing sharply with puffed cheeks, steam rising and dissipating to loop", poseZh: "重重哼气白烟升散衔接首帧" },
    ],
    frames9: [
      { pose: "facing front with annoyed frown and hands on hips", poseZh: "叉腰皱眉一脸不爽" },
      { pose: "cheeks puffing up tightly, eyebrows knitting sharper", poseZh: "鼓起腮帮子眉毛拧紧" },
      { pose: "body trembling slightly with anger, rosy red tint rising on cheeks", poseZh: "气到微微发抖脸颊泛红" },
      { pose: "red comic anger vein popping beside temple, tiny steam wisps starting", poseZh: "额头冒出怒气井字和缕缕白烟" },
      { pose: "peak angry stomp, two crisp white steam puffs shooting out from both sides", poseZh: "气鼓鼓跺脚两边喷出白烟" },
      { pose: "vibrating slightly in place with clenched fists and big pout", poseZh: "握拳气哼哼原地颤抖" },
      { pose: "second smaller steam puff rising upward as cheeks stay puffed", poseZh: "第二团白烟上升依然鼓脸" },
      { pose: "turning head slightly with defiant hmph expression as steam fades", poseZh: "傲娇哼一声白烟渐散" },
      { pose: "settling back into crossed-arm grumpy stance ready to loop", poseZh: "回到抱臂生闷气姿势无缝循环" },
    ],
  },
  {
    id: "cry-puppy",
    emoji: "🥺",
    category: "love",
    nameZh: "委屈巴巴泪汪汪",
    nameEn: "Puppy Eyes Tear",
    captionZh: "委屈",
    captionEn: "Please...",
    defaultFps: 7,
    defaultLoopMode: "pingpong",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "looking up timidly with big watery glistening eyes and tiny wobbly pout", poseZh: "可怜巴巴抬头大眼睛泛泪光" },
      { pose: "fidgeting hands together, glossy tears swelling at the corners of eyes", poseZh: "对指紧张眼眶泪水打转" },
      { pose: "shoulders hunching slightly, big shimmering tear trembling on lower eyelid", poseZh: "缩肩委屈大颗泪珠在眼角颤抖" },
      { pose: "tiny teardrop rolling down cheek with ultra-cute pleading expression", poseZh: "一滴泪珠滑落超萌求安慰" },
    ],
    frames9: [
      { pose: "looking up shyly with huge sparkling watery eyes", poseZh: "委屈抬头睁着水汪汪大眼" },
      { pose: "lower lip wobbling slightly, hands tucked timidly together", poseZh: "嘴唇微撇双手局促并拢" },
      { pose: "eyes shimmering brighter as watery reflections grow", poseZh: "眼里泪光闪闪越积越多" },
      { pose: "shoulders curling inward softly, eyebrows drooping adorably", poseZh: "缩起小肩膀眉毛八字下垂" },
      { pose: "shiny teardrop forming clearly at eye corner, gentle sniffle", poseZh: "眼角凝出晶莹泪珠轻轻抽泣" },
      { pose: "teardrop rolling gently down rosy cheek", poseZh: "泪珠顺着脸颊缓缓滑落" },
      { pose: "wiping cheek lightly with little sleeve/paw still looking pitiful", poseZh: "轻轻抹泪依旧委屈巴巴" },
      { pose: "peeking up hopefully with huge pleading eyes", poseZh: "悄悄抬眼充满期待看着你" },
      { pose: "easing softly back into watery-eyed pout to loop smoothly", poseZh: "柔缓回到泛泪起势无缝循环" },
    ],
  },
  {
    id: "clap-yay",
    emoji: "👏",
    category: "daily",
    nameZh: "鼓掌点赞夸夸",
    nameEn: "Happy Clapping",
    captionZh: "太棒了",
    captionEn: "Bravo!",
    defaultFps: 9,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "beaming brightly, hands opened wide apart ready to clap", poseZh: "笑眼弯弯双手张开准备鼓掌" },
      { pose: "hands clapping firmly together with bright comic star burst between palms", poseZh: "双手拍合掌心迸出星星" },
      { pose: "hands opening slightly with joyful little bounce and floating sparkles", poseZh: "双手微张欢快微弹星光飘" },
      { pose: "clapping together again with radiant proud smile", poseZh: "再次拍手露出骄傲灿烂笑" },
    ],
    frames9: [
      { pose: "smiling warmly, hands raised in front of chest slightly apart", poseZh: "暖心微笑双手举在胸前" },
      { pose: "hands moving briskly together to clap, eyes curving joyfully", poseZh: "双手迅速拍合眉眼弯弯" },
      { pose: "clap impact with crisp comic burst lines and tiny golden stars", poseZh: "拍手瞬间迸出星芒光效" },
      { pose: "hands bouncing back apart, character hopping lightly in delight", poseZh: "双手弹开欢快小跳一下" },
      { pose: "second enthusiastic clap impact, cheeks blushing happily", poseZh: "第二次热烈鼓掌脸颊微红" },
      { pose: "hands parting slightly while tiny stars float upward around head", poseZh: "星星飘向头顶越拍越开心" },
      { pose: "third crisp clap with eyes sparkling brightly", poseZh: "第三次清脆鼓掌两眼放光" },
      { pose: "body gently settling from hop with wide admiring grin", poseZh: "轻轻落稳满脸崇拜赞叹" },
      { pose: "hands opening cleanly to starting width for seamless looping", poseZh: "双手张开回位准备无缝循环" },
    ],
  },
  {
    id: "shock-what",
    emoji: "😱",
    category: "funny",
    nameZh: "震惊下巴掉地",
    nameEn: "Mind Blown Shock",
    captionZh: "尊嘟假嘟",
    captionEn: "WHAT?!",
    defaultFps: 10,
    defaultLoopMode: "pingpong",
    recommendedAlign: "centroid",
    frames4: [
      { pose: "blinking in sudden surprise, pupils shrinking slightly", poseZh: "突然瞪眼愣住瞳孔微缩" },
      { pose: "jumping slightly upward, hands flying to cheeks, jaw dropping open", poseZh: "吓得一跳双手捧脸张大嘴" },
      { pose: "peak cartoon shock with wide eyes, dramatic zig-zag shock lines radiating out", poseZh: "极限震惊周围炸出闪电惊叹线" },
      { pose: "trembling in disbelief with wide-open mouth and tiny sweat drop", poseZh: "惊呆颤抖冒出冷汗" },
    ],
    frames9: [
      { pose: "normal curious expression suddenly noticing something wild", poseZh: "好奇张望突然发现大瓜" },
      { pose: "eyes snapping wide open, eyebrows shooting upward", poseZh: "双眼猛地睁大眉毛飞起" },
      { pose: "recoiling slightly backward, hands flying up toward cheeks", poseZh: "惊得后仰双手举向脸颊" },
      { pose: "vertical startled jump with jaw dropping wide open", poseZh: "原地吓飞下巴掉下来" },
      { pose: "peak cartoon shock, dramatic comic lightning lines radiating around head", poseZh: "震惊巅峰头顶炸出漫画惊叹线" },
      { pose: "vibrating slightly right in utter disbelief, pupils tiny", poseZh: "不敢相信微微向右发抖" },
      { pose: "vibrating slightly left with big sweat drop popping out", poseZh: "向左发抖冒出一颗大冷汗" },
      { pose: "landing softly still holding cheeks staring wide-eyed", poseZh: "落地仍双手捂脸目瞪口呆" },
      { pose: "catching breath with shocked blinking eyes ready to loop", poseZh: "惊魂未定眨眼衔接循环" },
    ],
  },
  {
    id: "sleepy-zzz",
    emoji: "😴",
    category: "work-life",
    nameZh: "犯困打瞌睡",
    nameEn: "Sleepy Zzz",
    captionZh: "困死了",
    captionEn: "Sleepy...",
    defaultFps: 6,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "eyes half-closed drowsily, sitting cozy and still, tiny Zzz starting", poseZh: "半眯着眼犯困冒出小 Zzz" },
      { pose: "head nodding slowly forward asleep, small floating Zzz rising", poseZh: "小鸡啄米般垂头 Zzz 飘起" },
      { pose: "peaceful deep snooze with tiny sleep bubble inflating slightly, Zzz higher", poseZh: "吹出小鼻涕泡香甜打盹" },
      { pose: "gentle drowsy inhale lifting head slightly back up, bubble shrinking cleanly", poseZh: "呼吸微抬鼻涕泡收回衔接循环" },
    ],
    frames9: [
      { pose: "cozy seated posture, eyelids drooping heavily", poseZh: "乖巧坐着眼皮沉重打架" },
      { pose: "eyes closing peacefully, slight slow inhale", poseZh: "安心闭眼缓缓吸气" },
      { pose: "head tilting gently downward, first tiny 'Z' floating up", poseZh: "小脑袋垂下冒出第一个 Z" },
      { pose: "tiny translucent sleep bubble forming softly, second 'z' appearing", poseZh: "吹出小小睡眠泡飘起第二个 z" },
      { pose: "sleep bubble swelling gently at peak of cozy snooze", poseZh: "睡泡圆润膨胀睡得最香" },
      { pose: "head swaying slightly with peaceful content smile, Zzz floating higher", poseZh: "微晃露出安稳笑 Zzz 飘高" },
      { pose: "sleep bubble shrinking softly on slow exhale", poseZh: "呼气睡泡缓缓变小" },
      { pose: "Zzz fading gently near top, head lifting subtly", poseZh: "Zzz 轻散小脑袋微微抬起" },
      { pose: "settling back into drowsy half-closed posture for seamless loop", poseZh: "回到半梦半醒姿态无缝循环" },
    ],
  },
  {
    id: "dance-vibe",
    emoji: "💃",
    category: "funny",
    nameZh: "魔性摇摆蹦迪",
    nameEn: "Happy Groove Dance",
    captionZh: "冲呀",
    captionEn: "Let's Go!",
    defaultFps: 9,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "grooving joyfully leaning left with both arms lifted left and happy closed eyes", poseZh: "开心左摆双手扬向左侧" },
      { pose: "center bounce down with squash, big cheerful grin and tiny musical note", poseZh: "居中弹性下蹲冒出小音符" },
      { pose: "grooving joyfully leaning right with both arms lifted right and sparkly eyes", poseZh: "开心右摆双手扬向右侧" },
      { pose: "center bounce down again preparing to swing smoothly left into frame 1", poseZh: "居中微蹲衔接回左侧摇摆" },
    ],
    frames9: [
      { pose: "standing centered knees slightly bent ready to groove with happy smile", poseZh: "居中微屈膝准备魔性摇摆" },
      { pose: "swaying left, arms swinging joyfully to the left", poseZh: "向左摇摆双臂甩向左边" },
      { pose: "peak left dance pose with cheerful wink and floating musical note", poseZh: "左侧摇摆高点俏皮眨眼带音符" },
      { pose: "swaying back through center with bouncy rhythmic dip", poseZh: "节奏弹跳回到中间" },
      { pose: "swaying right, arms swinging joyfully to the right", poseZh: "向右摇摆双臂甩向右边" },
      { pose: "peak right dance pose with beaming laugh and sparkling stars", poseZh: "右侧摇摆高点大笑冒星星" },
      { pose: "bouncing back to center with both hands raised high celebrating", poseZh: "居中举高双手欢呼雀跃" },
      { pose: "cute celebratory little wiggle with rosy cheeks", poseZh: "脸红红得意小扭动" },
      { pose: "settling smoothly back into centered ready-to-groove stance", poseZh: "顺滑回到居中起势循环" },
    ],
  },
  {
    id: "sip-boba",
    emoji: "🧋",
    category: "work-life",
    nameZh: "吸溜奶茶续命",
    nameEn: "Sipping Boba Tea",
    captionZh: "续命",
    captionEn: "Boba Time",
    defaultFps: 8,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "hugging a cute iced boba milk tea cup happily, straw near lips", poseZh: "抱紧珍珠奶茶杯吸管凑近嘴边" },
      { pose: "sipping through straw with puffed cheeks and eyes squinting in delight", poseZh: "用力吸溜奶茶腮帮鼓起眯眼" },
      { pose: "basking in pure joy with glowing cheeks and tiny floating sparkles", poseZh: "喝到快乐水满脸幸福冒星光" },
      { pose: "holding cup with bright refreshed smile ready for another sip", poseZh: "元气满血复活准备再吸一口" },
    ],
    frames9: [
      { pose: "holding a cute cup of iced boba milk tea with sparkling eyes", poseZh: "捧着冰珍珠奶茶两眼放光" },
      { pose: "bringing straw smoothly to mouth", poseZh: "把吸管凑到嘴边准备吸溜" },
      { pose: "taking a big happy sip, cheeks pulling slightly inward", poseZh: "大口吸溜奶茶" },
      { pose: "cheeks puffing full with yummy boba pearls, eyes curving shut", poseZh: "吸到珍珠腮帮鼓鼓闭眼陶醉" },
      { pose: "chewing boba happily with rosy cheeks and tiny sparkles popping out", poseZh: "Q弹嚼珍珠冒出幸福星光" },
      { pose: "happy shoulder wiggle from pure milk-tea bliss", poseZh: "喝到续命快乐水开心晃肩" },
      { pose: "lowering cup slightly with radiant refreshed grin", poseZh: "微微放下杯子露出满血笑容" },
      { pose: "giving cup an affectionate little hug with tiny heart/sparkle", poseZh: "爱不释手抱紧奶茶冒小星星" },
      { pose: "easing smoothly back into starting sipping stance", poseZh: "柔缓回位准备下一口循环" },
    ],
  },
  {
    id: "headpat-hug",
    emoji: "🤗",
    category: "love",
    nameZh: "张开双臂要抱抱",
    nameEn: "Open Arms Hug",
    captionZh: "抱抱",
    captionEn: "Hug Me!",
    defaultFps: 8,
    defaultLoopMode: "pingpong",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "standing adorably with shy warm smile, arms beginning to open", poseZh: "暖萌微笑双臂微微张开" },
      { pose: "stretching both arms wide open forward asking for a hug, blushing cheeks", poseZh: "大大张开双臂求抱抱脸红" },
      { pose: "leaning happily forward with big sparkling eyes and two tiny floating hearts", poseZh: "向前凑近亮眼求抱冒爱心" },
      { pose: "squeezing arms gently in a cozy self-hug sway with sweet closed-eye smile", poseZh: "甜甜微笑轻晃要贴贴" },
    ],
    frames9: [
      { pose: "looking warmly forward with soft blushing smile", poseZh: "暖暖看着前方脸颊微红" },
      { pose: "lifting both arms outward gently", poseZh: "慢慢抬起双臂张开" },
      { pose: "arms opening wide in an inviting hug gesture", poseZh: "双臂大大敞开邀请抱抱" },
      { pose: "leaning eagerly forward with cute little step and bright eyes", poseZh: "期待地前倾两眼亮晶晶" },
      { pose: "peak open-arms hug pose with rosy blush and tiny pink hearts popping up", poseZh: "抱抱最高点飘出甜蜜小爱心" },
      { pose: "gentle joyful sway left with arms wide open", poseZh: "张开双臂开心向左轻晃" },
      { pose: "gentle joyful sway right as hearts float upward", poseZh: "开心向右轻晃爱心上飘" },
      { pose: "sweet happy closed-eye grin cuddling warmly", poseZh: "闭眼露出超级治愈的笑" },
      { pose: "arms softening smoothly back toward starting pose", poseZh: "双臂柔缓收回衔接首帧" },
    ],
  },
  {
    id: "thinking-hmm",
    emoji: "🤔",
    category: "daily",
    nameZh: "歪头思考冒问号",
    nameEn: "Curious Head Tilt",
    captionZh: "嗯？",
    captionEn: "Hmm?",
    defaultFps: 7,
    defaultLoopMode: "pingpong",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "looking forward curiously, one finger raised near chin", poseZh: "托腮好奇看向正前方" },
      { pose: "head tilting gently to the right, one eyebrow raised, small question mark appearing", poseZh: "脑袋向右微歪挑眉冒小问号" },
      { pose: "deeper curious head tilt with bigger crisp question mark floating beside head", poseZh: "大幅度歪头杀大问号浮现" },
      { pose: "blinking thoughtfully with finger tapping chin, question mark bobbing", poseZh: "眨眼思考手指轻点下巴" },
    ],
    frames9: [
      { pose: "facing front with neutral curious expression", poseZh: "正面好奇凝视" },
      { pose: "raising one hand/paw thoughtfully to chin", poseZh: "抬起小手托住下巴" },
      { pose: "head starting to tilt gently to the side, one eyebrow arching", poseZh: "脑袋开始歪向一侧微微挑眉" },
      { pose: "small stylized question mark popping beside head", poseZh: "头旁冒出一个小问号" },
      { pose: "peak adorable head tilt, question mark fully visible and crisp", poseZh: "最萌歪头杀问号完全浮现" },
      { pose: "blinking slowly in deep thought while tapping chin", poseZh: "慢眨眼轻点下巴陷入沉思" },
      { pose: "question mark bobbing softly upward", poseZh: "问号轻轻上浮晃动" },
      { pose: "slight playful squint examining closely", poseZh: "眯眼仔细端详充满疑惑" },
      { pose: "head easing smoothly back upright to loop cleanly", poseZh: "脑袋转正回到起势循环" },
    ],
  },
  {
    id: "rich-lucky",
    emoji: "🧧",
    category: "work-life",
    nameZh: "撒币发财好运来",
    nameEn: "Lucky Coin Rain",
    captionZh: "发财",
    captionEn: "Lucky!",
    defaultFps: 9,
    defaultLoopMode: "loop",
    recommendedAlign: "bottom-center",
    frames4: [
      { pose: "grinning joyfully holding shiny golden coins in both hands near chest", poseZh: "捧着亮闪闪金币满脸喜气" },
      { pose: "tossing golden coins happily upward into the air with sparkling eyes", poseZh: "欢快把金币抛向空中" },
      { pose: "arms raised celebrating as golden coins and sparkles shower around", poseZh: "高举双手欢呼金币星光洒下" },
      { pose: "catching lucky vibe with beaming proud grin ready to toss again", poseZh: "喜气洋洋接好运无缝衔接" },
    ],
    frames9: [
      { pose: "standing happily cupping shiny gold coins with bright eyes", poseZh: "双手捧满闪亮金币喜笑颜开" },
      { pose: "crouching slightly in joyful anticipation holding coins low", poseZh: "开心微蹲蓄力准备撒币" },
      { pose: "springing upward tossing golden coins into the air", poseZh: "元气跃起把金币高高抛起" },
      { pose: "golden coins arcing overhead with crisp shine sparkles", poseZh: "金币在头顶划出闪亮弧线" },
      { pose: "peak celebration pose arms wide open under sparkling golden shower", poseZh: "张开双臂在金币星光雨下欢呼" },
      { pose: "coins twinkling as they drift down past rosy smiling cheeks", poseZh: "金币闪烁飘落满脸喜气" },
      { pose: "joyful little bounce with eyes curved in lucky bliss", poseZh: "开心小弹跳眉眼弯成月牙" },
      { pose: "gathering hands smoothly forward with glittering sparkles fading", poseZh: "双手合拢接住满身好运" },
      { pose: "settling back into coin-holding grin to loop smoothly", poseZh: "顺滑回到捧币起势无缝循环" },
    ],
  },
];

export const DEFAULT_QUAD_ACTION_IDS: [string, string, string, string] = [
  "wave-hi",
  "lol-laugh",
  "finger-heart",
  "nod-ok",
];

export function isAnimatedSpriteThemeId(themeId: string): themeId is AnimatedSpriteThemeId {
  return themeId === ANIM_SPRITE_SINGLE_THEME_ID || themeId === ANIM_SPRITE_QUAD_THEME_ID;
}

export function getAnimatedActionPresetById(id: string): AnimatedActionPreset | undefined {
  return ANIMATED_ACTION_PRESETS.find((a) => a.id === id);
}

export function getAnimatedPackLayout(
  themeId: string,
  gridSize: GridSize
): {
  kind: "single" | "quad";
  groupCount: number;
  framesPerGroup: number;
  expectedGridSize: GridSize;
} {
  if (themeId === ANIM_SPRITE_QUAD_THEME_ID || gridSize === "4x4") {
    return {
      kind: "quad",
      groupCount: 4,
      framesPerGroup: 4,
      expectedGridSize: "4x4",
    };
  }
  return {
    kind: "single",
    groupCount: 1,
    framesPerGroup: 9,
    expectedGridSize: "3x3",
  };
}

export function sanitizeAnimatedActionText(raw: string): string {
  return raw
    .replace(/["'`\r\n\t[\]{}<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function buildCustomBeatSequence(
  actionText: string,
  frameCount: 4 | 9
): AnimationFrameBeat[] {
  const clean = sanitizeAnimatedActionText(actionText) || "cheerful bounce wave";
  if (frameCount === 4) {
    return [
      {
        pose: `Frame 1/4 (anticipation start): character preparing to perform "${clean}" with steady centered posture`,
        poseZh: `第1帧（起势）：${clean}`,
      },
      {
        pose: `Frame 2/4 (action rise): character actively moving into "${clean}" with lively expressive energy`,
        poseZh: `第2帧（发力）：${clean}`,
      },
      {
        pose: `Frame 3/4 (climax peak): peak expressive moment of "${clean}" with vivid emotion and small motion accents`,
        poseZh: `第3帧（高潮）：${clean}`,
      },
      {
        pose: `Frame 4/4 (follow-through return): easing smoothly back from "${clean}" toward Frame 1 posture for a seamless loop`,
        poseZh: `第4帧（回落循环）：${clean}`,
      },
    ];
  }
  return [
    { pose: `Frame 1/9 (neutral start): ready stance beginning "${clean}"`, poseZh: `第1帧（起势）：${clean}` },
    { pose: `Frame 2/9 (anticipation): subtle wind-up preparing for "${clean}"`, poseZh: `第2帧（蓄力）：${clean}` },
    { pose: `Frame 3/9 (action launch): launching energetically into "${clean}"`, poseZh: `第3帧（启动）：${clean}` },
    { pose: `Frame 4/9 (rising motion): mid-action momentum of "${clean}" with bright facial expression`, poseZh: `第4帧（加速）：${clean}` },
    { pose: `Frame 5/9 (peak climax): maximum expressive highlight of "${clean}" with crisp comic accents`, poseZh: `第5帧（高潮峰值）：${clean}` },
    { pose: `Frame 6/9 (secondary bounce): lively playful follow-through beat of "${clean}"`, poseZh: `第6帧（弹性余韵）：${clean}` },
    { pose: `Frame 7/9 (echo beat): rhythmic rebound still showing joy/energy of "${clean}"`, poseZh: `第7帧（回弹）：${clean}` },
    { pose: `Frame 8/9 (settle down): softening smoothly out of "${clean}"`, poseZh: `第8帧（收势）：${clean}` },
    { pose: `Frame 9/9 (loop bridge): returning smoothly toward Frame 1 posture for seamless looping`, poseZh: `第9帧（衔接首帧）：${clean}` },
  ];
}

export interface AnimatedClipConfig {
  actionId: string; // preset id or "custom"
  customAction?: string;
  caption: string;
  fps?: number;
  loopMode?: AnimationLoopMode;
}

export function buildAnimatedSlots(input: {
  themeId: AnimatedSpriteThemeId;
  captionMode: CaptionMode;
  clips: AnimatedClipConfig[];
}): StickerSlotSnapshot[] {
  const isQuad = input.themeId === ANIM_SPRITE_QUAD_THEME_ID;
  const groupCount = isQuad ? 4 : 1;
  const framesPerGroup: 4 | 9 = isQuad ? 4 : 9;

  const result: StickerSlotSnapshot[] = [];

  for (let g = 0; g < groupCount; g++) {
    const clip = input.clips[g];
    const fallbackPreset =
      getAnimatedActionPresetById(DEFAULT_QUAD_ACTION_IDS[g % DEFAULT_QUAD_ACTION_IDS.length]) ??
      ANIMATED_ACTION_PRESETS[0];
    const preset = clip?.actionId ? getAnimatedActionPresetById(clip.actionId) : undefined;
    const cleanCustom = clip?.customAction ? sanitizeAnimatedActionText(clip.customAction) : "";

    const useCustom = !preset && cleanCustom.length > 0;
    const activePreset = preset ?? fallbackPreset;
    const beats = useCustom
      ? buildCustomBeatSequence(cleanCustom, framesPerGroup)
      : framesPerGroup === 4
        ? activePreset.frames4
        : activePreset.frames9;

    const defaultCaption =
      input.captionMode === "none"
        ? ""
        : input.captionMode === "zh"
          ? activePreset.captionZh
          : activePreset.captionEn;

    const caption =
      input.captionMode === "none"
        ? ""
        : (clip?.caption !== undefined ? clip.caption : defaultCaption).trim().slice(0, 12);

    const fps = Math.max(4, Math.min(16, Math.round(clip?.fps ?? activePreset.defaultFps)));
    const loopMode: AnimationLoopMode =
      clip?.loopMode === "pingpong" || clip?.loopMode === "loop"
        ? clip.loopMode
        : activePreset.defaultLoopMode;

    for (let f = 0; f < framesPerGroup; f++) {
      const beat = beats[f];
      result.push({
        index: g * framesPerGroup + f,
        pose: beat.pose,
        poseZh: beat.poseZh,
        caption,
        customPose: useCustom ? cleanCustom : undefined,
        animGroup: g,
        animFrame: f,
        animActionId: useCustom ? "custom" : activePreset.id,
        animLoopMode: loopMode,
        animFps: fps,
      });
    }
  }

  return result;
}

export function buildDefaultAnimatedSlots(
  themeId: AnimatedSpriteThemeId,
  captionMode: CaptionMode
): StickerSlotSnapshot[] {
  const isQuad = themeId === ANIM_SPRITE_QUAD_THEME_ID;
  const actionIds = isQuad ? DEFAULT_QUAD_ACTION_IDS : [ANIMATED_ACTION_PRESETS[0].id];
  const clips: AnimatedClipConfig[] = actionIds.map((id) => {
    const preset = getAnimatedActionPresetById(id) ?? ANIMATED_ACTION_PRESETS[0];
    return {
      actionId: preset.id,
      caption:
        captionMode === "none"
          ? ""
          : captionMode === "zh"
            ? preset.captionZh
            : preset.captionEn,
      fps: preset.defaultFps,
      loopMode: preset.defaultLoopMode,
    };
  });
  return buildAnimatedSlots({ themeId, captionMode, clips });
}

export function resolveAnimatedSlotsForGeneration(input: {
  themeId: AnimatedSpriteThemeId;
  captionMode: CaptionMode;
  slots?: Array<{
    index: number;
    pose: string;
    poseZh?: string;
    caption: string;
    customPose?: string;
    animGroup?: number;
    animFrame?: number;
    animActionId?: string;
    animLoopMode?: AnimationLoopMode;
    animFps?: number;
  }>;
}): StickerSlotSnapshot[] {
  const isQuad = input.themeId === ANIM_SPRITE_QUAD_THEME_ID;
  const groupCount = isQuad ? 4 : 1;
  const framesPerGroup = isQuad ? 4 : 9;
  const expectedCount = groupCount * framesPerGroup;

  if (!input.slots || input.slots.length !== expectedCount) {
    return buildDefaultAnimatedSlots(input.themeId, input.captionMode);
  }

  const clips: AnimatedClipConfig[] = [];
  for (let g = 0; g < groupCount; g++) {
    const firstSlot = input.slots[g * framesPerGroup];
    const preset = firstSlot?.animActionId
      ? getAnimatedActionPresetById(firstSlot.animActionId)
      : undefined;
    const cleanCustom = firstSlot?.customPose
      ? sanitizeAnimatedActionText(firstSlot.customPose)
      : "";
    const fallbackPreset =
      getAnimatedActionPresetById(DEFAULT_QUAD_ACTION_IDS[g % DEFAULT_QUAD_ACTION_IDS.length]) ??
      ANIMATED_ACTION_PRESETS[0];

    clips.push({
      actionId: preset ? preset.id : cleanCustom ? "custom" : fallbackPreset.id,
      customAction: !preset && cleanCustom ? cleanCustom : undefined,
      caption:
        input.captionMode === "none"
          ? ""
          : (firstSlot?.caption ?? "").trim().slice(0, 12),
      fps: firstSlot?.animFps ?? (preset ?? fallbackPreset).defaultFps,
      loopMode: firstSlot?.animLoopMode ?? (preset ?? fallbackPreset).defaultLoopMode,
    });
  }

  return buildAnimatedSlots({
    themeId: input.themeId,
    captionMode: input.captionMode,
    clips,
  });
}

export interface AnimatedClipGroup {
  groupIndex: number;
  cellIndices: number[];
  actionId: string;
  titleZh: string;
  titleEn: string;
  emoji: string;
  caption: string;
  defaultFps: number;
  defaultLoopMode: AnimationLoopMode;
  recommendedAlign: SpriteAlignMode;
}

export function extractAnimatedClipGroups(
  themeId: string,
  gridSize: GridSize,
  slotsConfig: StickerSlotSnapshot[]
): AnimatedClipGroup[] {
  const layout = getAnimatedPackLayout(themeId, gridSize);
  const groups: AnimatedClipGroup[] = [];

  for (let g = 0; g < layout.groupCount; g++) {
    const start = g * layout.framesPerGroup;
    const cellIndices = Array.from({ length: layout.framesPerGroup }, (_, f) => start + f);
    const first = slotsConfig[start];
    const preset = first?.animActionId
      ? getAnimatedActionPresetById(first.animActionId)
      : undefined;
    const customLabel = first?.customPose?.trim();

    groups.push({
      groupIndex: g,
      cellIndices,
      actionId: first?.animActionId ?? preset?.id ?? "custom",
      titleZh: preset
        ? preset.nameZh
        : customLabel || `动图 #${g + 1}`,
      titleEn: preset
        ? preset.nameEn
        : customLabel || `Clip #${g + 1}`,
      emoji: preset?.emoji ?? "🎬",
      caption: first?.caption ?? "",
      defaultFps: first?.animFps ?? preset?.defaultFps ?? 8,
      defaultLoopMode: first?.animLoopMode ?? preset?.defaultLoopMode ?? "loop",
      recommendedAlign: preset?.recommendedAlign ?? "ncc",
    });
  }

  return groups;
}
