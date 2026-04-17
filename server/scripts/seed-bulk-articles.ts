import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import mysql from 'mysql2/promise';

type Domain = {
  slug: string;
  name: string;
  description: string;
  color: string;
  authorUsername: string;
  tags: string[];
  image: string;
  premise: string;
  methods: string[];
  mistakes: string[];
  details: string[];
  topics: string[];
};

const AUTHOR_IDS: Record<string, string> = {
  admin: '00000000-0000-4000-8000-000000000001',
  'lin-yu': '10000000-0000-4000-8000-000000000001',
  'chen-mo': '10000000-0000-4000-8000-000000000002',
  'qi-an': '10000000-0000-4000-8000-000000000003',
  'xia-zhu': '10000000-0000-4000-8000-000000000004',
  'he-yan': '10000000-0000-4000-8000-000000000005',
};

const TAGS = [
  ['life-planning', '生活规划'],
  ['health-habits', '健康习惯'],
  ['nutrition', '营养'],
  ['exercise', '运动'],
  ['education', '教育'],
  ['learning-method', '学习方法'],
  ['career', '职业发展'],
  ['workplace', '职场'],
  ['finance-literacy', '财经常识'],
  ['budgeting', '预算'],
  ['culture', '文化'],
  ['history', '历史'],
  ['travel', '旅行'],
  ['city-guide', '城市指南'],
  ['food', '饮食'],
  ['home-cooking', '家庭烹饪'],
  ['science', '科学'],
  ['nature', '自然'],
  ['environment', '环保'],
  ['sustainability', '可持续'],
  ['psychology', '心理'],
  ['relationships', '关系'],
  ['family', '家庭'],
  ['parenting', '亲子'],
  ['home', '居家'],
  ['organizing', '收纳'],
  ['arts', '艺术'],
  ['reading', '阅读'],
  ['public-life', '公共生活'],
  ['community-life', '社区生活'],
] as const;

