import type { CaptionMode, GridSize, StickerSlotSnapshot } from "@/db/schema";

export interface PoseVariant {
  pose: string;
  poseZh: string;
}

export interface ThemeSlotPreset {
  pose: string;
  poseZh: string;
  variants: [PoseVariant, PoseVariant];
  captionZh: string;
  captionEn: string;
}

export type ThemeCategory = "daily-chat" | "work-study" | "relationships" | "lifestyle";

export const THEME_CATEGORIES: Array<{
  id: ThemeCategory;
  nameZh: string;
  nameEn: string;
}> = [
  { id: "daily-chat", nameZh: "聊天斗图", nameEn: "Daily & Meme" },
  { id: "work-study", nameZh: "职场校园", nameEn: "Work & Study" },
  { id: "relationships", nameZh: "恋爱萌宠", nameEn: "Love & Pets" },
  { id: "lifestyle", nameZh: "生活节庆", nameEn: "Lifestyle & Festive" },
];

export interface ThemePack {
  id: string;
  category: ThemeCategory;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  emoji: string;
  slots: ThemeSlotPreset[]; // 16 slots; 3x3 uses first 9, 4x4 uses all 16
}

export const THEME_POSE_VARIANT_COUNT = 3;

export const THEME_PACKS: ThemePack[] = [
  {
    id: "daily-essentials",
    category: "daily-chat",
    nameZh: "日常通用",
    nameEn: "Daily Essentials",
    descriptionZh: "覆盖早安、OK、谢谢、比心、大笑等高频聊天场景",
    descriptionEn: "Everyday reactions: GM, OK, Thanks, Love, LOL & more",
    emoji: "☀️",
    slots: [
      {
        pose: "cheerfully waving hello with a sunny smile",
        poseZh: "元气满满挥手打招呼",
        variants: [
          { pose: "stretching both arms overhead with a bright morning sun icon behind", poseZh: "迎着小太阳伸懒腰问早" },
          { pose: "raising a steaming morning mug happily with a cheerful wink", poseZh: "举起冒热气早餐杯眨眼问早" },
        ],
        captionZh: "早安",
        captionEn: "GM!",
      },
      {
        pose: "giving an enthusiastic OK hand sign and wink",
        poseZh: "俏皮眨眼比 OK 手势",
        variants: [
          { pose: "forming a giant circle above head with both arms smiling", poseZh: "双手高举头顶比大圆圈 OK" },
          { pose: "snapping fingers confidently with a crisp sparkle", poseZh: "潇洒打响指自信搞定" },
        ],
        captionZh: "OK",
        captionEn: "OK!",
      },
      {
        pose: "clasping hands together gratefully with sparkles",
        poseZh: "双手合十星光感谢",
        variants: [
          { pose: "offering a tiny glowing flower with a warm grateful bow", poseZh: "鞠躬递上小红花表感谢" },
          { pose: "placing both hands over heart with happy closed eyes", poseZh: "双手捧心闭眼感动致谢" },
        ],
        captionZh: "谢谢",
        captionEn: "Thanks!",
      },
      {
        pose: "laughing out loud with tears of joy",
        poseZh: "捧腹笑出眼泪",
        variants: [
          { pose: "rolling backward kicking feet in the air laughing uncontrollably", poseZh: "笑到仰倒蹬脚停不下来" },
          { pose: "slapping the floor laughing hard with eyes squeezed shut", poseZh: "拍地狂笑到眼睛眯成线" },
        ],
        captionZh: "哈哈哈",
        captionEn: "LOL",
      },
      {
        pose: "making a cute finger heart with blushing cheeks",
        poseZh: "脸红比出手指爱心",
        variants: [
          { pose: "forming a big heart above head with both arms beaming", poseZh: "双手举过头顶比大爱心" },
          { pose: "cupping both hands together launching a floating pink heart", poseZh: "双手捧出飘浮粉红爱心" },
        ],
        captionZh: "比心",
        captionEn: "Love u",
      },
      {
        pose: "tilting head with a big question mark, curious look",
        poseZh: "歪头冒出大问号",
        variants: [
          { pose: "peering closely through a cartoon magnifying glass inquisitively", poseZh: "举起放大镜凑近好奇观察" },
          { pose: "scratching cheek with one finger and raising an eyebrow", poseZh: "单手挠脸挑眉一脸疑惑" },
        ],
        captionZh: "嗯？",
        captionEn: "Huh?",
      },
      {
        pose: "giving a confident thumbs up with stars",
        poseZh: "自信竖起大拇指",
        variants: [
          { pose: "tapping forehead in a crisp playful salute", poseZh: "干脆利落敬礼表示明白" },
          { pose: "holding up a tiny green checkmark sign proudly", poseZh: "举起绿色对勾牌果断确认" },
        ],
        captionZh: "收到",
        captionEn: "Got it",
      },
      {
        pose: "sleepy yawning with a tiny moon and Zzz",
        poseZh: "打哈欠配小月亮 Zzz",
        variants: [
          { pose: "hugging a fluffy cloud pillow with eyes half closed", poseZh: "抱着软绵绵云朵枕头犯困" },
          { pose: "wearing a cozy nightcap waving softly beside twinkling stars", poseZh: "戴睡帽在星光下轻声道晚安" },
        ],
        captionZh: "晚安",
        captionEn: "Night",
      },
      {
        pose: "waving goodbye happily",
        poseZh: "开开心心挥手道别",
        variants: [
          { pose: "skipping away sideways while glancing back and waving", poseZh: "蹦跳离开回头挥手拜拜" },
          { pose: "waving a little handkerchief enthusiastically", poseZh: "挥舞小手帕依依不舍道别" },
        ],
        captionZh: "拜拜",
        captionEn: "Bye!",
      },
      {
        pose: "clapping hands excitedly celebrating",
        poseZh: "兴奋鼓掌庆祝",
        variants: [
          { pose: "leaping into the air throwing both arms up in triumph", poseZh: "高高跃起双手欢呼庆祝" },
          { pose: "ringing a tiny celebratory bell with sparkling stars", poseZh: "摇响小铃铛星光喝彩" },
        ],
        captionZh: "太棒了",
        captionEn: "Yay!",
      },
      {
        pose: "peeking shyly from behind hands",
        poseZh: "捂脸害羞偷看",
        variants: [
          { pose: "poking two index fingers together blushing brightly", poseZh: "两根食指害羞对戳脸通红" },
          { pose: "pulling collar up to hide a rosy bashful smile", poseZh: "拉高衣领遮住害羞小脸" },
        ],
        captionZh: "害羞",
        captionEn: "Shy",
      },
      {
        pose: "shocked jaw-drop with sweat drop",
        poseZh: "吓到目瞪口呆流冷汗",
        variants: [
          { pose: "gripping both cheeks dramatically with wide comic shock lines", poseZh: "双手捧脸经典呐喊式震惊" },
          { pose: "jumping backward startled with lightning bolts popping around head", poseZh: "吓到向后跳起头顶冒闪电" },
        ],
        captionZh: "震惊",
        captionEn: "OMG!",
      },
      {
        pose: "sweating nervously with awkward smile",
        poseZh: "尴尬流汗假笑",
        variants: [
          { pose: "rubbing the back of head sheepishly with a crooked grin", poseZh: "不好意思挠后脑勺憨笑" },
          { pose: "looking sideways nervously while whistling awkwardly", poseZh: "眼神飘忽吹口哨掩饰尴尬" },
        ],
        captionZh: "汗",
        captionEn: "Oops",
      },
      {
        pose: "holding a cup of milk tea happily",
        poseZh: "抱着奶茶满足开心",
        variants: [
          { pose: "sipping boba tea through a jumbo straw with cheeks puffed", poseZh: "鼓着腮帮大口吸珍珠奶茶" },
          { pose: "toasting forward with two cups of iced milk tea grinning", poseZh: "双手各举一杯奶茶开心干杯" },
        ],
        captionZh: "喝奶茶",
        captionEn: "Boba time",
      },
      {
        pose: "pumping fist cheering enthusiastically",
        poseZh: "握拳打气加油冲刺",
        variants: [
          { pose: "leaning forward in a sprinter takeoff pose with speed lines", poseZh: "起跑俯身带速度线全力冲刺" },
          { pose: "waving a tiny red pennant flag rallying forward", poseZh: "挥舞小旗帜元气带队冲锋" },
        ],
        captionZh: "冲呀",
        captionEn: "Let's go!",
      },
      {
        pose: "nodding seriously in agreement",
        poseZh: "认真点头表示赞同",
        variants: [
          { pose: "pointing decisively forward with a knowing approving nod", poseZh: "果断指向前方表示深表认同" },
          { pose: "stamping an approval seal emphatically with sparkles", poseZh: "用力盖下通过印章表示赞同" },
        ],
        captionZh: "赞同",
        captionEn: "Agreed",
      },
    ],
  },
  {
    id: "meme-chaos",
    category: "daily-chat",
    nameZh: "搞笑发疯",
    nameEn: "Chaos & Memes",
    descriptionZh: "尊嘟假嘟、蚌埠住了、原地升天、已老实，斗图发疯必备",
    descriptionEn: "Viral meme reactions: Really?!, Can't even, Clown me, Ascended",
    emoji: "🤪",
    slots: [
      {
        pose: "leaning way in with huge sparkling skeptical anime eyes and raised finger",
        poseZh: "瞪大闪亮八卦眼凑近求证",
        variants: [
          { pose: "tilting head sideways squinting skeptically with floating question marks", poseZh: "歪头眯眼冒问号怀疑真假" },
          { pose: "clutching cheeks in dramatic disbelief with jaw wide open", poseZh: "双手捧脸夸张张嘴震惊求证" },
        ],
        captionZh: "尊嘟假嘟",
        captionEn: "Really?!",
      },
      {
        pose: "biting down on a trembling lip trying hard not to burst out laughing",
        poseZh: "憋笑憋到嘴角颤抖破防",
        variants: [
          { pose: "collapsing onto the floor laughing and crying at the same time", poseZh: "笑到跪地捶地又笑又哭" },
          { pose: "covering mouth with both hands while shoulders shake wildly", poseZh: "双手捂嘴肩膀狂抖彻底破防" },
        ],
        captionZh: "蚌埠住了",
        captionEn: "Lost it",
      },
      {
        pose: "wearing a tiny red clown nose and holding a mini balloon sighing",
        poseZh: "戴小红鼻子拿气球默默认栽",
        variants: [
          { pose: "putting on a funny rainbow clown wig while staring blankly forward", poseZh: "淡定戴上彩虹假发直面现实" },
          { pose: "holding up a tiny hand mirror looking stunned at own goofy face", poseZh: "举小镜子照出滑稽小丑自己" },
        ],
        captionZh: "小丑是我",
        captionEn: "Clown me",
      },
      {
        pose: "floating upward with angel halo and sparkling white wings in bliss",
        poseZh: "头顶光环长出翅膀快乐升天",
        variants: [
          { pose: "glowing peacefully mid-air with tiny ghost soul drifting upward", poseZh: "灵魂飘出身体安详升天" },
          { pose: "soaring straight up like a rocket surrounded by starry speed lines", poseZh: "化作火箭伴着星光直冲云霄" },
        ],
        captionZh: "原地升天",
        captionEn: "Ascended",
      },
      {
        pose: "sitting obediently on a tiny wooden stool with hands neatly on knees",
        poseZh: "乖乖坐小板凳双手放膝盖",
        variants: [
          { pose: "kneeling neatly in a corner facing the wall looking humble", poseZh: "老老实实面壁蹲好反省" },
          { pose: "tucking hands inside sleeves blinking innocently and nodding", poseZh: "揣紧小手眨眼乖巧点头认错" },
        ],
        captionZh: "已老实",
        captionEn: "Behaved",
      },
      {
        pose: "giving a stiff wide-eyed thumbs up with messy hair and jittery lines",
        poseZh: "顶着炸毛强颜微笑竖大拇指",
        variants: [
          { pose: "smiling wildly with twitching eye and spinning dizzy swirls overhead", poseZh: "眼神微颤头顶冒圈微笑硬撑" },
          { pose: "balancing calmly on one foot while sparks pop humorously around", poseZh: "金鸡独立强装镇定头冒火花" },
        ],
        captionZh: "精神良好",
        captionEn: "Totally fine",
      },
      {
        pose: "peering eagerly through oversized novelty glasses leaning forward",
        poseZh: "戴大框眼镜探头狂凑热闹",
        variants: [
          { pose: "parting imaginary curtains with both hands peeking out curiously", poseZh: "扒开空气门帘伸头偷偷看" },
          { pose: "holding a giant magnifying glass right up to one eye", poseZh: "拿超大放大镜怼脸仔细看" },
        ],
        captionZh: "让我看看",
        captionEn: "Lemme see",
      },
      {
        pose: "thrusting both palms forward in a dramatic martial-arts repel pose",
        poseZh: "双手向前用力推掌疯狂驱散",
        variants: [
          { pose: "waving a giant red X sign back and forth energetically", poseZh: "挥舞大红叉牌疯狂大喊退下" },
          { pose: "leaping backward while making a protective cross with both arms", poseZh: "向后弹跳双手比叉拒绝靠近" },
        ],
        captionZh: "退退退",
        captionEn: "Back off!",
      },
      {
        pose: "munching a bright slice of watermelon with starry gossip eyes",
        poseZh: "捧着大西瓜星星眼吃瓜",
        variants: [
          { pose: "hugging half a juicy watermelon with a spoon leaning in eagerly", poseZh: "抱半个西瓜拿勺子前排吃瓜" },
          { pose: "sitting on a folding chair happily eating watermelon seeds", poseZh: "搬好小板凳边啃瓜边看戏" },
        ],
        captionZh: "吃瓜",
        captionEn: "Spill tea",
      },
      {
        pose: "jaw dropping all the way down with eyeballs popping in comic shock",
        poseZh: "下巴惊掉地上眼睛瞪成铜铃",
        variants: [
          { pose: "hair standing straight up like lightning struck in sheer shock", poseZh: "震惊到头发竖直全身石化" },
          { pose: "falling backward off a chair in hilarious exaggerated amazement", poseZh: "吓到连人带椅向后翻倒" },
        ],
        captionZh: "震惊我妈",
        captionEn: "Mind blown",
      },
      {
        pose: "frozen completely rigid like a statue with blank buffering eyes",
        poseZh: "当场呆若木鸡头顶转加载圈",
        variants: [
          { pose: "staring straight ahead frozen in mid-step with comic loading dots", poseZh: "迈步僵在原地大脑加载中" },
          { pose: "sitting petrified like stone with tiny leaves sprouting on head", poseZh: "原地石化久到头顶长小草" },
        ],
        captionZh: "硬控三秒",
        captionEn: "Stunned",
      },
      {
        pose: "rubbing both hands together mischievously with a sneaky evil grin",
        poseZh: "坏笑搓手期待搞大事",
        variants: [
          { pose: "leaning forward wiggling fingers gleefully with sparkling eyes", poseZh: "眼睛放光兴奋搓手跃跃欲试" },
          { pose: "twirling an imaginary villain mustache with cheeky excitement", poseZh: "得意挑眉搓手酝酿小算盘" },
        ],
        captionZh: "苍蝇搓手",
        captionEn: "Scheming",
      },
      {
        pose: "doing a crisp kung-fu fist-and-palm salute while backing away fast",
        poseZh: "抱拳行礼火速后撤溜走",
        variants: [
          { pose: "tipping a tiny hat politely before dashing off in a puff of dust", poseZh: "礼貌压帽檐瞬间原地消失" },
          { pose: "bowing once dramatically then diving behind a bush", poseZh: "潇洒一拱手转身跑得飞快" },
        ],
        captionZh: "告辞",
        captionEn: "I'm out",
      },
      {
        pose: "wobbly jagged comic crack lines appearing down face in disbelief",
        poseZh: "整个人出现裂纹当场裂开",
        variants: [
          { pose: "clutching head dramatically as comical puzzle cracks form around", poseZh: "抱头崩溃身周哗啦裂开" },
          { pose: "melting sideways off-balance with dizzy spiral eyes", poseZh: "心态崩到歪斜眼神转蚊香圈" },
        ],
        captionZh: "裂开了",
        captionEn: "Cracked",
      },
      {
        pose: "sipping tea with pinky finger raised high and calm aristocratic pose",
        poseZh: "翘起兰花指淡定优雅喝茶",
        variants: [
          { pose: "adjusting a tiny monocle with chin up looking effortlessly refined", poseZh: "推推单片眼镜从容保持优雅" },
          { pose: "sitting cross-legged tossing a tiny rose petal gracefully", poseZh: "二郎腿一翘优雅撒出一片花瓣" },
        ],
        captionZh: "优雅",
        captionEn: "Stay classy",
      },
      {
        pose: "kneeling with palms pressed together begging with comical waterfall tears",
        poseZh: "双手合十瀑布泪疯狂求饶",
        variants: [
          { pose: "curling into a tiny ball shielding head nervously", poseZh: "缩成一团抱头瑟瑟发抖" },
          { pose: "holding up a tiny surrender towel waving frantically", poseZh: "狂摇投降小手帕求放过" },
        ],
        captionZh: "求放过",
        captionEn: "Spare me",
      },
    ],
  },
  {
    id: "polite-etiquette",
    category: "daily-chat",
    nameZh: "礼貌客套",
    nameEn: "Polite & Warm",
    descriptionZh: "您好、麻烦您了、请多指教、辛苦啦，礼貌体面社交必备",
    descriptionEn: "Warm polite greetings: Hello, Excuse me, Thank you, Take care",
    emoji: "🤝",
    slots: [
      {
        pose: "giving a warm gentle wave and courteous welcoming bow",
        poseZh: "温和微笑挥手礼貌问好",
        variants: [
          { pose: "tipping head respectfully with both hands clasped politely in front", poseZh: "双手交叠身前礼貌颔首问好" },
          { pose: "opening one hand warmly in greeting with a gentle sparkle", poseZh: "优雅伸手致意春风满面" },
        ],
        captionZh: "您好",
        captionEn: "Hello!",
      },
      {
        pose: "pressing palms politely together with an earnest pleading smile",
        poseZh: "双手合十诚恳微笑拜托",
        variants: [
          { pose: "bowing slightly while presenting a tiny note politely", poseZh: "微微欠身礼貌拜托帮忙" },
          { pose: "tilting head politely with warm respectful eyes and clasped hands", poseZh: "眉眼温和合手诚恳请托" },
        ],
        captionZh: "麻烦您了",
        captionEn: "Please!",
      },
      {
        pose: "bowing deeply with grateful eyes and floating golden sparkles",
        poseZh: "九十度深鞠躬真诚致谢",
        variants: [
          { pose: "holding a warm bouquet politely with both hands smiling gratefully", poseZh: "双手捧花束满怀感激致谢" },
          { pose: "placing both hands over chest nodding warmly with shining eyes", poseZh: "双手按胸口眼含感激点头" },
        ],
        captionZh: "非常感谢",
        captionEn: "So grateful",
      },
      {
        pose: "waving one hand modestly with a warm reassuring smile",
        poseZh: "微笑摆手客气说不用谢",
        variants: [
          { pose: "nodding kindly with open palms and cheerful warm glow", poseZh: "亲切摊手微笑表示别客气" },
          { pose: "giving a friendly gentle thumbs up with warm modest grin", poseZh: "谦虚笑着比赞连连说小事" },
        ],
        captionZh: "不客气",
        captionEn: "Anytime!",
      },
      {
        pose: "hurrying in politely with hands clasped apologetically",
        poseZh: "小跑赶来合手抱歉久等",
        variants: [
          { pose: "checking a pocket watch with an apologetic sweat drop and bow", poseZh: "看表流汗礼貌鞠躬致歉" },
          { pose: "offering a tiny cup of tea to apologize warmly for being late", poseZh: "端上一杯热茶赔礼道歉" },
        ],
        captionZh: "久等了",
        captionEn: "Sorry late",
      },
      {
        pose: "nodding crisply with a polite OK hand sign and bright smile",
        poseZh: "利落点头比 OK 礼貌确认",
        variants: [
          { pose: "holding a pen over a neat notebook nodding attentively", poseZh: "握笔记笔记般认真点头收到" },
          { pose: "giving a neat respectful thumbs up with sparkling stars", poseZh: "精神饱满比大拇指妥妥收到" },
        ],
        captionZh: "好的收到",
        captionEn: "Will do!",
      },
      {
        pose: "gesturing politely forward with open hand letting others go first",
        poseZh: "伸手示意请便不打扰",
        variants: [
          { pose: "stepping back courteously with a gentle understanding nod", poseZh: "体贴退后半步微笑点头" },
          { pose: "sitting quietly with a warm teacup waiting patiently", poseZh: "安静捧茶微笑表示您先忙" },
        ],
        captionZh: "您先忙",
        captionEn: "Go ahead",
      },
      {
        pose: "offering a steaming cup of fragrant tea with both hands",
        poseZh: "双手敬上热茶慰问辛苦",
        variants: [
          { pose: "clapping gently with warm appreciative smile and soft sparkles", poseZh: "温柔鼓掌致敬辛苦付出" },
          { pose: "gently offering a tiny warm towel with caring expression", poseZh: "贴心递上毛巾道一声辛苦" },
        ],
        captionZh: "辛苦啦",
        captionEn: "Great job!",
      },
      {
        pose: "holding up a tiny lucky clover and smiling warmly in blessing",
        poseZh: "捧四叶草送上美好祝愿",
        variants: [
          { pose: "cheering softly with both hands raised and bright warm stars", poseZh: "眉眼弯弯举手祈福顺顺利利" },
          { pose: "handing over a golden lucky charm with gentle sparkle", poseZh: "递出金色好运护身符祝顺利" },
        ],
        captionZh: "祝您顺利",
        captionEn: "Best luck!",
      },
      {
        pose: "applauding warmly with sparkling appreciative eyes",
        poseZh: "由衷鼓掌竖指称赞太棒了",
        variants: [
          { pose: "giving a glowing double thumbs up with warm respectful smile", poseZh: "双手赞叹厉害极了" },
          { pose: "holding a tiny sparkling star medal smiling admiringly", poseZh: "举起星星奖章真心夸赞" },
        ],
        captionZh: "太棒了",
        captionEn: "Well done!",
      },
      {
        pose: "bowing respectfully like an eager polite newcomer smiling",
        poseZh: "端正鞠躬客气说请多指教",
        variants: [
          { pose: "holding a tiny name card neatly with both hands smiling", poseZh: "双手递上名片礼貌打招呼" },
          { pose: "standing straight with polite smile and gentle welcoming nod", poseZh: "挺直身板彬彬有礼点头" },
        ],
        captionZh: "请多指教",
        captionEn: "Nice to meet",
      },
      {
        pose: "holding up one polite index finger with a gentle reassuring smile",
        poseZh: "礼貌伸出一根手指请稍等",
        variants: [
          { pose: "flipping a tiny hourglass smiling calmly", poseZh: "轻转迷你小沙漏示意马上好" },
          { pose: "typing briskly with a polite reassuring wink", poseZh: "快速忙碌中抽空礼貌示意稍等" },
        ],
        captionZh: "稍等片刻",
        captionEn: "One sec!",
      },
      {
        pose: "patting chest confidently with a warm reassuring grin",
        poseZh: "拍拍胸脯自信保证没问题",
        variants: [
          { pose: "drawing a crisp green checkmark in the air smiling warmly", poseZh: "空中画出对勾表示包在我身上" },
          { pose: "giving a bright reliable OK sign with sunny sparkles", poseZh: "阳光比 OK 爽快答应没问题" },
        ],
        captionZh: "没问题",
        captionEn: "No problem!",
      },
      {
        pose: "offering a cozy blanket and warm mug gently with caring eyes",
        poseZh: "贴心递出小毯子叮嘱多休息",
        variants: [
          { pose: "gesturing calmly to sit down and take a peaceful breath", poseZh: "温柔示意放慢脚步休息一下" },
          { pose: "hugging a soft pillow smiling warmly as a gentle reminder", poseZh: "抱起软枕头暖心提醒早点休息" },
        ],
        captionZh: "注意休息",
        captionEn: "Rest well",
      },
      {
        pose: "waving fondly beside a tiny paper airplane flying smoothly",
        poseZh: "挥手目送纸飞机祝一路顺风",
        variants: [
          { pose: "holding a cute mini suitcase waving bon voyage cheerfully", poseZh: "挥舞小手祝旅途平安顺遂" },
          { pose: "sending a warm breezy blessing with fluttering ribbon", poseZh: "伴着彩带微笑道别祝平安" },
        ],
        captionZh: "一路顺风",
        captionEn: "Safe trip!",
      },
      {
        pose: "holding a tiny phone receiver with a friendly approachable smile",
        poseZh: "举着电话微笑示意随时联系",
        variants: [
          { pose: "pointing cheerfully to a speech bubble icon welcoming messages", poseZh: "指着对话气泡欢迎随时敲我" },
          { pose: "waving warmly beside an open letter envelope", poseZh: "站在信封旁亲切挥手保持联系" },
        ],
        captionZh: "随时联系",
        captionEn: "Reach out!",
      },
    ],
  },
  {
    id: "office-worker",
    category: "work-study",
    nameZh: "打工人职场",
    nameEn: "Office Worker",
    descriptionZh: "收到、摸鱼、加班、下班啦，职场沟通必备",
    descriptionEn: "Workday moods: Noted, Coffee break, Overtime, Clocking out",
    emoji: "💼",
    slots: [
      {
        pose: "saluting politely with a professional smile",
        poseZh: "职业微笑敬礼收到",
        variants: [
          { pose: "tapping a clipboard with a pen giving a crisp thumbs up", poseZh: "轻敲文件夹笔杆利落比赞收到" },
          { pose: "giving a neat OK gesture while adjusting glasses professionally", poseZh: "扶眼镜比 OK 专业回复收到" },
        ],
        captionZh: "收到",
        captionEn: "Noted",
      },
      {
        pose: "sneakily relaxing behind a laptop sipping coffee",
        poseZh: "躲电脑后偷喝咖啡摸鱼",
        variants: [
          { pose: "lounging sideways in an office chair secretly scrolling a phone", poseZh: "歪靠办公椅偷偷刷手机摸鱼" },
          { pose: "holding a tiny fishing rod with a playful mischievous grin", poseZh: "举着迷你小鱼竿得意摸鱼" },
        ],
        captionZh: "摸鱼中",
        captionEn: "Slacking",
      },
      {
        pose: "typing frantically with dark circles under eyes",
        poseZh: "黑眼圈狂敲键盘加班",
        variants: [
          { pose: "hunched under a single desk lamp surrounded by tall stacks of papers", poseZh: "台灯下埋在成堆文件里苦战加班" },
          { pose: "staring intensely at a laptop with steam puffing from head", poseZh: "头顶冒烟死磕电脑疯狂赶工" },
        ],
        captionZh: "加班中",
        captionEn: "Overtime",
      },
      {
        pose: "running joyfully with bag flying in the air",
        poseZh: "拎包飞奔欢呼下班",
        variants: [
          { pose: "gliding out on a rolling office chair waving cheerfully", poseZh: "滑着办公椅潇洒挥手下班" },
          { pose: "punching a time clock with a huge celebratory fist pump", poseZh: "打卡机滴一声后握拳欢呼下班" },
        ],
        captionZh: "下班啦",
        captionEn: "Clocking out",
      },
      {
        pose: "melting into a puddle on the desk exhausted",
        poseZh: "累成一滩融化在桌上",
        variants: [
          { pose: "slumped backward with a glowing low-battery icon above head", poseZh: "电量告急瘫坐仰头生无可恋" },
          { pose: "lying flat on the floor with a tiny ghost floating out playfully", poseZh: "彻底躺平灵魂出窍喊太难了" },
        ],
        captionZh: "太难了",
        captionEn: "So tired",
      },
      {
        pose: "sipping iced Americano to stay awake",
        poseZh: "狂炫冰美式续命",
        variants: [
          { pose: "hugging an oversized coffee mug with eyes popping wide open", poseZh: "抱紧超大咖啡杯瞬间回血睁眼" },
          { pose: "charging up with lightning sparkles while drinking iced coffee", poseZh: "喝冰咖啡头顶冒充电闪电续命" },
        ],
        captionZh: "续命",
        captionEn: "Need coffee",
      },
      {
        pose: "cheering with sparkles holding a golden coin",
        poseZh: "捧着大金币闪亮欢呼",
        variants: [
          { pose: "hugging a plump piggy bank with starry excited eyes", poseZh: "星星眼抱紧鼓鼓的存钱罐" },
          { pose: "fanning out shiny banknotes with a thrilled grin", poseZh: "展开一叠闪亮钞票乐开花" },
        ],
        captionZh: "发工资",
        captionEn: "Payday!",
      },
      {
        pose: "holding head in dramatic panic",
        poseZh: "抱头崩溃尖叫",
        variants: [
          { pose: "waving both arms frantically as papers fly everywhere", poseZh: "文件满天飞手足无措抓狂" },
          { pose: "biting a handkerchief with comical waterfall tears", poseZh: "咬手帕夸张瀑布泪崩溃" },
        ],
        captionZh: "崩溃",
        captionEn: "SOS",
      },
      {
        pose: "pumping both fists determinedly",
        poseZh: "双手握拳元气加油",
        variants: [
          { pose: "tying a determined headband with fiery comic motivation", poseZh: "绑起必胜头带燃起斗志加油" },
          { pose: "cheering with tiny pom-poms and a bright encouraging smile", poseZh: "挥舞加油花球元气鼓劲" },
        ],
        captionZh: "加油",
        captionEn: "You got this",
      },
      {
        pose: "staring blankly at a glowing screen",
        poseZh: "面无表情盯屏幕",
        variants: [
          { pose: "peeking over a smartphone with deadpan flat eyes", poseZh: "举着手机露出一双平静死鱼眼" },
          { pose: "sipping tea calmly while glancing sideways at a phone notification", poseZh: "淡定喝茶斜眼瞥手机已读" },
        ],
        captionZh: "已读",
        captionEn: "Seen",
      },
      {
        pose: "bowing politely apologizing",
        poseZh: "礼貌鞠躬感谢配合",
        variants: [
          { pose: "handing over a warm cup of tea with both hands and a gentle smile", poseZh: "双手奉上热茶暖心慰问辛苦" },
          { pose: "clapping softly with a warm appreciative smile and sparkles", poseZh: "微笑鼓掌暖心致敬辛苦付出" },
        ],
        captionZh: "辛苦了",
        captionEn: "Thank u",
      },
      {
        pose: "holding a meeting notebook nodding",
        poseZh: "捧笔记本当场点头开会",
        variants: [
          { pose: "wearing a headset microphone speaking attentively at a desk", poseZh: "戴耳麦专注语音连线开会" },
          { pose: "pointing at a tiny whiteboard chart explaining earnestly", poseZh: "指着迷你小白板认真讲解开会" },
        ],
        captionZh: "开会中",
        captionEn: "In a call",
      },
      {
        pose: "giving a double thumbs up approvingly",
        poseZh: "双手点赞狂夸大气",
        variants: [
          { pose: "bowing admiringly with sparkling starry eyes and applause", poseZh: "星星眼鼓掌佩服老板大气" },
          { pose: "holding up a tiny golden crown with a beaming grin", poseZh: "双手奉上小皇冠疯狂彩虹屁" },
        ],
        captionZh: "老板大气",
        captionEn: "Awesome",
      },
      {
        pose: "looking at a watch impatiently",
        poseZh: "焦急看表疯狂催促",
        variants: [
          { pose: "running in place with sweat drops and a tiny hourglass", poseZh: "抱着小沙漏满头大汗狂奔赶进度" },
          { pose: "gesturing eagerly with one finger raised signaling almost done", poseZh: "举起一根手指满头汗示意马上就好" },
        ],
        captionZh: "快了快了",
        captionEn: "Almost",
      },
      {
        pose: "celebrating Friday with confetti",
        poseZh: "撒礼花庆祝周五",
        variants: [
          { pose: "doing a happy groove dance with floating music notes", poseZh: "伴着音符欢乐摇摆迎接周五" },
          { pose: "tearing off a calendar page joyfully with sparkling stars", poseZh: "开心撕下日历欢呼周五到来" },
        ],
        captionZh: "周五快乐",
        captionEn: "TGIF!",
      },
      {
        pose: "carrying a tiny white flag surrendering",
        poseZh: "举起小白旗求放过",
        variants: [
          { pose: "kneeling dramatically with hands clasped pleading mercy", poseZh: "双手合十夸张求饶放过我" },
          { pose: "hiding inside a cardboard box peeking out nervously", poseZh: "躲进纸箱探头瑟瑟发抖求饶" },
        ],
        captionZh: "饶了我",
        captionEn: "Mercy",
      },
    ],
  },
  {
    id: "student-study",
    category: "work-study",
    nameZh: "校园考研",
    nameEn: "Student & Exam",
    descriptionZh: "早八困死、逢考必过、考神附体、冲刺上岸，学生党日常",
    descriptionEn: "Campus & exam vibes: 8AM class, Ace exams, Cramming, Break time",
    emoji: "📚",
    slots: [
      {
        pose: "dragging backpack along barely awake with drooping sleepy eyes",
        poseZh: "背书包眼神迷离强撑赶早八",
        variants: [
          { pose: "slumped onto a classroom desk yawning huge with dizzy morning swirl", poseZh: "趴在课桌打哈欠灵魂未醒" },
          { pose: "clutching an alarm clock half-asleep swaying sleepily", poseZh: "抱紧闹钟摇摇晃晃勉强睁眼" },
        ],
        captionZh: "早八困死",
        captionEn: "8AM zombie",
      },
      {
        pose: "wearing glasses buried in tall stacks of open textbooks diligently",
        poseZh: "戴眼镜埋头书海认真啃书",
        variants: [
          { pose: "scribbling fast in a notebook surrounded by focused starry sparkles", poseZh: "奋笔疾书刷题状态拉满" },
          { pose: "hugging a thick textbook proudly with bright determined eyes", poseZh: "抱紧厚书本眼神坚定爱学习" },
        ],
        captionZh: "沉迷学习",
        captionEn: "Study mode",
      },
      {
        pose: "holding up an oversized shiny 100-score exam paper triumphantly",
        poseZh: "高举满分试卷自信欢呼必过",
        variants: [
          { pose: "leaping cheerfully beneath a golden lucky pass banner", poseZh: "在必过锦旗下一跃欢呼" },
          { pose: "hugging a lucky golden koi charm with confident victory grin", poseZh: "抱锦鲤护符信心满满必过" },
        ],
        captionZh: "逢考必过",
        captionEn: "Pass all!",
      },
      {
        pose: "staring blankly at an open book with smoke puffing out of ears",
        poseZh: "盯书发呆CPU冒烟直接宕机",
        variants: [
          { pose: "tangling hair in confusion surrounded by floating math symbols", poseZh: "被公式绕晕抱头大脑当机" },
          { pose: "blank loading bar floating over head with vacant wide eyes", poseZh: "眼神放空头顶弹出加载进度条" },
        ],
        captionZh: "脑子宕机",
        captionEn: "Brain fog",
      },
      {
        pose: "waving a bright yellow highlighter marker excitedly pointing at notes",
        poseZh: "高举荧光笔激动标记重点",
        variants: [
          { pose: "pointing sharply at a tiny chalkboard diagram with a knowing wink", poseZh: "敲黑板认真示意这里考重点" },
          { pose: "shining a miniature flashlight onto a crisp textbook page", poseZh: "拿小手电照亮核心必考考点" },
        ],
        captionZh: "划重点",
        captionEn: "Key point!",
      },
      {
        pose: "peeking sideways holding out an empty notebook pleading sweetly",
        poseZh: "探头递出空白本子求借笔记",
        variants: [
          { pose: "clasping hands excitedly leaning toward a classmate's neat notes", poseZh: "星星眼合十求大佬分享作业" },
          { pose: "copying wildly with pencil flying and comical sweat drops", poseZh: "满头大汗飞速抄笔记狂补中" },
        ],
        captionZh: "抄作业",
        captionEn: "Notes pls!",
      },
      {
        pose: "glowing in golden aura palms pressed together praying for exam luck",
        poseZh: "周身冒金光双手合十拜考神",
        variants: [
          { pose: "holding a glowing pencil like a magic wand surrounded by lucky stars", poseZh: "高举幸运神笔星光附体必胜" },
          { pose: "wearing a cute graduation cap halo beaming serenely", poseZh: "头顶考神光环淡定稳稳拿捏" },
        ],
        captionZh: "考神附体",
        captionEn: "Exam luck!",
      },
      {
        pose: "clutching forehead rolling back dramatically trying to memorize pages",
        poseZh: "扶额仰头痛苦默背记不住",
        variants: [
          { pose: "chasing floating alphabet letters escaping out of head", poseZh: "知识点长翅膀从脑瓜飞走" },
          { pose: "pacing back and forth holding flashcards with teary dizzy eyes", poseZh: "捧着背书卡片转圈眼泪汪汪" },
        ],
        captionZh: "背不下来",
        captionEn: "Can't recall",
      },
      {
        pose: "carrying a tote bag full of books waving quietly in greeting",
        poseZh: "拎帆布包抱书比嘘相约自习",
        variants: [
          { pose: "tiptoeing with a tiny reading lamp and stack of notebooks", poseZh: "抱着书和台灯轻手轻脚占座" },
          { pose: "waving gently from behind a study desk lamp smiling warmly", poseZh: "在台灯旁微笑招手图书馆见" },
        ],
        captionZh: "图书馆见",
        captionEn: "At library",
      },
      {
        pose: "staring desperately at a blinking laptop cursor hugging a pillow",
        poseZh: "盯着空白论文文档痛苦抓狂",
        variants: [
          { pose: "surrounded by crumpled draft papers tugging hair dramatically", poseZh: "满地废稿抱头哀嚎灵感呢" },
          { pose: "lying flat beside a glowing laptop begging for inspiration", poseZh: "瘫在电脑前合十求论文灵感" },
        ],
        captionZh: "论文难产",
        captionEn: "Thesis help",
      },
      {
        pose: "sprinting forward with a determined headband and fiery motivation",
        poseZh: "绑奋斗头带全力冲刺上岸",
        variants: [
          { pose: "leaping cheerfully onto a sunny shore waving a victory pennant", poseZh: "一跃登上阳光岸边举旗欢呼" },
          { pose: "pumping both fists hard beside a glowing countdown clock", poseZh: "握紧双拳倒计时全力冲刺" },
        ],
        captionZh: "冲刺上岸",
        captionEn: "Almost free!",
      },
      {
        pose: "tossing a backpack joyfully while skipping out the school gate",
        poseZh: "甩起书包开心蹦跳冲出校门",
        variants: [
          { pose: "waving happily as a dismissal bell rings with musical notes", poseZh: "伴着下课铃声挥手飞奔放学" },
          { pose: "jumping high with arms wide open cheering freedom", poseZh: "张开双臂高跳欢呼终于放学" },
        ],
        captionZh: "放学啦",
        captionEn: "School's out",
      },
      {
        pose: "polishing a giant sparkling golden A+ trophy proudly",
        poseZh: "得意擦亮闪闪发光 A+ 奖杯",
        variants: [
          { pose: "posing coolly holding an A+ report card with twinkling stars", poseZh: "自信亮出全优成绩单炫耀" },
          { pose: "doing a happy victory spin showered in gold stars", poseZh: "金色星星环绕开心庆祝满绩" },
        ],
        captionZh: "满绩点",
        captionEn: "Straight A!",
      },
      {
        pose: "waving a tiny SOS flag from under a mountain of books",
        poseZh: "被书山淹没伸手摇旗求救",
        variants: [
          { pose: "hanging onto a desk edge with giant comical waterfall tears", poseZh: "扒住桌沿大哭求救DDL要到啦" },
          { pose: "peeking out desperately from piles of sticky notes", poseZh: "从满桌便利贴里探头求拯救" },
        ],
        captionZh: "救救孩子",
        captionEn: "Save me!",
      },
      {
        pose: "dashing joyfully holding chopsticks and a lunch tray",
        poseZh: "举着餐盘筷子狂奔冲向食堂",
        variants: [
          { pose: "running excitedly with sparkling eyes toward a hot meal bowl", poseZh: "两眼放光飞奔直扑食堂干饭" },
          { pose: "clapping happily beside a steaming cafeteria bowl", poseZh: "对着热腾腾美食鼓掌开饭" },
        ],
        captionZh: "下课干饭",
        captionEn: "Lunch rush!",
      },
      {
        pose: "wearing sunglasses sipping a cold drink lounging in holiday bliss",
        poseZh: "戴墨镜喝冷饮躺享快乐假期",
        variants: [
          { pose: "throwing confetti joyfully around a cute rolling suitcase", poseZh: "拉起小行李箱撒花欢呼放假" },
          { pose: "bouncing happily on a comfy sofa hugging a plushie", poseZh: "扑上沙发抱玩偶尽情享受假期" },
        ],
        captionZh: "假期快乐",
        captionEn: "Break time!",
      },
    ],
  },
  {
    id: "gamer-squad",
    category: "work-study",
    nameZh: "游戏开黑",
    nameEn: "Gamer Squad",
    descriptionZh: "速来上号、大佬带飞、稳住能赢、有老六，开黑组队神表情",
    descriptionEn: "Co-op gaming moods: Queue up, Carry me, Hold on, GGWP",
    emoji: "🎮",
    slots: [
      {
        pose: "wearing a gaming headset waving a glowing controller excitedly",
        poseZh: "戴耳机高举手柄催促快上号",
        variants: [
          { pose: "beckoning urgently toward a glowing screen with starry eyes", poseZh: "盯着屏幕兴奋招手速来开黑" },
          { pose: "tapping a wristwatch eagerly while holding a phone sideways", poseZh: "横握手机急切敲表喊人上线" },
        ],
        captionZh: "速来上号",
        captionEn: "Hop on!",
      },
      {
        pose: "clinging adorably onto a giant flying rocket cheering with starry eyes",
        poseZh: "抱紧大佬大腿星星眼求带飞",
        variants: [
          { pose: "wearing tiny goggles waving cheers from a cozy sidecar", poseZh: "戴护目镜乖乖坐稳等大佬带飞" },
          { pose: "holding up a tiny pennant cheering on a champion with sparkles", poseZh: "挥舞小旗帜高喊大佬牛哇带我" },
        ],
        captionZh: "大佬带飞",
        captionEn: "Carry me!",
      },
      {
        pose: "gripping controller tightly with determined eyes and fiery aura",
        poseZh: "紧握手柄眼神专注燃起翻盘斗志",
        variants: [
          { pose: "making a steady calm hand gesture rallying teammates warmly", poseZh: "沉着挥手指挥大家稳住别浪" },
          { pose: "leaning forward intensely wearing a victory headband", poseZh: "绑头带全神贯注稳步推进能赢" },
        ],
        captionZh: "稳住能赢",
        captionEn: "We got this!",
      },
      {
        pose: "crawling dramatically on the ground waving a tiny medic cross sign",
        poseZh: "倒地挥舞急救牌疯狂呼救",
        variants: [
          { pose: "holding out both hands desperately with comical teary eyes", poseZh: "泪眼汪汪伸手求队友拉一把" },
          { pose: "peeking pitifully from behind a wooden crate waving SOS", poseZh: "躲在箱子后发抖比 SOS 求救" },
        ],
        captionZh: "救救我",
        captionEn: "Revive me!",
      },
      {
        pose: "blowing a tiny horn waving a rally banner calling everyone together",
        poseZh: "吹响号角挥旗召集全员开团",
        variants: [
          { pose: "pointing sharply forward with a glowing target marker", poseZh: "果断向前一指全队集合冲锋" },
          { pose: "slamming fist into palm enthusiastically ready for team fight", poseZh: "热血击掌全员集结准备打团" },
        ],
        captionZh: "集合打团",
        captionEn: "Group up!",
      },
      {
        pose: "wearing cool shades pulling off an epic dazzling combo with sparks",
        poseZh: "戴墨镜打出神级操作炫酷秀翻",
        variants: [
          { pose: "balancing a controller effortlessly on one finger looking smug", poseZh: "单指转手柄自信挑眉太秀了" },
          { pose: "striking a flashy hero pose amid lightning bolt highlights", poseZh: "闪电特效环绕摆出巅峰秀场姿" },
        ],
        captionZh: "这波秀翻",
        captionEn: "Pro play!",
      },
      {
        pose: "jumping startled pointing wildly behind at a suspicious bush",
        poseZh: "吓得跳起指着草丛大喊有老六",
        variants: [
          { pose: "peering nervously over shoulder gripping tiny binoculars", poseZh: "回头警觉张望小心有老六蹲点" },
          { pose: "holding up an exclamation warning sign sweating profusely", poseZh: "满头大汗举起感叹号警示危险" },
        ],
        captionZh: "有老六",
        captionEn: "Watch out!",
      },
      {
        pose: "tossing head back dramatically as comic cracks spread across screen",
        poseZh: "仰天崩溃整个人瞬间裂开",
        variants: [
          { pose: "holding controller upside down staring in utter stunned disbelief", poseZh: "倒拿手柄目瞪口呆心态崩了" },
          { pose: "slumping onto desk with dizzy spiral eyes and tiny lightning bolts", poseZh: "瘫倒桌上眼神转圈彻底破防" },
        ],
        captionZh: "我裂开了",
        captionEn: "Tilted!",
      },
      {
        pose: "shaking a tiny Wi-Fi router desperately with buffering icon overhead",
        poseZh: "疯狂摇晃路由器头顶转圈卡顿",
        variants: [
          { pose: "frozen mid-air with red 999ms ping warning icon", poseZh: "人物原地漂移头顶 999 延迟" },
          { pose: "tapping a blinking signal bar praying earnestly for connection", poseZh: "合手祈祷信号条快快变绿" },
        ],
        captionZh: "网卡了",
        captionEn: "Lagging!",
      },
      {
        pose: "holding up one eager index finger ready to queue right back up",
        poseZh: "举起一根手指不服再来一局",
        variants: [
          { pose: "pumping both fists enthusiastically beside a glowing rematch icon", poseZh: "眼神燃起斗志再开一盘冲分" },
          { pose: "nudging a controller forward begging playfully for one more round", poseZh: "递出手柄眨眼撒娇再来一把" },
        ],
        captionZh: "再来一局",
        captionEn: "One more!",
      },
      {
        pose: "leaping sky-high kissing a glowing golden MVP trophy",
        poseZh: "高高跃起庆祝绝杀翻盘赢了",
        variants: [
          { pose: "pumping both arms high amid celebratory pixel fireworks", poseZh: "欢呼跳起背后烟花绚烂赢啦" },
          { pose: "biting a shiny gold medal grinning victoriously", poseZh: "咬住金牌开心比耶强势拿捏" },
        ],
        captionZh: "绝杀赢了",
        captionEn: "Clutch win!",
      },
      {
        pose: "lounging comfortably sipping soda with feet up while victory shines",
        poseZh: "翘脚喝可乐轻松躺赢美滋滋",
        variants: [
          { pose: "chilling on a beanbag giving a lazy thumbs up as confetti falls", poseZh: "瘫在懒人沙发舒舒服服躺赢" },
          { pose: "smiling blissfully hugging a giant golden win star", poseZh: "闭眼满足抱紧胜利大星星" },
        ],
        captionZh: "躺赢真爽",
        captionEn: "Free win!",
      },
      {
        pose: "widening eyes in alarm waving frantically gesturing behind",
        poseZh: "瞳孔地震挥手急喊快看背后",
        variants: [
          { pose: "pointing urgently behind shoulder with huge sweat drops", poseZh: "满脸紧张指着身后大喊小心" },
          { pose: "shining a tiny flashlight backward in sudden alarm", poseZh: "猛回头举手电筒发现背后有人" },
        ],
        captionZh: "小心背后",
        captionEn: "Behind you!",
      },
      {
        pose: "bowing sheepishly rubbing back of head with awkward sweat drop",
        poseZh: "挠后脑勺流汗鞠躬抱歉失误",
        variants: [
          { pose: "clasping hands apologetically with cute puppy eyes", poseZh: "合十眨眼乖巧认错我的锅" },
          { pose: "hiding half of face behind controller blushing embarrassedly", poseZh: "躲在手柄后不好意思道歉" },
        ],
        captionZh: "抱歉失误",
        captionEn: "My bad!",
      },
      {
        pose: "offering a friendly fist bump with a satisfied cool smile",
        poseZh: "伸出拳头礼貌碰拳友好 GG",
        variants: [
          { pose: "tipping headphones politely with a crisp thumbs up", poseZh: "抬起耳机微笑比赞精彩对局" },
          { pose: "clapping cheerfully for a great match with sparkles", poseZh: "开心鼓掌致敬打得漂亮" },
        ],
        captionZh: "GG",
        captionEn: "GGWP!",
      },
      {
        pose: "taking off gaming headset yawning while waving goodnight",
        poseZh: "摘下耳机打哈欠挥手先撤睡了",
        variants: [
          { pose: "hugging a soft pillow waving softly beside a glowing moon", poseZh: "抱着枕头困倦挥手下线晚安" },
          { pose: "turning off controller button sleepily with floating Zzz", poseZh: "迷糊关掉手柄准备躺平睡觉" },
        ],
        captionZh: "先撤睡了",
        captionEn: "Logging off",
      },
    ],
  },
  {
    id: "couple-love",
    category: "relationships",
    nameZh: "情侣撒娇",
    nameEn: "Couple & Love",
    descriptionZh: "抱抱、贴贴、想你了、哼生气，甜甜的恋爱互动",
    descriptionEn: "Sweet romantic reactions: Hugs, Miss you, Pout, Kiss",
    emoji: "💕",
    slots: [
      {
        pose: "opening arms wide asking for a warm hug",
        poseZh: "张开双臂求温暖抱抱",
        variants: [
          { pose: "leaping forward with outstretched arms and joyful rosy cheeks", poseZh: "张开双臂飞扑过来求抱抱" },
          { pose: "tugging gently on an imaginary sleeve looking up sweetly for a hug", poseZh: "软萌抬头伸手撒娇求抱抱" },
        ],
        captionZh: "抱抱",
        captionEn: "Hug me",
      },
      {
        pose: "holding chin dreamily with floating pink hearts",
        poseZh: "托腮冒粉红泡泡想你",
        variants: [
          { pose: "hugging a phone close to chest with dreamy starry eyes", poseZh: "抱着手机贴胸口满眼思念" },
          { pose: "drawing tiny hearts in the air with a fingertip smiling softly", poseZh: "指尖在空中画小爱心想念你" },
        ],
        captionZh: "想你了",
        captionEn: "Miss u",
      },
      {
        pose: "snuggling cheek happily with sparkles",
        poseZh: "软萌贴脸撒娇",
        variants: [
          { pose: "leaning head playfully sideways with blissful closed eyes and hearts", poseZh: "歪头闭眼幸福蹭蹭求贴贴" },
          { pose: "curling up warmly hugging knees with rosy smiling cheeks", poseZh: "团成软萌一团脸红贴贴" },
        ],
        captionZh: "贴贴",
        captionEn: "Cuddle",
      },
      {
        pose: "pouting cheeks turning away playfully grumpy",
        poseZh: "鼓起腮帮傲娇转头",
        variants: [
          { pose: "crossing arms tightly with a cute puffy frown and tiny steam puff", poseZh: "双手抱胸鼓嘴头顶冒小蒸汽" },
          { pose: "stomping one foot playfully while glaring sideways with puffed cheeks", poseZh: "傲娇跺脚鼓腮斜眼哼一声" },
        ],
        captionZh: "哼！",
        captionEn: "Hmph!",
      },
      {
        pose: "blowing a sweet kiss with a flying heart",
        poseZh: "嘟嘴飞吻发射爱心",
        variants: [
          { pose: "leaning forward with puckered lips and sparkling pink hearts", poseZh: "前倾嘟嘴冒粉红爱心求亲亲" },
          { pose: "making a kissy face while winking playfully with a tiny heart mark", poseZh: "俏皮眨眼嘟嘴发射甜蜜亲亲" },
        ],
        captionZh: "亲亲",
        captionEn: "Mwah!",
      },
      {
        pose: "teary puppy eyes looking super cute and pitiful",
        poseZh: "泪眼汪汪委屈求哄",
        variants: [
          { pose: "squatting down drawing tiny circles on the ground sadly", poseZh: "蹲在地上画圈圈委屈巴巴" },
          { pose: "hugging a plush pillow tightly with quivering watery eyes", poseZh: "抱紧抱枕眼眶泛泪求安慰" },
        ],
        captionZh: "委屈",
        captionEn: "Pls...",
      },
      {
        pose: "sitting obediently with hands on lap smiling",
        poseZh: "手放膝盖乖巧坐好",
        variants: [
          { pose: "standing neatly at attention with a tiny halo and innocent smile", poseZh: "顶着小光环立正站好一脸乖巧" },
          { pose: "folding hands politely under chin blinking big sparkling eyes", poseZh: "双手托下巴眨大眼乖巧听话" },
        ],
        captionZh: "乖巧",
        captionEn: "Good kid",
      },
      {
        pose: "hugging a giant red heart joyfully",
        poseZh: "抱着超大红心满脸甜笑",
        variants: [
          { pose: "tossing a shower of little pink hearts happily into the air", poseZh: "开心抛撒漫天小爱心表白" },
          { pose: "holding up a glowing heart sign with both hands beaming", poseZh: "双手高举发光红心牌大声爱你" },
        ],
        captionZh: "爱你",
        captionEn: "Love you",
      },
      {
        pose: "tucked in a cozy blanket waving goodnight",
        poseZh: "裹着小被子挥手晚安",
        variants: [
          { pose: "blowing a sleepy goodnight kiss under a glowing crescent moon", poseZh: "在弯弯月牙下送出晚安飞吻" },
          { pose: "resting cheek on folded hands smiling softly with floating hearts", poseZh: "双手合枕垫在脸下甜甜道晚安" },
        ],
        captionZh: "晚安吻",
        captionEn: "Sweet dreams",
      },
      {
        pose: "blushing bright red covering face",
        poseZh: "脸红透捂住脸蛋",
        variants: [
          { pose: "fanning hot blushing cheeks with both hands flustered", poseZh: "双手给通红脸蛋扇风害羞冒烟" },
          { pose: "hiding behind a giant heart pillow peeking out shyly", poseZh: "躲在爱心抱枕后害羞偷瞄" },
        ],
        captionZh: "害羞啦",
        captionEn: "Blush",
      },
      {
        pose: "patting head gently comforting",
        poseZh: "温柔伸手摸摸头安慰",
        variants: [
          { pose: "reaching out warmly with a soft soothing smile and sparkles", poseZh: "温柔伸手轻抚散发治愈星光" },
          { pose: "giving a gentle thumbs up and soft warm smile of encouragement", poseZh: "眉眼弯弯温柔安抚摸摸头" },
        ],
        captionZh: "摸摸头",
        captionEn: "Pat pat",
      },
      {
        pose: "excitedly jumping with heart eyes",
        poseZh: "星星爱心眼开心蹦起",
        variants: [
          { pose: "clasping cheeks in total delight surrounded by floating hearts", poseZh: "双手捧脸满屏爱心超级喜欢" },
          { pose: "spinning happily with sparkles and heart-shaped pupils", poseZh: "爱心眼转圈圈开心到飞起" },
        ],
        captionZh: "超喜欢",
        captionEn: "Adore!",
      },
      {
        pose: "holding a tiny bouquet of roses",
        poseZh: "双手捧玫瑰花束递上",
        variants: [
          { pose: "offering a single bright blooming rose with a charming wink", poseZh: "眨眼递上一朵娇艳玫瑰花" },
          { pose: "peeking cheerfully from behind a lush bouquet of flowers", poseZh: "从大捧鲜花后探头笑盈盈送花" },
        ],
        captionZh: "送花花",
        captionEn: "For you",
      },
      {
        pose: "poking cheek playfully teasing",
        poseZh: "调皮伸手戳戳脸颊",
        variants: [
          { pose: "leaning in mischievously reaching one finger forward to poke", poseZh: "探身坏笑伸出一根手指戳戳" },
          { pose: "tapping playfully with both index fingers and a cheeky grin", poseZh: "调皮伸手连戳两下求注意" },
        ],
        captionZh: "戳戳",
        captionEn: "Poke",
      },
      {
        pose: "holding a little fork waiting for dinner",
        poseZh: "拿小叉子等开饭",
        variants: [
          { pose: "holding chopsticks expectantly with a tiny drool sparkle", poseZh: "举着小筷子眼巴巴等投喂" },
          { pose: "wearing a cute bib tapping an empty plate eagerly", poseZh: "戴小围兜敲空盘子催问吃啥" },
        ],
        captionZh: "吃啥呀",
        captionEn: "Dinner?",
      },
      {
        pose: "making a pinky promise gesture",
        poseZh: "伸出小拇指拉钩约定",
        variants: [
          { pose: "holding up a pinky finger with a sparkling ribbon tied around it", poseZh: "系着小红绳伸出小指认真拉钩" },
          { pose: "leaning forward extending pinky finger with a determined sweet smile", poseZh: "前倾伸出小指甜笑约定拉钩" },
        ],
        captionZh: "拉钩",
        captionEn: "Promise",
      },
    ],
  },
  {
    id: "bestie-vibes",
    category: "relationships",
    nameZh: "闺蜜损友",
    nameEn: "Besties & Banter",
    descriptionZh: "有瓜快说、走去逛街、就这？、天下第一好，闺蜜损友互怼贴贴",
    descriptionEn: "Bestie chat & banter: Spill tea, Shopping!, Seriously?, Love ya",
    emoji: "💅",
    slots: [
      {
        pose: "rushing in arms open wide for a joyful squealing hug",
        poseZh: "张开双臂冲过来闺蜜大贴贴",
        variants: [
          { pose: "leaning cheek sideways happily blowing pink sparkles", poseZh: "歪头撒娇求贴贴冒粉红泡泡" },
          { pose: "hugging a plush heart cushion jumping cheerfully", poseZh: "抱紧软萌爱心开心蹦跳贴贴" },
        ],
        captionZh: "姐妹贴贴",
        captionEn: "Bestie hug!",
      },
      {
        pose: "cupping hands around ear leaning forward with giant gossip eyes",
        poseZh: "手放耳边眼神发光快讲八卦",
        variants: [
          { pose: "holding a steaming teacup leaning closer excitedly", poseZh: "端起茶杯前倾兴奋催促吃瓜" },
          { pose: "perking up eagerly holding a tiny note pad and pen", poseZh: "掏出小本本坐等绝密八卦" },
        ],
        captionZh: "有瓜快说",
        captionEn: "Spill it!",
      },
      {
        pose: "throwing sparkling stars with jaw dropped in genuine admiration",
        poseZh: "眼睛冒星星惊叹也太美了吧",
        variants: [
          { pose: "clapping excitedly surrounded by pink sparkles and flowers", poseZh: "花瓣星星环绕疯狂鼓掌夸美" },
          { pose: "giving an emphatic double thumbs up looking dazzled", poseZh: "双手比赞被美貌狠狠惊艳" },
        ],
        captionZh: "美爆了",
        captionEn: "Gorgeous!",
      },
      {
        pose: "skipping happily carrying colorful shopping bags on arm",
        poseZh: "胳膊挎满购物袋开心相约逛街",
        variants: [
          { pose: "putting on chic sunglasses excitedly gesturing to go out", poseZh: "戴酷炫墨镜挥手喊姐妹出门逛街" },
          { pose: "holding a cute mini purse bouncing excitedly on tiptoes", poseZh: "拎起小包包迫不及待去扫货" },
        ],
        captionZh: "走去逛街",
        captionEn: "Let's shop!",
      },
      {
        pose: "pointing decisively at something cute shouting buy it now",
        poseZh: "眼神坚定指向前方大喊买它",
        variants: [
          { pose: "waving a shiny card gleefully encouraging a treat", poseZh: "晃着卡片兴高采烈疯狂种草" },
          { pose: "nodding vigorously with starry eyes cheering on shopping", poseZh: "星星眼猛点头支持拿下必须买" },
        ],
        captionZh: "买它买它",
        captionEn: "Buy it!",
      },
      {
        pose: "flipping hair dramatically with a tiny sparkling princess crown",
        poseZh: "甩起秀发戴皇冠谁还不是小公举",
        variants: [
          { pose: "winking playfully holding a tiny handheld vanity mirror", poseZh: "照着小镜子自信眨眼美滋滋" },
          { pose: "striking a sassy runway pose with confident grin", poseZh: "叉腰摆出 T 台名模自信气场" },
        ],
        captionZh: "谁还不是",
        captionEn: "Fabulous!",
      },
      {
        pose: "making a cheerful V-sign beside face snapping a cute selfie",
        poseZh: "比耶歪头举手机自拍打卡",
        variants: [
          { pose: "holding up a tiny retro camera flashing a bright wink", poseZh: "举起小相机闪耀眨眼拍美照" },
          { pose: "pouting playfully while framing face with both hands", poseZh: "双手捧脸摆出绝佳拍照角度" },
        ],
        captionZh: "拍照打卡",
        captionEn: "Selfie time",
      },
      {
        pose: "raising a cute boba cup winking invitingly for a hangout",
        poseZh: "举起奶茶眨眼邀请今晚聚聚",
        variants: [
          { pose: "tapping phone playfully with hopeful sparkling eyes", poseZh: "点着手机眼神期待晚上约饭" },
          { pose: "doing a little dance waving both hands joyfully", poseZh: "欢快挥手邀请晚上出来嗨" },
        ],
        captionZh: "今晚聚聚",
        captionEn: "Hang out?",
      },
      {
        pose: "raising one eyebrow tilting head with unimpressed sassy smirk",
        poseZh: "挑眉斜眼一脸不屑就这？",
        variants: [
          { pose: "sipping iced drink calmly peering over tiny sunglasses", poseZh: "推下墨镜淡定吐槽就这水平" },
          { pose: "folding arms casually with a teasing playful side-eye", poseZh: "抱臂斜视露出损友式嘲笑" },
        ],
        captionZh: "就这？",
        captionEn: "Seriously?",
      },
      {
        pose: "resting chin on palm watching calmly with deadpan amused smile",
        poseZh: "单手托腮微笑静静看你表演",
        variants: [
          { pose: "sitting on a tiny stool munching popcorn quietly observing", poseZh: "坐着捧爆米花安静看你秀操作" },
          { pose: "clapping slowly with an amused unbothered expression", poseZh: "面无表情鼓掌静静看你发挥" },
        ],
        captionZh: "静静看你",
        captionEn: "Watching u",
      },
      {
        pose: "doubling over holding belly laughing till tears burst out",
        poseZh: "捂着肚子狂拍大腿笑死我了",
        variants: [
          { pose: "pointing and laughing uncontrollably wiping away joy tears", poseZh: "指着哈哈大笑眼泪都飙出来" },
          { pose: "leaning back roaring with laughter kicking feet in air", poseZh: "仰头狂笑到脚丫离地停不下来" },
        ],
        captionZh: "笑死我了",
        captionEn: "Dying LOL",
      },
      {
        pose: "nodding super fast pointing emphatically agreeing completely",
        poseZh: "疯狂点头指认狠狠共鸣了",
        variants: [
          { pose: "clutching chest dramatically touched by total relatability", poseZh: "捂住心口仿佛被说中狠狠共鸣" },
          { pose: "slapping table approvingly with huge excited eyes", poseZh: "拍桌叫绝表示太真实了我也是" },
        ],
        captionZh: "狠狠共鸣",
        captionEn: "So true!",
      },
      {
        pose: "gently patting air with a warm tissue offering sunny comfort",
        poseZh: "伸手递纸巾温暖安抚别 emo",
        variants: [
          { pose: "holding out a sweet lollipop with a cheerful comforting wink", poseZh: "递上一颗糖果暖心哄人开心" },
          { pose: "wrapping arms warmly as if giving a cozy pep-talk hug", poseZh: "张手送上治愈拥抱赶走坏心情" },
        ],
        captionZh: "别emo了",
        captionEn: "Cheer up!",
      },
      {
        pose: "biting a handkerchief with comical jelly tears of playful envy",
        poseZh: "咬小手帕眼含柠檬酸哭羡慕",
        variants: [
          { pose: "holding a tiny bright yellow lemon smiling with funny envy", poseZh: "抱大柠檬委屈巴巴羡慕哭了" },
          { pose: "staring with huge sparkling teary eyes clapping enviously", poseZh: "满眼泪光热烈鼓掌酸成柠檬精" },
        ],
        captionZh: "羡慕哭了",
        captionEn: "So jelly!",
      },
      {
        pose: "pumping both fists forward with fiery cheerleader energy",
        poseZh: "挥舞双拳元气助威冲冲冲",
        variants: [
          { pose: "waving bright pom-poms enthusiastically cheering you on", poseZh: "摇起拉拉队花球全力加油冲" },
          { pose: "pointing forward heroically wearing a cute star headband", poseZh: "热血指向前方陪你一起冲冲冲" },
        ],
        captionZh: "冲冲冲",
        captionEn: "Let's go!",
      },
      {
        pose: "making a giant heart with both arms beaming with warm stars",
        poseZh: "高举双臂比大心天下第一好",
        variants: [
          { pose: "holding up a golden Bestie #1 trophy with proud grin", poseZh: "举起第一闺蜜奖杯骄傲表白" },
          { pose: "throwing pink hearts joyfully winking affectionately", poseZh: "撒出满屏小心心表白最好朋友" },
        ],
        captionZh: "天下第一好",
        captionEn: "Besties 4eva",
      },
    ],
  },
  {
    id: "cute-pet",
    category: "relationships",
    nameZh: "萌宠日常",
    nameEn: "Cute Pet",
    descriptionZh: "干饭、暗中观察、求摸摸、委屈巴巴，毛孩子专属",
    descriptionEn: "Playful pet moods: Feeding time, Peeking, Belly rubs, Sleepy",
    emoji: "🐾",
    slots: [
      {
        pose: "holding a food bowl excitedly with starry eyes",
        poseZh: "眼睛发光端碗等干饭",
        variants: [
          { pose: "digging eagerly into a brimming pet bowl with happy sparkles", poseZh: "埋头大口炫饭幸福冒星星" },
          { pose: "bouncing beside a snack bowl gripping a tiny spoon eagerly", poseZh: "举着小勺子在饭碗旁激动蹦跳" },
        ],
        captionZh: "干饭啦",
        captionEn: "Food!",
      },
      {
        pose: "peeking stealthily from behind a wall",
        poseZh: "躲在墙角探头暗中观察",
        variants: [
          { pose: "peering out from inside a cardboard box with wide curious eyes", poseZh: "躲进纸箱露出一双大眼偷看" },
          { pose: "holding tiny toy binoculars squinting stealthily", poseZh: "举起迷你望远镜认真暗中观察" },
        ],
        captionZh: "暗中观察",
        captionEn: "Watching",
      },
      {
        pose: "rolling over playfully asking for belly rubs",
        poseZh: "翻身露肚皮求摸摸",
        variants: [
          { pose: "nuzzling head forward eagerly with happy squinting eyes", poseZh: "主动凑近脑袋眯眼蹭蹭求撸" },
          { pose: "sitting up pawing the air gently asking for pets", poseZh: "直起身子挥挥小爪求摸摸" },
        ],
        captionZh: "求摸摸",
        captionEn: "Pet me",
      },
      {
        pose: "curled up sleeping peacefully with bubble",
        poseZh: "蜷成一团吹鼻涕泡睡觉",
        variants: [
          { pose: "drooping eyelids while nodding off sitting upright with Zzz", poseZh: "坐着打瞌睡小脑袋一点一点" },
          { pose: "sprawled flat on a soft cushion yawning sleepily", poseZh: "摊在软垫上打哈欠困到迷糊" },
        ],
        captionZh: "困了",
        captionEn: "Sleepy",
      },
      {
        pose: "eyes wide open in dramatic shock, fur puffed up",
        poseZh: "炸毛瞪大眼满脸震惊",
        variants: [
          { pose: "leaping high into the air startled with comic shock lines", poseZh: "吓到原地弹起浑身炸毛" },
          { pose: "freezing stiff with jaw dropped and ears perked straight up", poseZh: "耳朵竖直僵在原地目瞪口呆" },
        ],
        captionZh: "震惊",
        captionEn: "What?!",
      },
      {
        pose: "blank deadpan stare looking unimpressed",
        poseZh: "生无可恋死鱼眼无语",
        variants: [
          { pose: "lying flat on belly sighing with half-lidded bored eyes", poseZh: "趴地叹气翻白眼一脸无语" },
          { pose: "tilting head slightly with a flat unamused poker face", poseZh: "微微歪头露出冷漠无语表情" },
        ],
        captionZh: "无语",
        captionEn: "Bruh",
      },
      {
        pose: "spinning happily with little paw prints around",
        poseZh: "围着小爪印开心转圈",
        variants: [
          { pose: "bouncing joyfully with wagging energy and floating sparkles", poseZh: "原地撒欢蹦跳周围冒星光" },
          { pose: "beaming brightly throwing both front paws up in pure joy", poseZh: "高举两只小前爪乐开花" },
        ],
        captionZh: "开心",
        captionEn: "Happy!",
      },
      {
        pose: "big watery eyes looking innocent and pitiful",
        poseZh: "大水汪汪眼委屈装无辜",
        variants: [
          { pose: "drooping ears low while hugging tail timidly", poseZh: "耳朵耷拉抱紧尾巴委屈巴巴" },
          { pose: "holding up an empty treat bowl with quivering teary eyes", poseZh: "端着空零食碗泪眼汪汪求投喂" },
        ],
        captionZh: "委屈巴巴",
        captionEn: "Sadge",
      },
      {
        pose: "wearing tiny cool sunglasses looking smug",
        poseZh: "戴酷炫小墨镜一脸得意",
        variants: [
          { pose: "crossing front paws proudly with chin tilted up smugly", poseZh: "抬起下巴抱爪一脸傲娇得意" },
          { pose: "winking confidently while striking a superstar pose with sparkles", poseZh: "闪亮眨眼摆出巨星得意姿势" },
        ],
        captionZh: "得意",
        captionEn: "Cool",
      },
      {
        pose: "chasing a tiny sparkling butterfly",
        poseZh: "扑腾爪子追小蝴蝶",
        variants: [
          { pose: "bouncing playfully on a colorful yarn ball", poseZh: "扑着彩色毛线球撒欢玩耍" },
          { pose: "pouncing playfully with a bouncy toy ball in the air", poseZh: "欢快扑跳接住弹跳小皮球" },
        ],
        captionZh: "玩耍",
        captionEn: "Play!",
      },
      {
        pose: "hiding ears shyly looking guilty",
        poseZh: "心虚捂住耳朵装傻",
        variants: [
          { pose: "whistling innocently looking away beside a tiny knocked-over cup", poseZh: "翻倒杯子旁眼神躲闪吹口哨装傻" },
          { pose: "covering eyes with both paws pretending to be invisible", poseZh: "双爪捂眼掩耳盗铃装不是我" },
        ],
        captionZh: "不是我",
        captionEn: "Wasn't me",
      },
      {
        pose: "giving a cute high-five with paw",
        poseZh: "伸出毛茸茸小爪击掌",
        variants: [
          { pose: "leaping cheerfully to slap both front paws forward", poseZh: "开心跳起双爪向前击掌" },
          { pose: "offering a friendly paw fist-bump with a proud grin", poseZh: "笑眯眯伸出毛绒小爪碰拳击掌" },
        ],
        captionZh: "击掌",
        captionEn: "High 5",
      },
      {
        pose: "yawning super wide stretching paws",
        poseZh: "张大嘴伸长爪子伸懒腰",
        variants: [
          { pose: "arching back in a big satisfying yoga stretch with sparkles", poseZh: "弓起小背舒舒服服大伸懒腰" },
          { pose: "stretching both front paws high overhead happily", poseZh: "举高两只前爪畅快伸展" },
        ],
        captionZh: "伸懒腰",
        captionEn: "Stretch",
      },
      {
        pose: "sniffing curiously with nose twitching",
        poseZh: "凑近好奇嗅一嗅",
        variants: [
          { pose: "poking nose close to a tiny blooming daisy curiously", poseZh: "凑近小雏菊好奇闻一闻" },
          { pose: "leaning forward sniffing the air with perked-up ears", poseZh: "竖起耳朵探头仔细闻空气" },
        ],
        captionZh: "闻闻",
        captionEn: "Sniff",
      },
      {
        pose: "proudly sitting like a loaf",
        poseZh: "揣手手乖巧面包蹲",
        variants: [
          { pose: "sitting upright neatly with tail curled cleanly around paws", poseZh: "尾巴绕脚端正乖巧坐好" },
          { pose: "perched neatly on a tiny round rug smiling politely", poseZh: "端坐在小圆垫上礼貌微笑" },
        ],
        captionZh: "乖乖坐好",
        captionEn: "Loaf",
      },
      {
        pose: "hugging a favorite plush toy",
        poseZh: "抱着最爱的毛绒玩具贴贴",
        variants: [
          { pose: "burrowing happily inside a fluffy blanket with rosy cheeks", poseZh: "钻进软软小毛毯幸福贴贴" },
          { pose: "rubbing cheek lovingly against a soft heart pillow", poseZh: "拿小脸蛋蹭着爱心枕头撒娇" },
        ],
        captionZh: "贴贴",
        captionEn: "Cozy",
      },
    ],
  },
  {
    id: "foodie-life",
    category: "lifestyle",
    nameZh: "吃货干饭",
    nameEn: "Foodie & Boba",
    descriptionZh: "干饭时间、奶茶续命、真香、宵夜走起，吃货专属快乐",
    descriptionEn: "Foodie joys: Meal time, Boba boost, So yummy, Midnight bite",
    emoji: "🧋",
    slots: [
      {
        pose: "holding a pair of chopsticks and a big rice bowl ready to feast",
        poseZh: "端起大饭碗敲筷子准备干饭",
        variants: [
          { pose: "wearing a cute bib tapping table eagerly with spoon and fork", poseZh: "戴好小围兜举叉勺坐等开饭" },
          { pose: "bouncing cheerfully beside a steaming delicious meal", poseZh: "对着喷香美食两眼放光开炫" },
        ],
        captionZh: "干饭时间",
        captionEn: "Meal time!",
      },
      {
        pose: "hugging a jumbo cup of boba milk tea sipping happily",
        poseZh: "抱紧超大杯珍珠奶茶疯狂续命",
        variants: [
          { pose: "holding two cups of iced milk tea with sparkling energized eyes", poseZh: "左右手各一杯奶茶瞬间回血" },
          { pose: "sucking boba pearls gleefully with rosy blissful cheeks", poseZh: "大口吸珍珠满足到脸颊泛红" },
        ],
        captionZh: "奶茶续命",
        captionEn: "Boba boost!",
      },
      {
        pose: "tilting head rubbing chin surrounded by floating food bubbles",
        poseZh: "托腮思考脑海飘满美食纠结吃啥",
        variants: [
          { pose: "peering at a colorful restaurant menu with curious eyes", poseZh: "捧着菜单认真纠结今晚吃啥" },
          { pose: "holding fork and spoon looking around excitedly for dinner", poseZh: "举着刀叉眼巴巴求推荐晚餐" },
        ],
        captionZh: "今晚吃啥",
        captionEn: "What to eat?",
      },
      {
        pose: "eyes sparkling blissfully hugging cheeks beside steaming aroma",
        poseZh: "捂住脸颊幸福冒花惊呼真香",
        variants: [
          { pose: "giving a huge thumbs up while savoring a delicious bite", poseZh: "一口咬下眼睛发光狂比赞真香" },
          { pose: "floating blissfully with heart eyes over delicious scent", poseZh: "被香味迷倒飘起来大呼真香" },
        ],
        captionZh: "真香",
        captionEn: "So yummy!",
      },
      {
        pose: "rubbing an empty growling belly sitting slumped weakly",
        poseZh: "摸着扁扁肚子有气无力求投喂",
        variants: [
          { pose: "biting an empty spoon looking dizzy and dramatically starved", poseZh: "啃着空勺子饿到两眼冒金星" },
          { pose: "lying flat beside an empty plate staring sadly", poseZh: "趴在空盘子旁委屈巴巴饿扁了" },
        ],
        captionZh: "饿扁了",
        captionEn: "Starving!",
      },
      {
        pose: "sneaking out at midnight carrying skewers under a glowing moon",
        poseZh: "月牙下兴奋举起烤串宵夜走起",
        variants: [
          { pose: "holding a steaming bowl of late-night ramen grinning mischievously", poseZh: "端着热腾腾夜宵泡面偷笑开吃" },
          { pose: "beckoning cheerfully beside grilled skewers and cold soda", poseZh: "挥手招呼一起去撸串吃宵夜" },
        ],
        captionZh: "宵夜走起",
        captionEn: "Late snack!",
      },
      {
        pose: "pushing away a tiny scale happily while holding a tasty snack",
        poseZh: "一脚踢开体重秤抱紧零食明天再减",
        variants: [
          { pose: "winking cheekily while taking a big bite of frosted cake", poseZh: "俏皮眨眼大口吃蛋糕减肥明天再说" },
          { pose: "covering eyes from a weighing scale hugging fried chicken", poseZh: "蒙眼不看秤怀里抱紧炸鸡" },
        ],
        captionZh: "明天再减",
        captionEn: "Diet tmrw",
      },
      {
        pose: "pressing face eagerly with huge shiny eyes and comical drool",
        poseZh: "瞪大眼睛擦口水馋哭了",
        variants: [
          { pose: "staring mesmerized at floating aroma swirls waving hands", poseZh: "望着美食飘香流口水挪不开眼" },
          { pose: "clasping hands excitedly with twinkling hungry eyes", poseZh: "双手合十咽口水眼巴巴想吃" },
        ],
        captionZh: "馋哭了",
        captionEn: "Drooling!",
      },
      {
        pose: "lifting chopsticks happily above a bubbling spicy hotpot",
        poseZh: "举着筷子守在咕嘟火锅旁开涮",
        variants: [
          { pose: "clinking chopsticks cheerfully with big rosy happy cheeks", poseZh: "举筷欢呼热热闹闹约火锅局" },
          { pose: "holding a tiny slotted spoon scooping goodies gleefully", poseZh: "拿小漏勺开心捞火锅好料" },
        ],
        captionZh: "火锅局",
        captionEn: "Hotpot time!",
      },
      {
        pose: "patting round happy tummy holding up a sparkling clean empty bowl",
        poseZh: "摸圆滚滚肚皮炫完干净光盘",
        variants: [
          { pose: "raising both chopsticks victoriously beside spotless bowls", poseZh: "举起筷子骄傲展示光盘战绩" },
          { pose: "burping happily with rosy cheeks and satisfied smile", poseZh: "心满意足擦嘴全炫光啦" },
        ],
        captionZh: "炫完啦",
        captionEn: "Clean plate!",
      },
      {
        pose: "holding a warm latte cup enjoying cozy coffee aroma",
        poseZh: "手捧热拿铁享受香浓咖啡时光",
        variants: [
          { pose: "clinking two iced coffee cups cheerfully with a wink", poseZh: "举冰咖眨眼邀请一起喝咖啡" },
          { pose: "hugging an oversized coffee mug smiling serenely", poseZh: "抱着大咖啡杯惬意提神醒脑" },
        ],
        captionZh: "来杯咖啡",
        captionEn: "Coffee time",
      },
      {
        pose: "hugging a giant strawberry cupcake surrounded by pastel hearts",
        poseZh: "抱紧草莓小蛋糕瞬间甜品治愈",
        variants: [
          { pose: "holding an ice cream cone grinning in pure sweet bliss", poseZh: "举着冰淇淋甜笑烦恼全飞走" },
          { pose: "eating a tiny macaron with floating pink sugar stars", poseZh: "捧着甜点小口品尝幸福冒泡" },
        ],
        captionZh: "甜品治愈",
        captionEn: "Sweet treat!",
      },
      {
        pose: "opening mouth wide pointing with hopeful puppy eyes waiting",
        poseZh: "张大嘴巴指着嘴边等投喂",
        variants: [
          { pose: "holding out a tiny empty snack bowl pleading adorably", poseZh: "双手递出小碗委屈巴巴求投喂" },
          { pose: "peeking eagerly from table edge waving a mini fork", poseZh: "扒在桌边摇晃小叉子求喂食" },
        ],
        captionZh: "投喂一下",
        captionEn: "Feed me!",
      },
      {
        pose: "tapping chest generously waving a golden treat card with grin",
        poseZh: "豪爽拍胸脯挥卡这顿我请客",
        variants: [
          { pose: "pushing a giant yummy platter forward welcoming everyone", poseZh: "大方端出美食拼盘开心请客" },
          { pose: "winking confidently holding up a dinner receipt smiling", poseZh: "自信眨眼买单表示今天我请客" },
        ],
        captionZh: "请客啦",
        captionEn: "My treat!",
      },
      {
        pose: "pinching fingers together cautiously with cute nervous sweat drop",
        poseZh: "两指比出一点点微辣就行",
        variants: [
          { pose: "fanning tongue lightly while holding a tiny chili pepper", poseZh: "举着小辣椒小心示意微辣足矣" },
          { pose: "smiling politely holding up one tiny droplet sign", poseZh: "微笑比出一丁点手势坚信微辣" },
        ],
        captionZh: "微辣就行",
        captionEn: "Mild spicy",
      },
      {
        pose: "leaning back blissfully rubbing full belly with sleepy half eyes",
        poseZh: "吃饱摸肚子眯眼犯困晕碳了",
        variants: [
          { pose: "yawning peacefully beside an empty plate with floating Zzz", poseZh: "吃完打哈欠幸福犯困想睡觉" },
          { pose: "sprawled cozily on a cushion smiling full and sleepy", poseZh: "瘫在软垫上吃饱喝足犯懒" },
        ],
        captionZh: "吃饱犯困",
        captionEn: "Food coma",
      },
    ],
  },
  {
    id: "chill-sloth",
    category: "lifestyle",
    nameZh: "佛系摆烂",
    nameEn: "Chill & Sloth",
    descriptionZh: "彻底躺平、随缘吧、电量1%、拒绝内耗，慢生活治愈系",
    descriptionEn: "Cozy chill vibes: Couch mode, Whatever, 1% battery, Do nothing",
    emoji: "🛋️",
    slots: [
      {
        pose: "sprawled completely flat across a soft fluffy sofa peacefully",
        poseZh: "彻底瘫平在柔软沙发上一动不动",
        variants: [
          { pose: "melting comfortably into a round floor cushion smiling calmly", poseZh: "融化在懒人坐垫里安详躺平" },
          { pose: "lying flat on back staring peacefully at ceiling stars", poseZh: "四仰八叉躺平放空无比惬意" },
        ],
        captionZh: "彻底躺平",
        captionEn: "Couch mode",
      },
      {
        pose: "shrugging gently with calm zen smile and floating autumn leaf",
        poseZh: "淡然耸肩微笑一切随缘吧",
        variants: [
          { pose: "sitting cross-legged meditating calmly with serene halo", poseZh: "盘腿打坐佛系微笑随缘就好" },
          { pose: "sipping warm tea serenely unbothered by anything", poseZh: "淡定端茶微笑顺其自然随缘" },
        ],
        captionZh: "随缘吧",
        captionEn: "Let it be",
      },
      {
        pose: "slumped forward hugging knees with blinking 1% red battery icon",
        poseZh: "缩成一团头顶闪烁 1% 低电量",
        variants: [
          { pose: "drooping lazily on a desk with low-power warning mark", poseZh: "电量仅剩 1% 趴在桌边待机" },
          { pose: "holding a tiny unplug cord looking comically drained", poseZh: "拎着插头半睁眼急需充电" },
        ],
        captionZh: "电量1%",
        captionEn: "1% battery",
      },
      {
        pose: "staring serenely into distance with empty fluffy cloud above head",
        poseZh: "眼神放空头顶飘过一朵小白云",
        variants: [
          { pose: "sitting quietly watching a tiny butterfly drift by blankly", poseZh: "呆坐发呆大脑彻底清空模式" },
          { pose: "resting chin calmly with tiny blank thought bubbles", poseZh: "托腮发呆脑袋空空什么也不想" },
        ],
        captionZh: "已放空",
        captionEn: "Zone out",
      },
      {
        pose: "flipping over a cute wooden Closed sign waving lazily",
        poseZh: "挂出今日打烊牌子挥手下线",
        variants: [
          { pose: "pulling down a cozy window blind smiling sleepily", poseZh: "拉下窗帘挥手今天营业结束" },
          { pose: "tucking into a blanket holding a tiny Closed tag", poseZh: "钻进被窝举牌今日已打烊" },
        ],
        captionZh: "今日打烊",
        captionEn: "Closed today",
      },
      {
        pose: "curled sideways hugging a giant cushion refusing to move",
        poseZh: "抱住大靠垫赖着死活不想动",
        variants: [
          { pose: "rolling lazily like a cozy burrito wrapped in a blanket", poseZh: "裹紧小毯子像春卷一样不想动" },
          { pose: "reaching one lazy arm out while staying completely horizontal", poseZh: "躺平伸出一只手摆摆实在懒得动" },
        ],
        captionZh: "不想动",
        captionEn: "Too lazy",
      },
      {
        pose: "sweeping away tiny dark stress clouds with a soft feather duster",
        poseZh: "挥舞鸡毛掸子扫走烦恼拒绝内耗",
        variants: [
          { pose: "making a peaceful shield gesture smiling brightly at sparkles", poseZh: "淡定比出防护手势远离精神内耗" },
          { pose: "blowing away a little worry cloud like a dandelion puff", poseZh: "轻轻吹散乌云开心拒绝内耗" },
        ],
        captionZh: "拒绝内耗",
        captionEn: "Zero stress",
      },
      {
        pose: "walking super leisurely beside a tiny cute smiling snail",
        poseZh: "牵着小蜗牛慢慢悠悠慢半拍",
        variants: [
          { pose: "blinking slowly sipping warm cocoa unhurriedly", poseZh: "慢吞吞眨眼捧热可可不着急" },
          { pose: "stretching slowly with a calm unbothered yawn", poseZh: "慢条斯理伸懒腰按自己节奏来" },
        ],
        captionZh: "慢半拍",
        captionEn: "Slow pace",
      },
      {
        pose: "turning semi-transparent softly fading into fluffy clouds",
        poseZh: "悄悄变透明飘进云朵人间蒸发",
        variants: [
          { pose: "diving gracefully into a cozy blanket fort disappearing", poseZh: "一头扎进被窝堡垒宣布隐身" },
          { pose: "tipping a tiny hat disappearing behind drifting mist", poseZh: "挥手化作云雾悄咪咪下线隐身" },
        ],
        captionZh: "人间蒸发",
        captionEn: "Offline now",
      },
      {
        pose: "plugging both ears tightly with closed eyes humming peacefully",
        poseZh: "紧捂双耳闭眼摇头我不听我不听",
        variants: [
          { pose: "putting on giant cozy earmuffs smiling serenely", poseZh: "戴上超大毛绒耳罩屏蔽一切声音" },
          { pose: "hiding head under a fluffy pillow ignoring the noise", poseZh: "把头埋进枕头里假装听不见" },
        ],
        captionZh: "我不听",
        captionEn: "Can't hear!",
      },
      {
        pose: "basking warmly under sunny rays with happy squinting eyes",
        poseZh: "眯眼趴在阳光下舒舒服服晒太阳",
        variants: [
          { pose: "lounging in a cozy lawn chair soaking up golden sunbeams", poseZh: "躺平摇椅享受暖洋洋日光浴" },
          { pose: "stretching out by a sunny window with a warm smile", poseZh: "在阳光窗台打滚晒得暖烘烘" },
        ],
        captionZh: "晒太阳",
        captionEn: "Sunbathing!",
      },
      {
        pose: "tossing fluffy pillows joyfully cheering for the weekend",
        poseZh: "抱枕欢呼终于等到快乐周末",
        variants: [
          { pose: "dancing sleepily in pajamas wearing a weekend crown", poseZh: "穿睡衣戴小皇冠开心庆祝周末" },
          { pose: "sprawling happily across sofa surrounded by snacks", poseZh: "零食环绕瘫沙发欢呼周末万岁" },
        ],
        captionZh: "周末万岁",
        captionEn: "Weekend!",
      },
      {
        pose: "gesturing calmly with soothing hands smiling reassuringly",
        poseZh: "双手轻轻下压微笑安抚慢慢来",
        variants: [
          { pose: "sitting calmly with a warm teacup nodding gently", poseZh: "捧茶微笑点头安慰不用急慢慢来" },
          { pose: "drawing a soft circle calmly with gentle breathing sparkles", poseZh: "深呼吸放松微笑提醒一步步慢慢来" },
        ],
        captionZh: "慢慢来",
        captionEn: "Take it easy",
      },
      {
        pose: "pulling a plush sleeping mask over eyes waving goodnight",
        poseZh: "拉下睡眠眼罩挥手先睡为敬",
        variants: [
          { pose: "hugging a bolster pillow drifting right into dreamland", poseZh: "抱住长抱枕秒速入梦先睡一步" },
          { pose: "wearing a cozy nightcap saluting sleepily before napping", poseZh: "戴睡帽敬个困倦礼先睡为敬" },
        ],
        captionZh: "先睡为敬",
        captionEn: "Nap first!",
      },
      {
        pose: "giving a relaxed gentle thumbs up with calm peaceful grin",
        poseZh: "懒洋洋比个赞表示还行挺好的",
        variants: [
          { pose: "nodding contentedly wrapped in a warm cardigan", poseZh: "裹着针织开衫满足点头挺好的" },
          { pose: "smiling warmly holding a tiny mug of chamomile tea", poseZh: "捧着花茶微笑一切都挺好的" },
        ],
        captionZh: "挺好的",
        captionEn: "All good",
      },
      {
        pose: "sleeping peacefully on a fluffy crescent moon with twinkling stars",
        poseZh: "躺在软云朵弯月上安详晚安",
        variants: [
          { pose: "waving softly from a cozy cloud bed under starry sky", poseZh: "在星空云朵床上轻声道世界晚安" },
          { pose: "curled snugly under a starry quilt drifting to sleep", poseZh: "盖好星星小被子香甜睡去晚安" },
        ],
        captionZh: "世界晚安",
        captionEn: "Goodnight!",
      },
    ],
  },
  {
    id: "festive-celebration",
    category: "lifestyle",
    nameZh: "节日祝福",
    nameEn: "Festive & Celebration",
    descriptionZh: "新年快乐、恭喜发财、生日快乐、好运连连",
    descriptionEn: "Celebration stickers: Happy New Year, Birthday, Good Luck, Cheers",
    emoji: "🎉",
    slots: [
      {
        pose: "holding festive red lanterns smiling brightly",
        poseZh: "手提喜庆红灯笼笑盈盈",
        variants: [
          { pose: "unrolling a festive red scroll joyfully with golden sparkles", poseZh: "喜气洋洋展开红春联贺新年" },
          { pose: "wearing a festive red scarf waving cheerfully amid falling sparkles", poseZh: "围着红围巾在星光中欢呼新年好" },
        ],
        captionZh: "新年快乐",
        captionEn: "Happy NY!",
      },
      {
        pose: "holding shiny gold ingots with joyful grin",
        poseZh: "捧着闪亮金元宝咧嘴笑",
        variants: [
          { pose: "shaking a miniature golden lucky coin tree excitedly", poseZh: "开心摇晃迷你金色摇钱树" },
          { pose: "hugging a giant glittering gold coin with starry eyes", poseZh: "星星眼抱紧超大闪亮金币" },
        ],
        captionZh: "恭喜发财",
        captionEn: "Get Rich!",
      },
      {
        pose: "wearing a party hat holding a birthday cake",
        poseZh: "戴派对帽捧生日蛋糕",
        variants: [
          { pose: "blowing a festive party horn surrounded by colorful balloons", poseZh: "气球环绕吹响生日派对小喇叭" },
          { pose: "making a joyful wish beside a glowing birthday cupcake", poseZh: "对着闪亮小蛋糕闭眼开心许愿" },
        ],
        captionZh: "生日快乐",
        captionEn: "HBD!",
      },
      {
        pose: "surrounded by four-leaf clovers and stars",
        poseZh: "四叶草和星星环绕好运",
        variants: [
          { pose: "holding a glowing golden koi charm smiling brightly", poseZh: "手捧闪亮锦鲤护身符迎好运" },
          { pose: "catching falling lucky stars in both hands joyfully", poseZh: "双手捧住飘落幸运星好运满满" },
        ],
        captionZh: "好运连连",
        captionEn: "Good Luck",
      },
      {
        pose: "clinking festive drinks cheering happily",
        poseZh: "举杯欢呼快乐干杯",
        variants: [
          { pose: "raising a sparkling soda glass high with a celebratory wink", poseZh: "高举气泡饮眨眼潇洒干杯" },
          { pose: "holding two festive mugs brimming with bubbles grinning", poseZh: "举起两杯冒泡饮品欢呼畅饮" },
        ],
        captionZh: "干杯",
        captionEn: "Cheers!",
      },
      {
        pose: "offering a bright festive bouquet of flowers",
        poseZh: "双手递上鲜艳花束",
        variants: [
          { pose: "tossing colorful flower petals joyfully into the air", poseZh: "开心抛撒缤纷花瓣送祝福" },
          { pose: "holding a cute potted sunflower smiling warmly", poseZh: "手捧灿烂小向日葵温暖相赠" },
        ],
        captionZh: "送花",
        captionEn: "Flowers",
      },
      {
        pose: "watching colorful fireworks in awe",
        poseZh: "仰望绚烂烟花满眼惊叹",
        variants: [
          { pose: "waving a bright sparkling handheld sparkler joyfully", poseZh: "挥舞闪亮仙女棒笑得灿烂" },
          { pose: "cheering happily as miniature fireworks burst behind", poseZh: "在缤纷小烟花下高举双手欢呼" },
        ],
        captionZh: "放烟花",
        captionEn: "Woohoo!",
      },
      {
        pose: "holding a cute red envelope smiling",
        poseZh: "手捧大红包开心收下",
        variants: [
          { pose: "bowing playfully with a big beaming grin clutching a red packet", poseZh: "抱着大红包笑眯眯礼貌致谢" },
          { pose: "jumping excitedly holding a glowing red envelope overhead", poseZh: "高举闪亮红包开心跳起" },
        ],
        captionZh: "谢谢老板",
        captionEn: "Lucky!",
      },
      {
        pose: "giving a traditional clasped-hand blessing",
        poseZh: "抱拳作揖送吉祥祝福",
        variants: [
          { pose: "holding a pair of bright lucky tangerines smiling warmly", poseZh: "双手捧起大吉大利橘子送祝福" },
          { pose: "waving a cute festive folding fan with golden sparkles", poseZh: "轻摇喜庆小折扇送上吉祥祝福" },
        ],
        captionZh: "大吉大利",
        captionEn: "Best Wishes",
      },
      {
        pose: "popping a party confetti cannon",
        poseZh: "拉响礼花筒满屏彩带",
        variants: [
          { pose: "throwing colorful streamers into the air cheering loudly", poseZh: "抛洒缤纷彩带欢呼庆祝" },
          { pose: "beating a tiny festive drum energetically with sparkles", poseZh: "敲响喜庆小鼓热热闹闹庆祝" },
        ],
        captionZh: "庆祝",
        captionEn: "Party!",
      },
      {
        pose: "holding a glowing star wishing",
        poseZh: "捧起许愿星真诚许愿",
        variants: [
          { pose: "clasping hands together smiling under a shooting star", poseZh: "对着流星双手合十许下心愿" },
          { pose: "releasing a warm glowing wish lantern gently upward", poseZh: "轻轻放飞暖光许愿灯心想事成" },
        ],
        captionZh: "心想事成",
        captionEn: "Make a wish",
      },
      {
        pose: "dancing joyfully with musical notes",
        poseZh: "伴着音符欢乐起舞",
        variants: [
          { pose: "spinning in a fun disco pose pointing upward with sparkles", poseZh: "摆出复古迪斯科动作闪耀起舞" },
          { pose: "jamming with tiny headphones bouncing to the beat", poseZh: "戴着小耳机跟着节拍尽情摇摆" },
        ],
        captionZh: "嗨起来",
        captionEn: "Dance!",
      },
      {
        pose: "hugging a wrapped gift box",
        poseZh: "怀抱精美蝴蝶结礼物盒",
        variants: [
          { pose: "popping playfully out of a big ribboned gift box", poseZh: "从大蝴蝶结礼物盒里惊喜探头" },
          { pose: "offering a sparkling wrapped present forward with a wink", poseZh: "眨眼递上闪亮蝴蝶结礼物盒" },
        ],
        captionZh: "礼物",
        captionEn: "Gift!",
      },
      {
        pose: "smiling warmly holding a teacup",
        poseZh: "手捧热茶温暖祝福",
        variants: [
          { pose: "holding a plump red apple with a peaceful warm smile", poseZh: "手捧红彤彤平安果微笑送福" },
          { pose: "making a calm gentle heart gesture surrounded by soft sparkles", poseZh: "柔光星点中温柔比心祝平安" },
        ],
        captionZh: "平安喜乐",
        captionEn: "Peace",
      },
      {
        pose: "showing off a golden trophy",
        poseZh: "高举金色冠军奖杯夸赞",
        variants: [
          { pose: "pinning a shiny gold medal proudly with a beaming smile", poseZh: "骄傲亮出闪亮金牌点赞最棒" },
          { pose: "giving a sparkling double thumbs-up with a tiny #1 foam finger", poseZh: "戴第一名手套疯狂夸赞你最棒" },
        ],
        captionZh: "你最棒",
        captionEn: "Number 1",
      },
      {
        pose: "waving a festive banner happily",
        poseZh: "挥舞喜庆彩旗欢庆",
        variants: [
          { pose: "holding a cluster of floating festive balloons smiling brightly", poseZh: "手握一束节日气球笑得灿烂" },
          { pose: "skipping happily with a party crown and fluttering ribbons", poseZh: "戴小皇冠伴着彩带欢快过节" },
        ],
        captionZh: "节日快乐",
        captionEn: "Celebrate!",
      },
    ],
  },
];

