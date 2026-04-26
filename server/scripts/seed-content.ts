import { randomUUID } from 'crypto';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

type Role = 'admin' | 'author' | 'user';
type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived';

const ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const DEFAULT_USER_PASSWORD = 'blog123456';
const SOURCE_REFERENCES = [
  'WordPress.com REST API: https://public-api.wordpress.com/rest/v1.1/sites/en.blog.wordpress.com/posts/?number=5',
  'CSS-Tricks RSS: https://css-tricks.com/feed/',
  'Smashing Magazine RSS: https://www.smashingmagazine.com/feed/',
  'freeCodeCamp News RSS: https://www.freecodecamp.org/news/rss/',
  'Unsplash License: https://unsplash.com/license',
];

const users = [
  ['admin', 'admin@example.com', '管理员', '负责站点内容审核、栏目规划和社区秩序维护。', 'admin', ADMIN_ID, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80'],
  ['lin-yu', 'lin.yu@example.com', '林屿', '前端工程师，长期记录组件设计、性能优化和团队协作实践。', 'author', '10000000-0000-4000-8000-000000000001', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80'],
  ['chen-mo', 'chen.mo@example.com', '陈墨', '后端开发者，关注服务稳定性、数据库建模和工程化效率。', 'author', '10000000-0000-4000-8000-000000000002', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80'],
  ['qi-an', 'qi.an@example.com', '齐安', '产品设计师，喜欢把复杂流程拆成清楚、可执行的体验细节。', 'author', '10000000-0000-4000-8000-000000000003', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'],
  ['xia-zhu', 'xia.zhu@example.com', '夏竹', '自由写作者，记录城市观察、阅读札记和创作者工作流。', 'author', '10000000-0000-4000-8000-000000000004', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80'],
  ['he-yan', 'he.yan@example.com', '何砚', '数据分析爱好者，习惯用图表和实验验证日常判断。', 'author', '10000000-0000-4000-8000-000000000005', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80'],
  ['reader-ming', 'reader.ming@example.com', '阿明', '热衷参与讨论的长期读者。', 'user', '10000000-0000-4000-8000-000000000006', 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=256&q=80'],
  ['reader-nora', 'reader.nora@example.com', 'Nora', '关注设计、效率和开源社区的读者。', 'user', '10000000-0000-4000-8000-000000000007', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&q=80'],
  ['reader-kai', 'reader.kai@example.com', '凯', '喜欢从评论区带走一个可执行的小改进。', 'user', '10000000-0000-4000-8000-000000000008', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&q=80'],
] as const;

const categories = [
  ['frontend', '前端工程', '组件、样式、性能和前端架构实践。', '#185c52'],
  ['backend-architecture', '后端与架构', '服务端设计、数据库、接口和可观测性。', '#c6283f'],
  ['product-design', '产品设计', '从用户问题、信息结构到交互细节的复盘。', '#255f85'],
  ['creator-tools', '创作者工具', '写作、自动化、AI 辅助和个人知识管理。', '#8f4a2f'],
  ['data-notes', '数据观察', '数据分析、指标系统和可视化思考。', '#5c4f99'],
  ['lifestyle', '生活方式', '阅读、城市、工作节奏与长期主义。', '#2f6f3e'],
].map(([slug, name, description, color], index) => ({
  id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  slug,
  name,
  description,
  color,
  sortOrder: (index + 1) * 10,
}));

const tags = [
  ['vue', 'Vue'], ['typescript', 'TypeScript'], ['performance', '性能优化'], ['css', 'CSS'],
  ['nestjs', 'NestJS'], ['mysql', 'MySQL'], ['api-design', 'API 设计'], ['observability', '可观测性'],
  ['user-research', '用户研究'], ['information-architecture', '信息架构'], ['writing', '写作'], ['ai-tools', 'AI 工具'],
  ['automation', '自动化'], ['data-visualization', '数据可视化'], ['metrics', '指标体系'], ['reading-notes', '阅读笔记'],
  ['remote-work', '远程协作'], ['open-source', '开源'], ['security', '安全'], ['community', '社区运营'],
].map(([slug, name], index) => ({
  id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  slug,
  name,
}));

const images = [
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1485217988980-11786ced9454?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1526378722484-bd91ca387e72?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=1400&q=80',
];

const articleSeeds = [
  ['make-homepage-first-screen-work', '把首页首屏写成一个真正会工作的入口', '首屏不只是漂亮的开场，它应该帮助读者快速判断站点气质、最新主题和下一步阅读路径。', 'product-design', 'qi-an', ['information-architecture', 'user-research', 'community'], ['先明确首屏唯一任务：让新读者知道这里持续讨论什么，而不是堆满所有入口。', '把最新文章、站点口号和内容统计放在同一条叙事里，可以降低第一次访问的理解成本。', '首屏按钮应指向最有价值的行为，例如阅读最新文章，而不是泛泛地了解更多。'], '成熟博客的首页更像编辑部的当天版面：有主稿、有索引，也有温度。', '2026-04-16 20:35:00', 1280, 86, 'published', true],
  ['vue-list-loading-filter-empty-state', 'Vue 列表页的加载、筛选和空状态细节', '列表页最容易被低估：加载中、无结果、筛选后分页变化，都会影响读者是否继续探索。', 'frontend', 'lin-yu', ['vue', 'typescript', 'performance'], ['列表数据变化时，当前页码需要被约束在有效范围内。', '筛选条件应同步到 URL，这样读者能分享分类页、标签页和搜索结果。', '空状态文案要解释下一步，而不是只告诉用户没有。'], '列表页的好体验来自很多小而稳的状态管理，而不是单个炫目的组件。', '2026-04-15 09:18:00', 913, 64],
  ['nestjs-content-api-permission-boundary', 'NestJS 内容管理接口的权限边界', '后台接口不只需要登录，还要区分作者、管理员和超级管理员能操作的范围。', 'backend-architecture', 'chen-mo', ['nestjs', 'api-design', 'security'], ['认证回答你是谁，授权回答你能动谁的数据。', '作者可以管理自己的文章，管理员可以管理全站内容。', '错误提示要克制，既能帮助正常用户，也不暴露过多内部信息。'], '权限设计越早写清楚，后续功能叠加时越不容易把后台变成补丁现场。', '2026-04-14 17:42:00', 1054, 73],
  ['one-chart-for-healthy-read-growth', '一张图表讲清楚阅读量是不是健康增长', '阅读量增长并不等于社区活跃，结合评论、收藏和回访才更接近真实质量。', 'data-notes', 'he-yan', ['metrics', 'data-visualization', 'community'], ['先把曝光、点击、完整阅读、评论分成四层。', '周同比比日环比稳定，尤其适合内容站这种节奏不完全均匀的产品。', '异常高峰要标注来源，比如外部推荐、活动转发或搜索流量进入。'], '指标不是为了证明增长好看，而是为了知道下一篇内容该往哪里用力。', '2026-04-13 21:09:00', 742, 41],
  ['where-ai-writing-assistant-should-stop', '写作者的 AI 助手应该停在哪一步', 'AI 可以帮忙整理材料、列出反例和改写结构，但最终观点仍要由作者承担。', 'creator-tools', 'xia-zhu', ['ai-tools', 'writing', 'automation'], ['把 AI 当成资料助理，而不是观点替身。', '最适合交给 AI 的步骤是归纳、提问和找盲点。', '发布前需要检查事实、引用和语气。'], '工具越强，作者越需要明确自己的边界和责任。', '2026-04-12 15:26:00', 1198, 95],
  ['where-css-view-transitions-fit', 'CSS 视图过渡适合用在哪里', '视图过渡不是给所有跳转加动画，而是帮助用户理解页面之间的空间关系。', 'frontend', 'lin-yu', ['css', 'performance', 'vue'], ['文章卡片到详情页的过渡有明确对象，用户容易理解。', '动画时长应短，并为低性能设备保留关闭或降级路径。', '过渡不应该改变信息层级，也不应该遮挡关键操作。'], '好的过渡像路标，坏的过渡像噪音。', '2026-04-11 10:07:00', 888, 59],
  ['mysql-category-count-realtime-or-cache', 'MySQL 里的分类计数该实时算还是缓存', '分类和标签的文章数看似简单，但当内容增删改频繁时，需要明确一致性要求。', 'backend-architecture', 'chen-mo', ['mysql', 'api-design', 'performance'], ['展示型计数可以接受秒级不一致，后台审核类计数则不应混用同一策略。', '小站点实时查询足够清晰，数据量上来后再引入缓存字段。', '每次文章标签变更都要刷新旧标签和新标签。'], '缓存不是为了显得高级，而是为了解决明确的读写压力。', '2026-04-10 18:33:00', 689, 38],
  ['async-weekly-report-people-read', '远程协作中的异步周报怎么写才有人读', '异步周报不是流水账，它需要让团队成员在三分钟内看懂进展、风险和请求。', 'creator-tools', 'xia-zhu', ['remote-work', 'writing', 'automation'], ['开头用三句话交代本周结论，比按日期罗列每天做了什么更省力。', '风险需要写清影响、概率和需要谁决策。', '把可复用模板固化下来，团队才有机会形成稳定阅读习惯。'], '异步协作的核心不是少开会，而是让信息在无人解释时依然站得住。', '2026-04-09 22:11:00', 534, 34],
  ['blog-search-page-long-tail-value', '从搜索页看一个博客有没有长尾价值', '当文章越来越多，搜索页会从辅助功能变成内容资产的第二入口。', 'product-design', 'qi-an', ['information-architecture', 'metrics', 'writing'], ['搜索框附近要说明检索范围：标题、摘要、正文还是标签。', '结果数、关键词和空状态会共同决定用户是否愿意调整搜索词。', '常见搜索词可以反向指导栏目规划。'], '搜索页不是技术附属品，它是内容网站的长期记忆入口。', '2026-04-08 12:45:00', 621, 44],
  ['legacy-system-migration-plan-for-non-engineers', '把旧系统迁移计划写给非技术同事看', '迁移旧系统时，最难的常常不是代码，而是让不同角色理解风险和节奏。', 'backend-architecture', 'chen-mo', ['api-design', 'observability', 'remote-work'], ['先解释为什么现在必须迁移，再解释迁移会分成哪些可回滚阶段。', '不要只给技术里程碑，也要给业务可验证的检查点。', '准备一页风险表，列出触发条件、影响范围、负责人和回退方案。'], '旧系统迁移是一项沟通工程，代码只是其中最诚实的一部分。', '2026-04-07 19:50:00', 477, 29],
  ['turn-reading-notes-into-actions', '阅读笔记如何从摘抄变成行动', '好的阅读笔记不只保存金句，还要留下一个能在本周尝试的小实验。', 'lifestyle', 'xia-zhu', ['reading-notes', 'writing', 'metrics'], ['每条摘抄后追加它改变了我哪个判断，能把收藏变成思考。', '为笔记加上场景标签，例如写作、沟通、产品。', '每周复盘时只挑一条笔记行动。'], '读书的收益常常藏在微小试验里，而不在笔记数量里。', '2026-04-06 08:24:00', 864, 72],
  ['frontend-error-log-context', '前端错误日志应该保留哪些上下文', '一次错误上报如果没有用户路径、版本和环境信息，排查效率会大打折扣。', 'frontend', 'lin-yu', ['observability', 'typescript', 'performance'], ['错误类型、路由、用户操作序列和构建版本，是最基础的四类上下文。', '日志要做脱敏，尤其是表单字段和授权信息。', '采样规则应按错误类型区分。'], '可观测性不是多打一行日志，而是让下一次故障少猜一点。', '2026-04-05 16:03:00', 733, 48],
  ['seed-first-comments-for-community', '评论区的第一批互动可以怎样设计', '新博客最怕冷场，第一批评论应帮助读者理解这里欢迎什么样的讨论。', 'product-design', 'qi-an', ['community', 'user-research', 'writing'], ['评论最好围绕具体问题展开，而不是只有礼貌性夸奖。', '作者回复可以补充背景，让后来者看到讨论被认真对待。', '适度展示不同身份的读者，会让社区显得更真实。'], '健康评论区不是靠热闹撑起来的，而是靠清楚的讨论范式。', '2026-04-04 11:37:00', 501, 36],
  ['is-success-field-needed-in-api-response', 'API 返回结构里的 success 字段有必要吗', '统一响应格式能降低前端处理成本，但也要避免让 HTTP 状态和业务状态互相打架。', 'backend-architecture', 'chen-mo', ['api-design', 'nestjs', 'typescript'], ['HTTP 状态码仍然应该表达请求层面的成功或失败。', '前端拦截器可以统一拆包，但类型定义要清楚。', '错误响应要稳定，别让数组、字符串和对象随机切换。'], '统一响应结构的目标是减少判断，而不是制造新的判断。', '2026-04-03 14:20:00', 655, 52],
  ['use-tag-cloud-to-detect-topic-drift', '用标签云发现内容站的主题偏移', '标签云不只是导航，它会诚实暴露站点最近在反复谈什么。', 'data-notes', 'he-yan', ['metrics', 'data-visualization', 'information-architecture'], ['观察标签文章数变化，可以发现写作兴趣是否偏离原定定位。', '热门标签需要和搜索词一起看。', '冷门但高转化标签值得保留。'], '标签云是一张低成本的内容战略体检表。', '2026-04-02 20:05:00', 418, 27],
  ['three-copyright-habits-for-blog-images', '给博客文章配图时的三个版权习惯', '图片能提升阅读体验，但来源、授权和尺寸处理都需要形成稳定习惯。', 'creator-tools', 'xia-zhu', ['writing', 'open-source', 'security'], ['优先使用明确开放授权或可商用图库，并保留来源链接。', '不要把他人文章里的配图另存后重新上传。', '统一压缩参数和裁切比例，能让列表页稳定。'], '版权习惯越日常，内容生产越安心。', '2026-04-01 09:12:00', 590, 46],
  ['what-readme-should-answer-first', '开源项目的 README 应该先回答什么', '一个好 README 先回答这是什么、适合谁、怎么跑起来，而不是一开始罗列所有技术细节。', 'backend-architecture', 'chen-mo', ['open-source', 'writing', 'api-design'], ['README 的第一屏要给出项目定位和最短运行路径。', '环境变量示例比散落在段落里的说明更可靠。', '故障排除应该覆盖真实新手会遇到的问题。'], '文档不是项目的附录，它是新贡献者的第一条路。', '2026-03-31 13:58:00', 472, 33],
  ['city-walk-product-observation', '城市散步如何训练产品观察', '城市里的排队、路标和临时摊位，常常比会议室更能解释真实用户行为。', 'lifestyle', 'qi-an', ['user-research', 'reading-notes', 'community'], ['观察人们如何绕过规则，往往能发现流程设计里的摩擦。', '临时手写标识说明系统没有覆盖某个高频场景。', '把观察记录成场景、行为、原因猜测、可验证问题四列。'], '产品敏感度不是坐出来的，很多时候是走出来的。', '2026-03-30 19:04:00', 389, 31],
  ['simplify-dashboard-for-small-teams', '给小团队的数据看板减负', '小团队不需要一开始就拥有几十个指标，而需要能指导下周行动的几个信号。', 'data-notes', 'he-yan', ['metrics', 'data-visualization', 'remote-work'], ['先选三个指标：内容产出、有效阅读和互动质量。', '每个指标都要对应一个行动问题。', '看板应保留备注区，记录活动、异常和版本发布。'], '少一点指标，多一点解释，团队才会真的使用看板。', '2026-03-29 10:16:00', 351, 24],
  ['frontend-performance-checklist-before-release', '一次发布前的前端性能检查清单', '发布前不需要玄学调优，而需要一张覆盖图片、脚本、路由和回退状态的短清单。', 'frontend', 'lin-yu', ['performance', 'css', 'typescript'], ['检查首屏图片尺寸和格式，避免让一张图拖慢整个页面。', '路由级拆包要配合加载状态。', '移动端和弱网至少走一遍关键路径。'], '性能优化最可靠的开始，是把每次发布都变成一次小体检。', '2026-03-28 21:30:00', 790, 63],
  ['what-drafts-are-worth-keeping', '草稿箱里应该留下哪些未完成的文章', '不是所有未完成都值得保留，好的草稿应该有明确问题、素材来源和下一步。', 'lifestyle', 'xia-zhu', ['writing', 'reading-notes', 'automation'], ['只保留那些能用一句话说明问题意识的草稿。', '素材如果三个月没有补充，说明它可能只是一个标题冲动。', '草稿下一步最好具体到补一个案例或删掉第二节。'], '草稿箱不是仓库，而是下一轮写作的候车室。', '2026-03-27 12:08:00', 0, 0, 'draft'],
  ['when-scheduled-publishing-makes-sense', '定时发布适合哪些内容节奏', '定时发布能保持节奏，但不能替代选题判断和发布后的互动维护。', 'creator-tools', 'admin', ['automation', 'writing', 'community'], ['教程、周报和系列文章适合定时，突发观点稿更适合人工判断发布时间。', '定时发布前要检查封面、摘要、SEO 和关联标签是否完整。', '发布后仍需要有人观察评论区。'], '定时发布管理的是节奏，不是责任。', '2026-04-18 09:00:00', 0, 0, 'scheduled'],
] as const;

const pages = [
  ['50000000-0000-4000-8000-000000000001', '关于山海手记', 'about', 'about', '这里记录工程、产品、写作和生活观察，像一间持续亮灯的小编辑部。', false, ['# 关于山海手记', '', '山海手记是一座偏实践的中文博客。我们关心技术如何被真正使用，也关心一篇文章能否帮读者在当天就做出一个小改进。', '', '站点目前由几位作者共同维护，主题覆盖前端工程、后端架构、产品设计、创作者工具、数据观察和生活方式。文章正文均为原创整理，公开来源只用于选题趋势、图片授权和事实核验，不复制第三方正文。', '', '## 内容原则', '', '- 先讲清问题，再展示方法。', '- 保留取舍过程，不把结论伪装成唯一答案。', '- 尊重版权，引用公开资料时尽量只引用必要事实和链接。'].join('\n')],
  ['50000000-0000-4000-8000-000000000002', '阅读与评论指南', 'help', 'custom', '如何搜索文章、参与评论、申请友链，以及理解本站内容来源。', true, ['# 阅读与评论指南', '', '你可以通过首页、分类页、标签页和搜索页浏览内容。搜索会匹配文章标题、摘要和正文，因此建议使用具体词，例如 Vue、API 设计、评论区。', '', '## 评论建议', '', '- 说清你的场景，比单纯表达赞同更容易引发有效讨论。', '- 如果发现事实错误，可以直接指出来源和修正建议。', '- 请避免人身攻击、广告和无关链接。', '', '## 内容来源说明', '', '本站本次初始化参考了 WordPress.com 公共 REST API、CSS-Tricks RSS、Smashing Magazine RSS、freeCodeCamp News RSS 的公开标题、分类、发布日期等元信息，用来判断近期博客平台的内容趋势。正文为原创中文内容，封面优先使用 Unsplash 可公开访问图片资源。'].join('\n')],
  ['50000000-0000-4000-8000-000000000003', '投稿说明', 'contribute', 'custom', '欢迎工程实践、产品复盘、读书札记和工具工作流类文章。', true, ['# 投稿说明', '', '我们欢迎带有真实问题和明确经验边界的文章。你不需要把每个观点写成定论，但需要让读者知道它来自什么场景。', '', '## 推荐结构', '', '1. 问题背景：你遇到了什么，为什么它值得写。', '2. 处理过程：你尝试过哪些方案，为什么保留或放弃。', '3. 可复用经验：读者可以如何判断自己是否适用。', '4. 参考资料：列出必要链接，避免大段复制。'].join('\n')],
  ['50000000-0000-4000-8000-000000000004', '作者与专题', 'authors-and-series', 'portfolio', '认识站内作者和正在持续更新的内容专题。', true, ['# 作者与专题', '', '- 林屿：前端组件、CSS、性能和 Vue 工程化。', '- 陈墨：NestJS、MySQL、接口设计和系统迁移。', '- 齐安：产品体验、信息架构和社区互动。', '- 夏竹：写作流程、AI 工具、阅读笔记和生活方式。', '- 何砚：指标体系、数据可视化和内容运营分析。'].join('\n')],
] as const;

const friendLinks = [
  ['60000000-0000-4000-8000-000000000001', 'WordPress.com Blog', 'https://en.blog.wordpress.com/', 'https://s0.wp.com/i/webclip.png', '关注博客平台、创作者案例和内容发布实践的官方博客。'],
  ['60000000-0000-4000-8000-000000000002', 'CSS-Tricks', 'https://css-tricks.com/', 'https://css-tricks.com/favicon.ico', '前端开发、CSS 技巧和 Web 平台变化的长期读物。'],
  ['60000000-0000-4000-8000-000000000003', 'Smashing Magazine', 'https://www.smashingmagazine.com/', 'https://www.smashingmagazine.com/images/favicon/favicon.svg', '设计、前端、UX 和数字产品实践文章。'],
  ['60000000-0000-4000-8000-000000000004', 'freeCodeCamp News', 'https://www.freecodecamp.org/news/', 'https://www.freecodecamp.org/favicon-32x32.png', '面向开发者的教程、工程实践和学习路线。'],
] as const;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`缺少必需环境变量: ${name}`);
  return value;
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
      if (line.startsWith('> ')) return `<blockquote>${escapeHtml(line.slice(2))}</blockquote>`;
      if (!line.trim()) return '';
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('\n')
    .replace(/(?:<li>.*<\/li>\n?)+/g, (match) => `<ul>\n${match}</ul>\n`);
}

function articleContent(seed: (typeof articleSeeds)[number]): string {
  const [, title, excerpt, category, , , points, takeaway] = seed;
  const theme = {
    frontend: '前端体验与工程细节',
    'backend-architecture': '系统设计与内容后台',
    'product-design': '产品体验和社区参与',
    'data-notes': '数据判断与运营复盘',
    'creator-tools': '创作者工作流',
    lifestyle: '长期生活观察',
  }[category] ?? '博客内容实践';
  return [
    `# ${title}`,
    '',
    excerpt,
    '',
    '## 为什么现在值得讨论',
    '',
    `最近公开博客平台里，关于${theme}的选题明显变多。对一个成熟博客来说，这类主题不能只停留在观点层面，还要落到页面、接口、数据和读者反馈里。`,
    '',
    '## 可执行的做法',
    '',
    ...points.map((point) => `- ${point}`),
    '',
    '## 一个容易忽略的取舍',
    '',
    `这件事最容易被误解为“多做一点就更好”。实际情况往往相反：如果没有明确目标，${title} 会增加维护成本。更稳妥的方式是先确定一个小场景，验证它能带来更清楚的阅读、协作或判断，再决定是否扩展。`,
    '',
    '## 小结',
    '',
    takeaway,
    '',
    '> 内容说明：本文参考公开博客平台的标题、分类、发布日期等元信息进行选题规划，正文为本站原创整理，不复制第三方正文。',
  ].join('\n');
}

async function upsertSetting(connection: mysql.Connection, key: string, value: unknown, valueType: 'string' | 'json', groupName: string, description: string, isPublic = true) {
  await connection.execute(
    `INSERT INTO site_settings (setting_key, setting_value, value_type, group_name, description, is_public)
     VALUES (?, CAST(? AS JSON), ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), value_type = VALUES(value_type),
      group_name = VALUES(group_name), description = VALUES(description), is_public = VALUES(is_public), updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value), valueType, groupName, description, isPublic ? 1 : 0],
  );
}

async function seedUsers(connection: mysql.Connection) {
  const userHash = await bcrypt.hash(DEFAULT_USER_PASSWORD, 10);
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? 'admin123456', 10);
  for (const [username, email, nickname, bio, role, id, avatar] of users) {
    await connection.execute(
      `INSERT INTO users (id, username, email, password_hash, nickname, avatar_url, bio, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE email = VALUES(email), password_hash = IF(username = 'admin', VALUES(password_hash), password_hash),
        nickname = VALUES(nickname), avatar_url = VALUES(avatar_url), bio = VALUES(bio), role = VALUES(role), status = 'active', updated_at = CURRENT_TIMESTAMP`,
      [id, username, email, username === 'admin' ? adminHash : userHash, nickname, avatar, bio, role as Role],
    );
  }

  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT id, username FROM users WHERE username IN (${users.map(() => '?').join(',')})`,
    users.map(([username]) => username),
  );

  return new Map(rows.map((row) => [String(row.username), String(row.id)]));
}

async function seedTaxonomy(connection: mysql.Connection) {
  for (const category of categories) {
    await connection.execute(
      `INSERT INTO categories (id, name, slug, description, color, sort_order, article_count, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), color = VALUES(color),
        sort_order = VALUES(sort_order), is_visible = 1, updated_at = CURRENT_TIMESTAMP`,
      [category.id, category.name, category.slug, category.description, category.color, category.sortOrder],
    );
  }
  for (const tag of tags) {
    await connection.execute(
      `INSERT INTO tags (id, name, slug, article_count) VALUES (?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP`,
      [tag.id, tag.name, tag.slug],
    );
  }
}

async function seedArticles(connection: mysql.Connection, userByName: Map<string, string>) {
  const categoryBySlug = new Map(categories.map((item) => [item.slug, item.id]));
  const tagBySlug = new Map(tags.map((item) => [item.slug, item.id]));
  for (let index = 0; index < articleSeeds.length; index += 1) {
    const seed = articleSeeds[index];
    const [slug, title, excerpt, categorySlug, username, tagSlugs, , , publishedAt, views, likes, rawStatus, isTop] = seed;
    const id = `40000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const status = (rawStatus ?? 'published') as ArticleStatus;
    const content = articleContent(seed);
    const categoryId = categoryBySlug.get(categorySlug);
    const authorId = userByName.get(username);
    if (!categoryId || !authorId) {
      throw new Error(`文章 ${slug} 的分类或作者不存在`);
    }
    const values: mysql.ExecuteValues = [
      id, title, slug, excerpt, content, renderMarkdown(content), images[index % images.length],
      categoryId, status, isTop ? 1 : 0, isTop ? 100 : 0, views, likes,
      title, excerpt, tagSlugs.join(','), authorId,
      status === 'scheduled' ? publishedAt : null, status === 'published' ? publishedAt : null, publishedAt,
    ];
    await connection.execute(
      `INSERT INTO articles
       (id, title, slug, summary, content_markdown, content_html, cover_image_url, category_id, status, visibility,
        allow_comment, is_top, sort_order, view_count, like_count, comment_count, seo_title, seo_description,
        seo_keywords, author_id, scheduled_at, published_at, deleted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', 1, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NULL, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary), content_markdown = VALUES(content_markdown),
        content_html = VALUES(content_html), cover_image_url = VALUES(cover_image_url), category_id = VALUES(category_id),
        status = VALUES(status), visibility = 'public', allow_comment = 1, is_top = VALUES(is_top), sort_order = VALUES(sort_order),
        view_count = VALUES(view_count), like_count = VALUES(like_count), seo_title = VALUES(seo_title),
        seo_description = VALUES(seo_description), seo_keywords = VALUES(seo_keywords), author_id = VALUES(author_id),
        scheduled_at = VALUES(scheduled_at), published_at = VALUES(published_at), deleted_at = NULL, updated_at = CURRENT_TIMESTAMP`,
      values,
    );
    await connection.execute('DELETE FROM article_tags WHERE article_id = ?', [id]);
    for (const tagSlug of tagSlugs) {
      const tagId = tagBySlug.get(tagSlug);
      if (!tagId) {
        throw new Error(`文章 ${slug} 的标签 ${tagSlug} 不存在`);
      }
      await connection.execute('INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)', [id, tagId]);
    }
  }
}

async function seedPages(connection: mysql.Connection, adminId: string) {
  for (const [id, title, slug, pageType, summary, isHomeVisible, content] of pages) {
    await connection.execute(
      `INSERT INTO pages (id, title, slug, page_type, content_markdown, content_html, summary, is_home_visible,
        status, seo_title, seo_description, published_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, CURRENT_TIMESTAMP, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), page_type = VALUES(page_type), content_markdown = VALUES(content_markdown),
        content_html = VALUES(content_html), summary = VALUES(summary), is_home_visible = VALUES(is_home_visible),
        status = 'published', seo_title = VALUES(seo_title), seo_description = VALUES(seo_description),
        updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP`,
      [id, title, slug, pageType, content, renderMarkdown(content), summary, isHomeVisible ? 1 : 0, title, summary, adminId, adminId],
    );
  }
}

async function seedFriendLinks(connection: mysql.Connection) {
  for (let index = 0; index < friendLinks.length; index += 1) {
    const [id, siteName, siteUrl, logoUrl, description] = friendLinks[index];
    await connection.execute(
      `INSERT INTO friend_links (id, site_name, site_url, logo_url, description, contact_email, applicant_name, sort_order, status, approved_at)
       VALUES (?, ?, ?, ?, ?, NULL, '内容编辑部', ?, 'approved', CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE site_name = VALUES(site_name), site_url = VALUES(site_url), logo_url = VALUES(logo_url),
        description = VALUES(description), sort_order = VALUES(sort_order), status = 'approved',
        approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP`,
      [id, siteName, siteUrl, logoUrl, description, (index + 1) * 10],
    );
  }
}

async function seedComments(connection: mysql.Connection, userByName: Map<string, string>) {
  const articleIds = articleSeeds.map((_, index) => `40000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
  await connection.query(`DELETE FROM comments WHERE article_id IN (${articleIds.map(() => '?').join(',')})`, articleIds);
  const readers = users.filter(([, , , , role]) => role === 'user');
  const authors = users.filter(([, , , , role]) => role === 'author');
  const templates = [
    '这篇里“{point}”很有启发，我准备在自己的项目里先试一版。',
    '读完后最大的收获是把问题拆小了。以前我会直接跳到方案。',
    '这里有个细节想确认：如果团队规模更小，执行成本会不会过高？',
    '喜欢这种写法，既有结论也有边界，可以直接放进下周复盘。',
    '我遇到过类似情况，最后也是先从最小流程改起，再慢慢补工具。',
    '建议后面可以补一篇案例，讲讲失败版本是什么样的，会更完整。',
  ];
  for (let i = 0; i < articleSeeds.length; i += 1) {
    const seed = articleSeeds[i];
    const status = (seed[11] ?? 'published') as ArticleStatus;
    if (status !== 'published') continue;
    const articleId = articleIds[i];
    const [, , , , authorUsername, , points, , publishedAt] = seed;
    const count = 2 + (i % 4);
    const baseDate = new Date(`${publishedAt.replace(' ', 'T')}+08:00`);
    let firstCommentId = '';
    for (let j = 0; j < count; j += 1) {
      const user = j % 3 === 0 ? readers[(i + j) % readers.length] : authors[(i + j) % authors.length];
      const id = randomUUID();
      if (j === 0) firstCommentId = id;
      const createdAt = new Date(baseDate.getTime() + (j + 1) * 3600 * 1000);
      await connection.execute(
        `INSERT INTO comments (id, article_id, parent_id, user_id, author_name, author_email, author_website, content,
          ip_address, user_agent, like_count, status, replied_at, created_at, updated_at, deleted_at)
         VALUES (?, ?, NULL, ?, ?, ?, NULL, ?, ?, 'Mozilla/5.0 SeedContentBot/1.0', ?, 'approved', NULL, ?, ?, NULL)`,
        [
          id, articleId, userByName.get(user[0]) ?? null, user[2], user[1],
          templates[(i + j) % templates.length].replace('{point}', points[j % points.length]),
          `192.168.${i % 8}.${20 + j}`, (i + j) % 9, createdAt, createdAt,
        ],
      );
    }
    if (i % 3 === 0 && firstCommentId) {
      const author = users.find(([username]) => username === authorUsername) ?? users[0];
      const replyAt = new Date(baseDate.getTime() + 8 * 3600 * 1000);
      await connection.execute(
        `INSERT INTO comments (id, article_id, parent_id, user_id, author_name, author_email, author_website, content,
          ip_address, user_agent, like_count, status, replied_at, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, '192.168.10.10', 'Mozilla/5.0 SeedContentBot/1.0', 0, 'approved', ?, ?, ?, NULL)`,
        [randomUUID(), articleId, firstCommentId, userByName.get(author[0]) ?? null, author[2], author[1], '补充一个上下文：这篇的建议更适合从小范围试点开始，欢迎后续把实践结果贴回来。', replyAt, replyAt, replyAt],
      );
    }
  }
}

async function refreshCounts(connection: mysql.Connection) {
  const articleIds = articleSeeds.map((_, index) => `40000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
  await connection.query(
    `UPDATE articles a SET comment_count = (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id AND c.status = 'approved' AND c.deleted_at IS NULL)
     WHERE a.id IN (${articleIds.map(() => '?').join(',')})`,
    articleIds,
  );
  await connection.query(
    `UPDATE categories c SET article_count = (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id AND a.deleted_at IS NULL)
     WHERE c.id IN (${categories.map(() => '?').join(',')})`,
    categories.map((item) => item.id),
  );
  await connection.query(
    `UPDATE tags t SET article_count = (
       SELECT COUNT(*) FROM article_tags at JOIN articles a ON a.id = at.article_id
       WHERE at.tag_id = t.id AND a.deleted_at IS NULL
     ) WHERE t.id IN (${tags.map(() => '?').join(',')})`,
    tags.map((item) => item.id),
  );
}

async function seedSettings(connection: mysql.Connection) {
  await upsertSetting(connection, 'site_title', '山海手记', 'string', 'general', '博客标题');
  await upsertSetting(connection, 'site_subtitle', '把工程、产品和日常观察写成可复用的经验', 'string', 'general', '副标题');
  await upsertSetting(connection, 'site_description', '一个由多位作者共同维护的中文博客，关注前端、后端、产品设计、创作者工具、数据观察和生活方式。', 'string', 'general', '站点描述');
  await upsertSetting(connection, 'site_icp', '内容演示站点，无备案展示', 'string', 'general', '备案信息');
  await upsertSetting(connection, 'site_copyright', `© ${new Date().getFullYear()} 山海手记`, 'string', 'general', '版权信息');
  await upsertSetting(connection, 'social_links', [
    { label: 'GitHub', url: 'https://github.com/' },
    { label: 'RSS', url: 'https://www.freecodecamp.org/news/rss/' },
    { label: 'WordPress.com', url: 'https://en.blog.wordpress.com/' },
  ], 'json', 'general', '社交链接');
  await upsertSetting(connection, 'content_source_references', SOURCE_REFERENCES, 'json', 'content', '本次内容初始化参考的公开来源', false);
}

async function printSummary(connection: mysql.Connection) {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM categories) AS categories,
      (SELECT COUNT(*) FROM tags) AS tags,
      (SELECT COUNT(*) FROM articles WHERE deleted_at IS NULL) AS articles,
      (SELECT COUNT(*) FROM articles WHERE status = 'published' AND deleted_at IS NULL) AS publishedArticles,
      (SELECT COUNT(*) FROM comments WHERE status = 'approved' AND deleted_at IS NULL) AS comments,
      (SELECT COUNT(*) FROM pages WHERE status = 'published') AS pages,
      (SELECT COUNT(*) FROM friend_links WHERE status = 'approved') AS friendLinks`,
  );
  console.log('内容填充完成：', rows[0]);
  console.log('默认模拟用户密码：', DEFAULT_USER_PASSWORD);
}

async function bootstrap() {
  loadEnv({ path: resolve(process.cwd(), '.env') });
  const port = Number(process.env.DB_PORT ?? '3306');
  const connection = await mysql.createConnection({
    host: requiredEnv('DB_HOST'),
    port,
    user: requiredEnv('DB_USERNAME'),
    password: requiredEnv('DB_PASSWORD'),
    database: requiredEnv('DB_DATABASE'),
    charset: 'utf8mb4',
  });
  try {
    await connection.beginTransaction();
    const userByName = await seedUsers(connection);
    const adminId = userByName.get('admin');
    if (!adminId) {
      throw new Error('缺少管理员用户，无法继续写入页面与内容数据');
    }
    await seedTaxonomy(connection);
    await seedArticles(connection, userByName);
    await seedPages(connection, adminId);
    await seedFriendLinks(connection);
    await seedComments(connection, userByName);
    await refreshCounts(connection);
    await seedSettings(connection);
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
  console.error('内容填充失败。');
  if (error instanceof Error) {
    console.error(error.message);
    if (error.stack) console.error(error.stack);
  } else {
    console.error(error);
  }
  process.exit(1);
});
