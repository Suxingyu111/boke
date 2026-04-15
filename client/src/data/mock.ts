import type {
  Article,
  Author,
  Category,
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
};