export const CUSTOM_THEME_ID = "custom";

export function isCustomThemeId(id: string): boolean {
  return id === CUSTOM_THEME_ID;
}

export function getThemePackById(id: string): ThemePack | undefined {
  return THEME_PACKS.find((t) => t.id === id);
}

export function getThemeDisplayName(themeId: string, isZh: boolean): string {
  if (isCustomThemeId(themeId)) {
    return isZh ? "自定义主题" : "Custom Theme";
  }
  const theme = getThemePackById(themeId);
  return theme ? (isZh ? theme.nameZh : theme.nameEn) : themeId;
}

export function normalizePoseVariant(variantIndex = 0): number {
  if (!Number.isFinite(variantIndex)) return 0;
  const int = Math.trunc(variantIndex);
  return ((int % THEME_POSE_VARIANT_COUNT) + THEME_POSE_VARIANT_COUNT) % THEME_POSE_VARIANT_COUNT;
}

export function getSlotAllPoseVariants(slot: ThemeSlotPreset): PoseVariant[] {
  return [{ pose: slot.pose, poseZh: slot.poseZh }, ...slot.variants];
}

export function getSlotPoseVariant(slot: ThemeSlotPreset, variantIndex = 0): PoseVariant {
  const all = getSlotAllPoseVariants(slot);
  const idx = normalizePoseVariant(variantIndex) % all.length;
  return all[idx];
}

