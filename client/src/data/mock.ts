import type {
  Article,
  Author,
  Category,
  CustomPage,
  FriendLink,
  LinkItem,
  SiteSettings,
  SiteStats,
  Tag,
} from "@/types/blog";

export const author: Author = {
  id: "admin-001",
  username: "admin",
  nickname: "纸上码头",
  role: "admin",
  bio: "记录工程、阅读和独立项目的长期主义笔记。",
};

export const categories: Category[] = [
  {
    id: "cat-frontend",
    name: "前端工程",
    slug: "frontend",
    description: "组件、交互、性能和可维护性。",
    articleCount: 12,
    color: "#185c52",
  },
  {
    id: "cat-backend",
    name: "后端架构",
    slug: "backend",
    description: "NestJS、数据库、缓存和接口设计。",
    articleCount: 8,
    color: "#255f85",
  },
  {
    id: "cat-notes",
    name: "生活札记",
    slug: "notes",
    description: "读书、城市观察和日常灵感。",
    articleCount: 6,
    color: "#c6283f",
  },
];

export const tags: Tag[] = [
  { id: "tag-vue", name: "Vue3", slug: "vue3", articleCount: 10 },
  { id: "tag-nest", name: "NestJS", slug: "nestjs", articleCount: 7 },
  { id: "tag-mysql", name: "MySQL", slug: "mysql", articleCount: 5 },
  { id: "tag-markdown", name: "Markdown", slug: "markdown", articleCount: 9 },
  { id: "tag-design", name: "Design", slug: "design", articleCount: 4 },
];

export const articles: Article[] = [
  {
    id: "article-001",
    title: "把博客做成一间有窗的工作室",
    slug: "blog-as-studio",
    excerpt:
      "从信息架构、内容流和后台管理开始，让个人博客先成为能持续写作的地方。",
    content:
      "个人博客的第一版不必追求复杂社区能力。先把文章、分类、标签、关于页和搜索跑通，内容生产就有了稳定的入口。后续再接入评论、订阅、统计和媒体库，会更像顺着骨架自然长出来。",
    coverImage:
      "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=80",
    status: "published",
    viewCount: 2480,
    likes: 126,
    commentCount: 18,
    author,
    category: categories[0],
    tags: [tags[0], tags[3], tags[4]],
    publishedAt: "2026-04-12T10:20:00.000Z",
    createdAt: "2026-04-10T09:00:00.000Z",
    updatedAt: "2026-04-12T10:20:00.000Z",
  },
  {
    id: "article-002",
    title: "NestJS 接口返回体和前端类型约束",
    slug: "nestjs-response-contract",
    excerpt:
      "把统一响应格式落实到前端 request 层，减少页面里重复处理成功与错误状态。",
    content:
      "后端已经通过拦截器输出 success、statusCode、data 和 timestamp。前端可以在 axios 实例中收敛响应结构，再用 ApiResponse 泛型约束业务数据，页面组件只关心渲染和交互。",
    coverImage:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1400&q=80",
    status: "published",
    viewCount: 1730,
    likes: 88,
    commentCount: 14,
    author,
    category: categories[1],
    tags: [tags[1], tags[2]],
    publishedAt: "2026-04-08T14:00:00.000Z",
    createdAt: "2026-04-07T19:40:00.000Z",
    updatedAt: "2026-04-08T14:00:00.000Z",
  },
  {
    id: "article-003",
    title: "Markdown 编辑器的第一批取舍",
    slug: "markdown-editor-decisions",
    excerpt: "草稿保存、代码高亮、封面图和摘要字段，先服务写作者的真实节奏。",
    content:
      "富文本编辑器很容易变成庞然大物。MVP 阶段可以先采用 Markdown，配合自动保存、预览、摘要和封面图字段。它足够轻，又能保持技术博客需要的代码表达能力。",
    coverImage:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    status: "published",
    viewCount: 980,
    likes: 57,
    commentCount: 10,
    author,
    category: categories[0],
    tags: [tags[0], tags[3]],
    publishedAt: "2026-04-01T08:30:00.000Z",
    createdAt: "2026-03-30T20:15:00.000Z",
    updatedAt: "2026-04-01T08:30:00.000Z",
  },
];