const domains: Domain[] = [
  {
    slug: 'health-wellness',
    name: '健康生活',
    description: '睡眠、饮食、运动和身体管理的日常实践。',
    color: '#2f6f3e',
    authorUsername: 'xia-zhu',
    tags: ['health-habits', 'nutrition', 'exercise', 'life-planning'],
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=80',
    premise: '健康生活最难的不是知道正确答案，而是把答案放进真实日程里。很多人失败并非意志力不足，而是计划忽略了通勤、家庭、情绪和预算这些现实变量。',
    methods: ['用一周记录找到最容易调整的时段', '把目标改写成可观察行为', '先固定睡眠和饮水这样的底层习惯', '每两周复盘一次身体反馈'],
    mistakes: ['一开始就追求完美饮食', '把运动当成补偿而不是日常节律', '忽略疼痛、疲惫和情绪信号', '频繁更换计划导致无法判断效果'],
    details: ['早餐结构', '晚间屏幕时间', '步行路线', '周末备餐'],
    topics: ['普通上班族如何建立可持续的早餐结构', '睡眠质量下降时先检查哪些生活细节', '从散步开始重建运动习惯', '外卖频繁时如何守住营养底线', '体检报告读完后怎样制定三个月行动表', '久坐工作者的肩颈恢复计划', '周末备餐如何避免变成负担', '家庭成员作息不同时怎样互相支持'],
  },
  {
    slug: 'education-learning',
    name: '教育与学习',
    description: '学习方法、课堂之外的成长和终身学习路径。',
    color: '#255f85',
    authorUsername: 'qi-an',
    tags: ['education', 'learning-method', 'reading', 'life-planning'],
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&q=80',
    premise: '学习不是把时间填满，而是让知识在问题里反复被调用。真正有效的学习计划会同时照顾目标、反馈、练习密度和休息。',
    methods: ['先写出要解决的具体问题', '把输入和输出配成一组', '用错题或卡片记录认知盲区', '每周安排一次无资料复述'],
    mistakes: ['只收藏资料不安排输出', '用时长替代理解程度', '过早追求体系化', '忽略学习环境对注意力的影响'],
    details: ['课堂笔记', '错题本', '阅读清单', '复述练习'],
    topics: ['成年人重启学习计划的第一周怎么安排', '孩子写作业拖延时家长可以观察什么', '读完一本书后如何判断自己真的理解了', '在线课程买太多时如何做取舍', '考试复盘不该只看分数', '小组学习怎样避免变成聊天局', '把兴趣课变成长期能力的关键', '如何设计一个适合自己的知识地图'],
  },
  {
    slug: 'career-work',
    name: '职业与工作',
    description: '职业选择、协作、复盘和个人成长。',
    color: '#8f4a2f',
    authorUsername: 'chen-mo',
    tags: ['career', 'workplace', 'remote-work', 'life-planning'],
    image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80',
    premise: '职业发展通常不是一次巨大跃迁，而是很多次对任务、关系和能力边界的重新校准。把工作经验沉淀下来，才可能看见下一步。',
    methods: ['记录让你反复卡住的任务类型', '区分技能问题、资源问题和沟通问题', '把成果写成对业务有意义的语言', '定期维护外部视角'],
    mistakes: ['只用忙碌程度衡量价值', '遇到冲突时只讨论态度不讨论机制', '把晋升理解成单纯加班', '忽略行业周期变化'],
    details: ['周报', '一对一沟通', '项目复盘', '作品集'],
    topics: ['换工作前如何盘点自己的真实筹码', '项目复盘怎样写才不会流于形式', '新人进入团队的前三十天观察清单', '远程协作中最容易被低估的同步成本', '向上沟通时如何把问题讲清楚', '职业倦怠早期有哪些信号', '个人作品集不只属于设计师', '会议太多时怎样重新设计协作节奏'],
  },
  {
    slug: 'finance-common-sense',
    name: '财经常识',
    description: '预算、消费、风险意识和家庭财务基本功。',
    color: '#5c4f99',
    authorUsername: 'he-yan',
    tags: ['finance-literacy', 'budgeting', 'life-planning', 'metrics'],
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80',
    premise: '普通人的财务管理首先是现金流管理，而不是追逐复杂产品。理解收入、支出、风险和时间，能让很多选择更稳。',
    methods: ['先建立三个月支出基线', '区分固定支出、弹性支出和冲动支出', '把风险准备金放在容易理解的位置', '重大购买前写下替代方案'],
    mistakes: ['把记账当成自责工具', '只看折扣不看总拥有成本', '忽略保险和备用金的基础作用', '听到收益率就忽略风险'],
    details: ['家庭预算', '消费清单', '备用金', '年度账单'],
    topics: ['家庭预算表应该先记录哪些项目', '大件消费前的冷静期怎么设置', '年轻人建立备用金的现实路径', '记账三个月后如何读懂自己的消费模式', '订阅服务越来越多时怎样清理', '节假日支出为什么总是超预算', '和家人讨论钱时怎样减少情绪摩擦', '理解复利前先理解现金流'],
  },
  {
    slug: 'culture-history',
    name: '文化与历史',
    description: '历史阅读、地方文化、传统与现代生活。',
    color: '#a04b35',
    authorUsername: 'xia-zhu',
    tags: ['culture', 'history', 'reading', 'public-life'],
    image: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=1400&q=80',
    premise: '文化和历史不是博物馆里的静态展品，它们会通过节日、街道、饮食、方言和家庭记忆继续影响今天的选择。',
    methods: ['从一个具体物件或地名开始追问', '同时阅读宏观叙事和个人记录', '把时间线和空间地图放在一起', '警惕单一故事带来的误读'],
    mistakes: ['只记年代不理解制度和生活', '把传统简单等同于保守', '忽略普通人的经验', '用今天的便利条件评判过去'],
    details: ['老街', '地方志', '家族故事', '节日仪式'],
    topics: ['一条老街如何保存城市记忆', '读历史书时为什么要看地图', '地方小吃背后的迁徙故事', '传统节日如何在现代家庭里延续', '博物馆参观前可以做哪些准备', '家族相册里的时代线索', '方言为什么值得被认真记录', '从一座桥理解城市变迁'],
  },
  {
    slug: 'travel-local',
    name: '旅行与地方',
    description: '慢旅行、城市观察和负责任的出行。',
    color: '#2c6d7f',
    authorUsername: 'qi-an',
    tags: ['travel', 'city-guide', 'culture', 'sustainability'],
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
    premise: '旅行不是把清单打满，而是暂时换一种节奏观察地方。真正留下来的，常常是一次问路、一顿早餐或一段不赶时间的步行。',
    methods: ['每天只安排一个核心目的地', '预留随机步行和休息时间', '提前了解当地交通和礼仪', '把消费留给真实服务而不是一次性打卡'],
    mistakes: ['为拍照牺牲体验', '把攻略当成命令', '忽略季节和体力', '只去热门区域导致看不到日常生活'],
    details: ['清晨市场', '公共交通', '街角咖啡店', '社区公园'],
    topics: ['第一次独自旅行如何设计安全边界', '城市漫步路线为什么不宜太满', '带父母旅行时怎样安排节奏', '雨天旅行也可以观察什么', '短途周末游如何避免比上班更累', '旅行预算应该留出哪些弹性', '住进社区附近能看到什么', '负责任旅行从哪些小事开始'],
  },
  {
    slug: 'food-home-cooking',
    name: '饮食与烹饪',
    description: '家庭厨房、食材选择和日常餐桌。',
    color: '#b05a31',
    authorUsername: 'xia-zhu',
    tags: ['food', 'home-cooking', 'nutrition', 'family'],
    image: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=1400&q=80',
    premise: '家常饭的价值不只在味道，也在稳定、可负担和可重复。会做几顿基础饭，常常能改善一天的节奏。',
    methods: ['先掌握三种基础烹饪方式', '用常备食材降低决策成本', '按家庭口味调整而不是追求标准答案', '保留一道十分钟应急菜'],
    mistakes: ['一次购买过多新奇调料', '只看菜谱不看火力和锅具', '忽略清洗和收纳成本', '把健康餐做成惩罚'],
    details: ['常备菜', '汤底', '调味比例', '剩菜再利用'],
    topics: ['厨房新手最该学的三种基础做法', '如何让一周晚餐更省心', '买菜清单怎样减少浪费', '家常汤为什么能稳定餐桌', '孩子挑食时餐桌可以怎么调整', '一个人吃饭也值得好好安排', '剩米饭的五种体面去处', '地方风味如何进入日常厨房'],
  },
  {
    slug: 'science-nature',
    name: '科学与自然',
    description: '科学素养、自然观察和日常中的原理。',
    color: '#397367',
    authorUsername: 'he-yan',
    tags: ['science', 'nature', 'reading', 'education'],
    image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=80',
    premise: '科学素养不是记住所有术语，而是知道证据如何产生、结论有什么边界，以及什么时候应该继续追问。',
    methods: ['先区分观察、解释和推测', '寻找可重复的证据来源', '用简单实验理解抽象概念', '承认不确定性也是科学态度的一部分'],
    mistakes: ['把相关性当因果', '只相信符合直觉的解释', '忽略样本大小和测量方式', '用单个故事否定系统证据'],
    details: ['天气变化', '植物生长', '厨房实验', '夜空观察'],
    topics: ['如何用阳台植物理解季节变化', '看科普文章时怎样判断证据质量', '厨房里的乳化现象说明了什么', '孩子问为什么时成年人可以怎样回答', '一次夜空观察需要准备什么', '天气预报为什么会有不确定性', '自然笔记不只是画得好看', '从一杯水理解日常科学'],
  },
  {
    slug: 'environment-sustainability',
    name: '环保与可持续',
    description: '低浪费生活、能源意识和社区环境。',
    color: '#4f7f45',
    authorUsername: 'qi-an',
    tags: ['environment', 'sustainability', 'community-life', 'public-life'],
    image: 'https://images.unsplash.com/photo-1472141521881-95d0e87e2e39?auto=format&fit=crop&w=1400&q=80',
    premise: '可持续生活不是让每个人立刻变得完美，而是让更多普通选择少一点浪费、多一点长期意识。',
    methods: ['先从高频消耗品开始替换', '把可持续选择和便利性放在一起设计', '记录一个月垃圾来源', '参与社区层面的共享和回收'],
    mistakes: ['用道德压力替代实际方案', '买很多环保产品却增加消费', '忽略清洁、维护和使用寿命', '只关注个人行为而忘记公共系统'],
    details: ['垃圾分类', '旧物修补', '节能账单', '社区花园'],
    topics: ['低浪费生活从哪三件小事开始', '旧衣处理为什么不只是捐出去', '家庭节能账单可以怎么看', '社区回收点如何提升参与度', '可重复使用物品也需要算总成本', '修补一件旧物带来的心理变化', '办公室里的低浪费实践', '绿色消费最容易踩的坑'],
  },
  {
    slug: 'psychology-relationships',
    name: '心理与关系',
    description: '情绪管理、人际沟通和亲密关系中的边界。',
    color: '#7f5f96',
    authorUsername: 'xia-zhu',
    tags: ['psychology', 'relationships', 'family', 'workplace'],
    image: 'https://images.unsplash.com/photo-1493836512294-502baa1986e2?auto=format&fit=crop&w=1400&q=80',
    premise: '心理议题常常不是某个道理没想通，而是身体、关系和环境同时发出信号。温和地识别这些信号，比急着解决更重要。',
    methods: ['给情绪命名而不是立刻评价', '区分事实、感受和请求', '在关系里提前说明边界', '为高压时期准备恢复性活动'],
    mistakes: ['把压抑误认为成熟', '用猜测替代沟通', '在疲惫时做重大关系决定', '把一次冲突扩大成对人的否定'],
    details: ['情绪日记', '边界表达', '家庭沟通', '独处时间'],
    topics: ['情绪低落时如何做一份温和记录', '亲密关系里的边界可以怎样表达', '和父母沟通生活选择时先准备什么', '职场冲突后如何恢复判断力', '独处不是逃避关系', '焦虑来临时先照顾身体信号', '道歉为什么不能只说对不起', '长期关系里如何保留个人空间'],
  },
  {
    slug: 'family-home',
    name: '家庭与居家',
    description: '家庭协作、亲子沟通、收纳和居住体验。',
    color: '#986b40',
    authorUsername: 'qi-an',
    tags: ['family', 'parenting', 'home', 'organizing'],
    image: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80',
    premise: '家庭生活由大量小协作组成：谁收拾、谁提醒、谁照顾、谁决定。把这些小事设计得清楚，家才会更轻松。',
    methods: ['把家务拆成可见任务', '为高频物品设置固定位置', '让孩子参与适龄决策', '用家庭会议处理反复出现的问题'],
    mistakes: ['把收纳当成一次性工程', '用责备替代规则', '忽略不同家庭成员的动线', '所有决定都临时协商'],
    details: ['玄关', '餐桌', '玩具区', '洗衣流程'],
    topics: ['玄关收纳为什么决定一天的开始', '家庭分工表怎样避免变成摆设', '孩子玩具太多时如何一起整理', '小户型也能拥有安静角落', '洗衣流程如何减少争吵', '家庭会议适合讨论哪些小事', '老人同住时空间如何互相尊重', '餐桌习惯如何影响家庭沟通'],
  },
  {
    slug: 'arts-public-life',
    name: '艺术与公共生活',
    description: '艺术欣赏、公共空间、社区活动和审美经验。',
    color: '#9b3f5c',
    authorUsername: 'he-yan',
    tags: ['arts', 'public-life', 'community-life', 'culture'],
    image: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?auto=format&fit=crop&w=1400&q=80',
    premise: '艺术并不只存在于展厅，也存在于海报、广场、社区活动和一条街的色彩秩序里。公共生活越丰富，审美经验越日常。',
    methods: ['先描述看到什么，再评价喜不喜欢', '把作品放回它的时代和场地', '留意普通人如何使用公共空间', '记录一次活动留下的具体感受'],
    mistakes: ['用看不懂否定作品', '只拍照不观察', '忽略公共空间的维护成本', '把审美讨论变成身份标签'],
    details: ['展览', '剧场', '社区市集', '公共座椅'],
    topics: ['第一次看展如何避免走马观花', '社区市集为什么能改变邻里关系', '公共座椅背后的城市态度', '看一场小剧场演出前后可以记录什么', '街头海报如何影响城市气质', '艺术教育不必从昂贵课程开始', '公共空间里的儿童友好细节', '一次社区活动如何被长期记住'],
  },
];

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`缺少必需环境变量: ${name}`);
  return value;
}

