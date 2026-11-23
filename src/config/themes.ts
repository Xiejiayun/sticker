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

export interface ThemePack {
  id: string;
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
    id: "office-worker",
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
    id: "couple-love",
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
    id: "cute-pet",
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
    id: "festive-celebration",
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

export function getThemePackById(id: string): ThemePack | undefined {
  return THEME_PACKS.find((t) => t.id === id);
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
  const theme = getThemePackById(themeId) ?? THEME_PACKS[0];
  const slot = theme.slots[slotIndex];
  if (!slot) return false;
  return caption.trim() === getDefaultSlotCaption(slot, captionMode);
}

export function detectPoseVariantIndex(
  themeId: string,
  slots: Array<{ index?: number; pose?: string }> | undefined
): number {
  const theme = getThemePackById(themeId);
  if (!theme || !Array.isArray(slots) || slots.length === 0) return 0;

  const counts = Array.from({ length: THEME_POSE_VARIANT_COUNT }, () => 0);
  slots.forEach((slot, idx) => {
    const slotIndex = typeof slot.index === "number" ? slot.index : idx;
    const preset = theme.slots[slotIndex];
    if (!preset || !slot.pose) return;
    const all = getSlotAllPoseVariants(preset);
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

const CUSTOM_CAPTION_STAGINGS = [
  "vivid expressive body language, matching facial emotion, and a fitting small prop",
  "a playful dynamic gesture, expressive face, and creative comedic staging",
  "a fresh exaggerated reaction pose, distinct angle, and fitting mini accessory",
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

export function buildDefaultSlots(
  themeId: string,
  gridSize: GridSize,
  captionMode: CaptionMode,
  variantIndex = 0
): StickerSlotSnapshot[] {
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
  slots?: Array<{ index: number; pose: string; caption: string }>;
  poseVariant?: number;
}): StickerSlotSnapshot[] {
  const variantIndex = normalizePoseVariant(input.poseVariant ?? 0);
  const theme = getThemePackById(input.themeId) ?? THEME_PACKS[0];
  const expectedCount = input.gridSize === "4x4" ? 16 : 9;
  const defaultSlots = buildDefaultSlots(input.themeId, input.gridSize, input.captionMode, variantIndex);

  if (!input.slots || input.slots.length !== expectedCount) {
    return defaultSlots;
  }

  return input.slots.map((s, idx) => {
    const caption = input.captionMode === "none" ? "" : s.caption.trim().slice(0, 12);
    const preset = theme.slots[idx];
    const fallback = defaultSlots[idx];

    if (
      input.captionMode !== "none" &&
      caption.length > 0 &&
      !isDefaultSlotCaption(input.themeId, idx, input.captionMode, caption)
    ) {
      const custom = buildCustomCaptionPose(caption, variantIndex);
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