export const links: LinkItem[] = [
  {
    id: "link-001",
    name: "Vue 官方文档",
    url: "https://vuejs.org/",
    description: "Vue 3 生态、组合式 API 和最佳实践。",
  },
  {
    id: "link-002",
    name: "NestJS 官方文档",
    url: "https://docs.nestjs.com/",
    description: "后端模块、守卫、管道和拦截器。",
  },
  {
    id: "link-003",
    name: "Tailwind CSS",
    url: "https://tailwindcss.com/",
    description: "快速构建一致、响应式的界面样式。",
  },
];

export const pages: CustomPage[] = [
  {
    id: "page-about",
    title: "关于我",
    slug: "about",
    pageType: "about",
    summary: "记录工程、阅读和独立项目的长期主义笔记。",
    content:
      "# 关于我\n\n你好，我是纸上码头。这里记录前端工程、后端架构、阅读札记和那些慢慢打磨的独立项目。\n\n我喜欢把复杂问题拆成能复用的结构，也喜欢把项目做成可以长期维护的形状。\n\n## 联系方式\n\n- 邮箱：[hello@example.com](mailto:hello@example.com)\n- GitHub：[github.com/example](https://github.com/example)\n- 城市：深圳\n\n## 正在关注\n\n- Vue 与 NestJS 的工程化实践\n- 内容系统的信息架构\n- 个人知识库和长期写作",
    contentHtml: null,
    isHomeVisible: true,
    status: "published",
    seoTitle: "关于我",
    seoDescription: "纸上码头的个人简介、联系方式和长期项目。",
    publishedAt: "2026-04-14T10:00:00.000Z",
    createdAt: "2026-04-14T09:00:00.000Z",
    updatedAt: "2026-04-14T10:00:00.000Z",
  },
  {
    id: "page-portfolio",
    title: "作品集",
    slug: "portfolio",
    pageType: "portfolio",
    summary: "一些正在生长的产品、实验和工程样本。",
    content:
      "# 作品集\n\n这里收集长期项目、产品实验和工程样本。每个项目都尽量留下目标、过程、取舍和结果。\n\n## 项目清单\n\n- 个人博客系统：文章、分类、标签、页面管理和后台管理。\n- Markdown 写作台：面向技术写作的轻量编辑体验。\n- 内容索引器：把分散资料整理成可检索的主题线索。\n\n> 好作品不是一次性完成的，它们会在使用中继续长出新的边界。",
    contentHtml: null,
    isHomeVisible: true,
    status: "published",
    seoTitle: "作品集",
    seoDescription: "纸上码头的项目、作品和工程样本。",
    publishedAt: "2026-04-15T10:00:00.000Z",
    createdAt: "2026-04-15T09:00:00.000Z",
    updatedAt: "2026-04-15T10:00:00.000Z",
  },
];

export const friendLinks: FriendLink[] = links.map((link, index) => ({
  id: link.id,
  siteName: link.name,
  siteUrl: link.url,
  logoUrl: null,
  description: link.description,
  contactEmail: null,
  applicantName: null,
  sortOrder: index + 1,
  status: "approved",
  approvedAt: "2026-04-15T08:00:00.000Z",
  createdAt: "2026-04-15T08:00:00.000Z",
  updatedAt: "2026-04-15T08:00:00.000Z",
}));

export const siteStats: SiteStats = {
  articles: 26,
  views: 5190,
  comments: 42,
};

export const siteSettings: SiteSettings = {
  title: "纸上码头",
  subtitle: "工程、阅读与长期项目",
  description: "一座安静但能持续生长的个人博客。",
  icp: "粤ICP备00000000号",
  copyright: "Copyright 2026 纸上码头",
  socialLinks: [
    { label: "GitHub", url: "https://github.com/example" },
    { label: "邮箱", url: "mailto:hello@example.com" },
    { label: "RSS", url: "/rss.xml" },
  ],
};