function id(prefix: string, index: number): string {
  return `${prefix}000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdown(markdown: string): string {
  return markdown
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
      if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith('- ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
      if (!line.trim()) return '';
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('\n')
    .replace(/(?:<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`);
}

function pick(items: string[], index: number): string {
  return items[index % items.length];
}

function buildContent(domain: Domain, title: string, index: number): string {
  const methodA = pick(domain.methods, index);
  const methodB = pick(domain.methods, index + 1);
  const methodC = pick(domain.methods, index + 2);
  const mistakeA = pick(domain.mistakes, index);
  const mistakeB = pick(domain.mistakes, index + 1);
  const detailA = pick(domain.details, index);
  const detailB = pick(domain.details, index + 1);

  return [
    `# ${title}`,
    '',
    `这篇文章讨论的是“${title}”。它属于${domain.name}领域，但并不追求宏大口号，而是把问题拆回每天能够观察、调整和复盘的细节。`,
    '',
    '## 问题背景',
    '',
    domain.premise,
    `如果只看结论，${detailA}似乎只是一个小环节；但在真实生活里，它常常牵动时间安排、情绪状态、家庭协作和资源分配。好的方案需要能被普通日程容纳，也要允许人在状态不佳时有退路。`,
    '',
    '## 分析路径',
    '',
    `第一步是把“我应该做什么”改成“我现在被什么卡住”。以${detailA}为例，卡点可能来自信息不足、工具不顺手，也可能来自期待过高。只有把原因说清楚，后面的行动才不会变成新的压力。`,
    `第二步是选择一个可验证的小动作。${methodA}，通常比一次性重做整套系统更可靠。它能让人看到反馈，也能避免在热情最高时做出过度承诺。`,
    `第三步是给变化留下记录。记录不需要复杂，围绕${detailB}写下发生了什么、哪里省力、哪里仍然别扭，就足以支撑下一轮调整。`,
    '',
    '## 可执行做法',
    '',
    `- ${methodA}，并把结果限定在一周内观察。`,
    `- ${methodB}，让计划从愿望变成具体行为。`,
    `- ${methodC}，避免所有压力都堆到最后一天。`,
    `- 为${detailA}设置一个最低可接受版本，状态不好时也能完成。`,
    '',
    '## 常见误区',
    '',
    `${mistakeA} 是最常见的问题之一。它会让人误以为失败来自不够努力，而不是方案没有贴合真实生活。另一个误区是${mistakeB}，这会让原本可以渐进改善的事情变成一次性考试。`,
    '',
    '## 一个具体场景',
    '',
    `假设你只有一个普通工作日的晚上可以处理这件事，不妨先把目标缩小到二十分钟：整理${detailA}，写下一个观察，再决定明天是否继续。这个场景的重点不是产出多大成果，而是让行动重新变得可开始。`,
    '',
    '## 复盘清单',
    '',
    '- 这次调整解决的是自己的问题，还是复制了别人的答案？',
    '- 有没有一个可以在忙碌时保留的低配版本？',
    '- 哪个细节最影响体验：时间、空间、情绪、预算，还是沟通？',
    '- 下一次复盘需要看什么证据，而不是只凭感觉？',
    '',
    '## 小结',
    '',
    `真正有价值的改变通常并不戏剧化。围绕“${title}”，我们要做的是把复杂问题放回可观察的生活现场，用小步验证积累信心。本文为原创内容，用通用生活经验和结构化分析写成，不改写、不搬运任何第三方文章。`,
  ].join('\n');
}