export function getDefaultSlotCaption(
  slot: ThemeSlotPreset,
  captionMode: CaptionMode
): string {
  if (captionMode === "none") return "";
  return captionMode === "zh" ? slot.captionZh : slot.captionEn;
}

export function isDefaultSlotCaption(
  themeId: string,
  slotIndex: number,
  captionMode: CaptionMode,
  caption: string
): boolean {
  if (captionMode === "none") return true;
  if (isCustomThemeId(themeId)) return false;
  const theme = getThemePackById(themeId) ?? THEME_PACKS[0];
  const slot = theme.slots[slotIndex];
  if (!slot) return false;
  return caption.trim() === getDefaultSlotCaption(slot, captionMode);
}

export function getSlotSourcePreset(
  themeId: string,
  slot: { index: number; sourceThemeId?: string; sourceSlotIndex?: number }
): {
  theme: ThemePack;
  slotPreset: ThemeSlotPreset;
  slotIndex: number;
  isCrossTheme: boolean;
} | null {
  const fallbackTheme = getThemePackById(themeId) ?? THEME_PACKS[0];
  if (
    slot.sourceThemeId &&
    typeof slot.sourceSlotIndex === "number" &&
    Number.isInteger(slot.sourceSlotIndex) &&
    slot.sourceSlotIndex >= 0
  ) {
    const sourceTheme = getThemePackById(slot.sourceThemeId);
    const sourceSlot = sourceTheme?.slots[slot.sourceSlotIndex];
    if (sourceTheme && sourceSlot) {
      return {
        theme: sourceTheme,
        slotPreset: sourceSlot,
        slotIndex: slot.sourceSlotIndex,
        isCrossTheme:
          sourceTheme.id !== fallbackTheme.id || slot.sourceSlotIndex !== slot.index,
      };
    }
  }
  const defaultSlot = fallbackTheme.slots[slot.index];
  if (!defaultSlot) return null;
  return {
    theme: fallbackTheme,
    slotPreset: defaultSlot,
    slotIndex: slot.index,
    isCrossTheme: false,
  };
}