async function ensureTaxonomy(connection: mysql.Connection) {
  for (let index = 0; index < domains.length; index += 1) {
    const domain = domains[index];
    await connection.execute(
      `INSERT INTO categories (id, name, slug, description, color, sort_order, article_count, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), color = VALUES(color),
        sort_order = VALUES(sort_order), is_visible = 1, updated_at = CURRENT_TIMESTAMP`,
      [id('70', index + 1), domain.name, domain.slug, domain.description, domain.color, 200 + index * 10],
    );
  }

  for (let index = 0; index < TAGS.length; index += 1) {
    const [slug, name] = TAGS[index];
    await connection.execute(
      `INSERT INTO tags (id, name, slug, article_count)
       VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP`,
      [id('80', index + 1), name, slug],
    );
  }
}

async function seedArticles(connection: mysql.Connection) {
  const [categoryRows] = await connection.query<mysql.RowDataPacket[]>('SELECT id, slug FROM categories');
  const [tagRows] = await connection.query<mysql.RowDataPacket[]>('SELECT id, slug FROM tags');
  const categoryBySlug = new Map(categoryRows.map((row) => [String(row.slug), String(row.id)]));
  const tagBySlug = new Map(tagRows.map((row) => [String(row.slug), String(row.id)]));
  let articleIndex = 1;

  for (const domain of domains) {
    const categoryId = categoryBySlug.get(domain.slug);
    const authorId = AUTHOR_IDS[domain.authorUsername] ?? AUTHOR_IDS.admin;
    if (!categoryId || !authorId) throw new Error(`分类或作者不存在: ${domain.slug}`);

    for (let topicIndex = 0; topicIndex < domain.topics.length; topicIndex += 1) {
      const title = domain.topics[topicIndex];
      const articleId = id('90', articleIndex);
      const slug = `bulk-${domain.slug}-${String(topicIndex + 1).padStart(2, '0')}-${slugify(title).slice(0, 24)}`;
      const content = buildContent(domain, title, articleIndex);
      const excerpt = `${domain.name}专题文章：从真实场景出发，分析${title}的关键问题、常见误区和可执行步骤。`;
      const publishedAt = new Date(Date.UTC(2026, 3, 16 - articleIndex, 8 + (articleIndex % 8), (articleIndex * 7) % 60, 0));
      const domainTagIds = domain.tags.map((tagSlug) => tagBySlug.get(tagSlug)).filter(Boolean) as string[];

      await connection.execute(
        `INSERT INTO articles
          (id, title, slug, summary, content_markdown, content_html, cover_image_url, category_id, status, visibility,
           allow_comment, is_top, sort_order, view_count, like_count, comment_count, seo_title, seo_description,
           seo_keywords, author_id, scheduled_at, published_at, deleted_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', 'public', 1, 0, 0, ?, ?, 0, ?, ?, ?, ?, NULL, ?, NULL, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary), content_markdown = VALUES(content_markdown),
          content_html = VALUES(content_html), cover_image_url = VALUES(cover_image_url), category_id = VALUES(category_id),
          status = 'published', visibility = 'public', view_count = VALUES(view_count), like_count = VALUES(like_count),
          seo_title = VALUES(seo_title), seo_description = VALUES(seo_description), seo_keywords = VALUES(seo_keywords),
          author_id = VALUES(author_id), published_at = VALUES(published_at), deleted_at = NULL, updated_at = CURRENT_TIMESTAMP`,
        [
          articleId,
          title,
          slug,
          excerpt,
          content,
          renderMarkdown(content),
          domain.image,
          categoryId,
          120 + ((articleIndex * 37) % 1600),
          8 + ((articleIndex * 11) % 96),
          title,
          excerpt,
          domain.tags.join(','),
          authorId,
          publishedAt,
          publishedAt,
        ],
      );

      await connection.execute('DELETE FROM article_tags WHERE article_id = ?', [articleId]);
      for (const tagId of domainTagIds) {
        await connection.execute('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)', [articleId, tagId]);
      }
      articleIndex += 1;
    }
  }
}

async function refreshCounts(connection: mysql.Connection) {
  await connection.query(
    `UPDATE categories c
     SET article_count = (
       SELECT COUNT(*) FROM articles a
       WHERE a.category_id = c.id AND a.deleted_at IS NULL
     )`,
  );
  await connection.query(
    `UPDATE tags t
     SET article_count = (
       SELECT COUNT(*)
       FROM article_tags at
       JOIN articles a ON a.id = at.article_id
       WHERE at.tag_id = t.id AND a.deleted_at IS NULL
     )`,
  );
}

async function printSummary(connection: mysql.Connection) {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT
      COUNT(*) AS totalArticles,
      SUM(status = 'published' AND deleted_at IS NULL) AS publishedArticles,
      COUNT(DISTINCT category_id) AS categoriesWithArticles,
      MIN(CHAR_LENGTH(content_markdown)) AS shortestArticle,
      ROUND(AVG(CHAR_LENGTH(content_markdown))) AS averageArticleLength
     FROM articles
     WHERE deleted_at IS NULL`,
  );
  console.log('批量文章扩充完成：', rows[0]);
}

async function bootstrap() {
  loadEnv({ path: resolve(process.cwd(), '.env') });
  const connection = await mysql.createConnection({
    host: getRequiredEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? '3306'),
    user: getRequiredEnv('DB_USERNAME'),
    password: getRequiredEnv('DB_PASSWORD'),
    database: getRequiredEnv('DB_DATABASE'),
    charset: 'utf8mb4',
  });

  try {
    await connection.beginTransaction();
    await ensureTaxonomy(connection);
    await seedArticles(connection);
    await refreshCounts(connection);
    await connection.commit();
    await printSummary(connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

bootstrap().catch((error: unknown) => {
  console.error('批量文章扩充失败。');
  if (error instanceof Error) {
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  } else {
    console.error(error);
  }
  process.exit(1);
});