export function detectPoseVariantIndex(
  themeId: string,
  slots:
    | Array<{
        index?: number;
        pose?: string;
        sourceThemeId?: string;
        sourceSlotIndex?: number;
      }>
    | undefined
): number {
  const theme = getThemePackById(themeId);
  if (!theme || !Array.isArray(slots) || slots.length === 0) return 0;

  const counts = Array.from({ length: THEME_POSE_VARIANT_COUNT }, () => 0);
  slots.forEach((slot, idx) => {
    const slotIndex = typeof slot.index === "number" ? slot.index : idx;
    if (!slot.pose) return;
    const source = getSlotSourcePreset(themeId, {
      index: slotIndex,
      sourceThemeId: slot.sourceThemeId,
      sourceSlotIndex: slot.sourceSlotIndex,
    });
    if (!source) return;
    const all = getSlotAllPoseVariants(source.slotPreset);
    const matchIdx = all.findIndex((v) => v.pose === slot.pose);
    if (matchIdx >= 0 && matchIdx < counts.length) {
      counts[matchIdx]++;
    }
  });

  let bestIdx = 0;
  let bestCount = counts[0];
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] > bestCount) {
      bestCount = counts[i];
      bestIdx = i;
    }
  }
  return bestIdx;
}

function sanitizeCustomCaption(caption: string): string {
  return caption
    .replace(/["'`\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12);
}

export function sanitizeCustomAction(action: string): string {
  return action
    .replace(/["'`\r\n\t[\]{}<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

const CUSTOM_CAPTION_STAGINGS = [
  "vivid expressive body language, matching facial emotion, and a fitting small prop",
  "a playful dynamic gesture, expressive face, and creative comedic staging",
  "a fresh exaggerated reaction pose, distinct angle, and fitting mini accessory",
] as const;

const CUSTOM_ACTION_STAGINGS = [
  "clear expressive body language, vivid facial emotion, and neat composition",
  "dynamic comedic framing, bold silhouette, and lively reaction details",
  "playful exaggerated gesture, distinct camera angle, and charming energy",
] as const;

export function buildCustomCaptionPose(
  caption: string,
  variantIndex = 0
): PoseVariant {
  const clean = sanitizeCustomCaption(caption);
  const staging = CUSTOM_CAPTION_STAGINGS[normalizePoseVariant(variantIndex)];
  return {
    pose: `acting out the chat expression "${clean}" with ${staging}`,
    poseZh: `按「${clean}」自由演绎动作与表情`,
  };
}

export function buildCustomActionPose(
  action: string,
  variantIndex = 0
): PoseVariant {
  const clean = sanitizeCustomAction(action);
  const staging = CUSTOM_ACTION_STAGINGS[normalizePoseVariant(variantIndex)];
  return {
    pose: `acting out the visual pose "${clean}" with ${staging}`,
    poseZh: clean,
  };
}

export function cycleSingleSlotPose(
  themeId: string,
  slot: StickerSlotSnapshot,
  fallbackVariant = 0
): StickerSlotSnapshot {
  const cleanCustom = slot.customPose ? sanitizeCustomAction(slot.customPose) : "";
  if (cleanCustom.length > 0) {
    let currentIdx = -1;
    for (let v = 0; v < THEME_POSE_VARIANT_COUNT; v++) {
      if (buildCustomActionPose(cleanCustom, v).pose === slot.pose) {
        currentIdx = v;
        break;
      }
    }
    const base = currentIdx >= 0 ? currentIdx : normalizePoseVariant(fallbackVariant);
    const nextVariant = normalizePoseVariant(base + 1);
    const next = buildCustomActionPose(cleanCustom, nextVariant);
    return {
      ...slot,
      pose: next.pose,
      poseZh: next.poseZh,
      customPose: cleanCustom,
    };
  }

  const trimmedCaption = slot.caption.trim();
  if (!slot.sourceThemeId && trimmedCaption.length > 0) {
    let captionIdx = -1;
    for (let v = 0; v < THEME_POSE_VARIANT_COUNT; v++) {
      if (buildCustomCaptionPose(trimmedCaption, v).pose === slot.pose) {
        captionIdx = v;
        break;
      }
    }
    if (captionIdx >= 0) {
      const next = buildCustomCaptionPose(trimmedCaption, normalizePoseVariant(captionIdx + 1));
      return {
        ...slot,
        pose: next.pose,
        poseZh: next.poseZh,
      };
    }
  }

  const source = getSlotSourcePreset(themeId, slot);
  if (!source) return slot;
  const all = getSlotAllPoseVariants(source.slotPreset);
  const curIdx = all.findIndex((v) => v.pose === slot.pose);
  const base = curIdx >= 0 ? curIdx : normalizePoseVariant(fallbackVariant);
  const next = all[(base + 1) % all.length];
  return {
    ...slot,
    pose: next.pose,
    poseZh: next.poseZh,
  };
}

export function buildRandomMixSlots(
  gridSize: GridSize,
  captionMode: CaptionMode
): StickerSlotSnapshot[] {
  const count = gridSize === "4x4" ? 16 : 9;
  const pool: Array<{
    theme: ThemePack;
    slotIndex: number;
    slotPreset: ThemeSlotPreset;
  }> = [];

  for (const theme of THEME_PACKS) {
    theme.slots.forEach((slotPreset, slotIndex) => {
      pool.push({ theme, slotIndex, slotPreset });
    });
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  const result: StickerSlotSnapshot[] = [];
  const seenKeys = new Set<string>();
  const seenCaptions = new Set<string>();

  for (const item of pool) {
    const key = `${item.theme.id}:${item.slotIndex}`;
    const captionKey = `${item.slotPreset.captionZh}|${item.slotPreset.captionEn}`;
    if (seenKeys.has(key) || seenCaptions.has(captionKey)) continue;
    seenKeys.add(key);
    seenCaptions.add(captionKey);

    const variantIndex = Math.floor(Math.random() * THEME_POSE_VARIANT_COUNT);
    const chosen = getSlotPoseVariant(item.slotPreset, variantIndex);
    result.push({
      index: result.length,
      pose: chosen.pose,
      poseZh: chosen.poseZh,
      caption: getDefaultSlotCaption(item.slotPreset, captionMode),
      sourceThemeId: item.theme.id,
      sourceSlotIndex: item.slotIndex,
    });
    if (result.length >= count) break;
  }

  return result;
}

export function isSlotEmpty(
  slot: Pick<StickerSlotSnapshot, "pose" | "customPose" | "sourceThemeId" | "caption">
): boolean {
  if (slot.customPose && slot.customPose.trim().length > 0) return false;
  if (slot.sourceThemeId) return false;
  if (slot.pose && slot.pose.trim().length > 0) return false;
  return true;
}

export function buildBlankCustomSlots(gridSize: GridSize): StickerSlotSnapshot[] {
  const count = gridSize === "4x4" ? 16 : 9;
  return Array.from({ length: count }, (_, index) => ({
    index,
    pose: "",
    poseZh: "",
    caption: "",
    customPose: "",
  }));
}

export function fillEmptySlotsFromLibrary(
  slots: StickerSlotSnapshot[],
  captionMode: CaptionMode
): StickerSlotSnapshot[] {
  const emptyIndices: number[] = [];
  const seenKeys = new Set<string>();
  const seenCaptions = new Set<string>();

  slots.forEach((slot, idx) => {
    if (isSlotEmpty(slot)) {
      emptyIndices.push(idx);
      return;
    }
    if (slot.sourceThemeId && typeof slot.sourceSlotIndex === "number") {
      seenKeys.add(`${slot.sourceThemeId}:${slot.sourceSlotIndex}`);
    }
    if (slot.caption.trim()) {
      seenCaptions.add(slot.caption.trim());
    }
  });

  if (emptyIndices.length === 0) return slots;

  const pool: Array<{
    theme: ThemePack;
    slotIndex: number;
    slotPreset: ThemeSlotPreset;
  }> = [];
  for (const theme of THEME_PACKS) {
    theme.slots.forEach((slotPreset, slotIndex) => {
      pool.push({ theme, slotIndex, slotPreset });
    });
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  const next = [...slots];
  let poolCursor = 0;

  for (const emptyIdx of emptyIndices) {
    let chosenItem: (typeof pool)[number] | undefined;
    while (poolCursor < pool.length) {
      const candidate = pool[poolCursor++];
      const key = `${candidate.theme.id}:${candidate.slotIndex}`;
      const cap = getDefaultSlotCaption(candidate.slotPreset, captionMode);
      if (seenKeys.has(key)) continue;
      if (cap && seenCaptions.has(cap)) continue;
      seenKeys.add(key);
      if (cap) seenCaptions.add(cap);
      chosenItem = candidate;
      break;
    }
    if (!chosenItem) break;

    const variantIndex = Math.floor(Math.random() * THEME_POSE_VARIANT_COUNT);
    const poseVar = getSlotPoseVariant(chosenItem.slotPreset, variantIndex);
    next[emptyIdx] = {
      index: emptyIdx,
      pose: poseVar.pose,
      poseZh: poseVar.poseZh,
      caption: getDefaultSlotCaption(chosenItem.slotPreset, captionMode),
      sourceThemeId: chosenItem.theme.id,
      sourceSlotIndex: chosenItem.slotIndex,
    };
  }

  return next;
}

export function parseBulkSlotLines(
  rawText: string,
  gridSize: GridSize,
  captionMode: CaptionMode,
  poseVariant = 0
): StickerSlotSnapshot[] {
  const count = gridSize === "4x4" ? 16 : 9;
  const lines = rawText
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^(?:#?\d+\s*[.、:：)\]]\s*|[-*•]\s+)/, "")
        .trim()
    )
    .filter((line) => line.length > 0)
    .slice(0, count);

  return Array.from({ length: count }, (_, index) => {
    const line = lines[index];
    if (!line) {
      return {
        index,
        pose: "",
        poseZh: "",
        caption: "",
        customPose: "",
      };
    }

    const parts = line.split(/[|｜]/);
    const rawAction = (parts[0] ?? "").trim();
    const rawCaption = parts.length > 1 ? parts.slice(1).join(" ").trim().slice(0, 12) : "";
    const cleanAction = sanitizeCustomAction(rawAction);
    const caption = captionMode === "none" ? "" : rawCaption;

    if (cleanAction.length > 0) {
      const built = buildCustomActionPose(cleanAction, poseVariant);
      return {
        index,
        pose: built.pose,
        poseZh: built.poseZh,
        caption,
        customPose: cleanAction,
      };
    }

    if (caption.length > 0) {
      const built = buildCustomCaptionPose(caption, poseVariant);
      return {
        index,
        pose: built.pose,
        poseZh: built.poseZh,
        caption,
      };
    }

    return {
      index,
      pose: "",
      poseZh: "",
      caption: "",
      customPose: "",
    };
  });
}

export function buildDefaultSlots(
  themeId: string,
  gridSize: GridSize,
  captionMode: CaptionMode,
  variantIndex = 0
): StickerSlotSnapshot[] {
  if (isCustomThemeId(themeId)) {
    return buildBlankCustomSlots(gridSize);
  }
  const theme = getThemePackById(themeId) ?? THEME_PACKS[0];
  const count = gridSize === "4x4" ? 16 : 9;
  return theme.slots.slice(0, count).map((slot, index) => {
    const chosen = getSlotPoseVariant(slot, variantIndex);
    return {
      index,
      pose: chosen.pose,
      poseZh: chosen.poseZh,
      caption: getDefaultSlotCaption(slot, captionMode),
    };
  });
}

export function resolveSlotsForGeneration(input: {
  themeId: string;
  gridSize: GridSize;
  captionMode: CaptionMode;
  slots?: Array<{
    index: number;
    pose: string;
    poseZh?: string;
    caption: string;
    sourceThemeId?: string;
    sourceSlotIndex?: number;
    customPose?: string;
  }>;
  poseVariant?: number;
}): StickerSlotSnapshot[] {
  const variantIndex = normalizePoseVariant(input.poseVariant ?? 0);
  const isCustom = isCustomThemeId(input.themeId);
  const theme = getThemePackById(input.themeId) ?? THEME_PACKS[0];
  const expectedCount = input.gridSize === "4x4" ? 16 : 9;
  const fallbackThemeSlots = buildDefaultSlots(
    isCustom ? THEME_PACKS[0].id : input.themeId,
    input.gridSize,
    input.captionMode,
    variantIndex
  );

  if (!input.slots || input.slots.length !== expectedCount) {
    return fallbackThemeSlots;
  }

  return input.slots.map((s, idx) => {
    const caption = input.captionMode === "none" ? "" : s.caption.trim().slice(0, 12);
    const preset = isCustom ? undefined : theme.slots[idx];
    const fallback = fallbackThemeSlots[idx];

    const cleanCustomPose = s.customPose ? sanitizeCustomAction(s.customPose) : "";
    if (cleanCustomPose.length > 0) {
      let customVariant = variantIndex;
      for (let v = 0; v < THEME_POSE_VARIANT_COUNT; v++) {
        if (buildCustomActionPose(cleanCustomPose, v).pose === s.pose) {
          customVariant = v;
          break;
        }
      }
      const custom = buildCustomActionPose(cleanCustomPose, customVariant);
      return {
        index: idx,
        pose: custom.pose,
        poseZh: custom.poseZh,
        caption,
        customPose: cleanCustomPose,
      };
    }

    const sourceTheme = s.sourceThemeId ? getThemePackById(s.sourceThemeId) : undefined;
    const sourceSlotIndex =
      typeof s.sourceSlotIndex === "number" && Number.isInteger(s.sourceSlotIndex)
        ? s.sourceSlotIndex
        : undefined;
    const sourcePreset =
      sourceTheme && sourceSlotIndex !== undefined ? sourceTheme.slots[sourceSlotIndex] : undefined;

    if (sourceTheme && sourcePreset && sourceSlotIndex !== undefined) {
      const allowed = getSlotAllPoseVariants(sourcePreset);
      const matched = allowed.find((v) => v.pose === s.pose);
      const chosen = matched ?? getSlotPoseVariant(sourcePreset, variantIndex);
      return {
        index: idx,
        pose: chosen.pose,
        poseZh: chosen.poseZh,
        caption,
        sourceThemeId: sourceTheme.id,
        sourceSlotIndex,
      };
    }

    if (
      input.captionMode !== "none" &&
      caption.length > 0 &&
      !isDefaultSlotCaption(input.themeId, idx, input.captionMode, caption)
    ) {
      let captionVariant = variantIndex;
      for (let v = 0; v < THEME_POSE_VARIANT_COUNT; v++) {
        if (buildCustomCaptionPose(caption, v).pose === s.pose) {
          captionVariant = v;
          break;
        }
      }
      const custom = buildCustomCaptionPose(caption, captionVariant);
      return {
        index: idx,
        pose: custom.pose,
        poseZh: custom.poseZh,
        caption,
      };
    }

    if (preset) {
      const allowed = getSlotAllPoseVariants(preset);
      const matched = allowed.find((v) => v.pose === s.pose);
      if (matched) {
        return {
          index: idx,
          pose: matched.pose,
          poseZh: matched.poseZh,
          caption,
        };
      }
    }

    return {
      index: idx,
      pose: fallback?.pose ?? s.pose,
      poseZh: fallback?.poseZh,
      caption,
    };
  });
}
