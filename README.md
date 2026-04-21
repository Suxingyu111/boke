# 📝 个人博客系统 (Personal Blog System)

一个功能完善的全栈博客系统，采用 **Vue 3 + NestJS** 架构，支持文章管理、评论系统、付费内容、多语言、SEO 优化、访客统计等 **26 个功能模块**。

---

## 📑 目录

- [技术栈](#-技术栈)
- [系统架构](#-系统架构)
- [功能总览](#-功能总览)
- [前端功能详情](#-前端功能详情)
- [后端 API 模块详情](#-后端-api-模块详情)
- [数据库设计](#-数据库设计)
- [快速启动](#-快速启动)
- [项目脚本](#-项目脚本)
- [环境变量配置](#-环境变量配置)
- [项目结构](#-项目结构)

---

## 🛠 技术栈

### 前端 (Client)

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue 3 | ^3.5 | 前端框架 (Composition API) |
| Vue Router | ^4.6 | 路由管理 |
| Pinia | ^3.0 | 状态管理 |
| Vite | ^8.0 | 构建工具 |
| TypeScript | ~6.0 | 类型安全 |
| Tailwind CSS | ^3.4 | 原子化 CSS 框架 |
| Axios | ^1.15 | HTTP 请求 |
| Playwright | ^1.56 | E2E 测试 |

### 后端 (Server)

| 技术 | 版本 | 说明 |
|------|------|------|
| NestJS | ^10.2 | 后端框架 |
| TypeORM | ^0.3 | ORM 数据库操作 |
| MySQL | 8.0 | 关系型数据库 |
| Redis | 7 (Alpine) | 缓存与会话 |
| Elasticsearch | 8.13 | 全文搜索引擎 |
| Passport + JWT | ^11.0 | 身份认证 |
| Swagger | ^7.4 | API 文档 |
| Sharp | ^0.34 | 图片处理与压缩 |
| Nodemailer | ^8.0 | 邮件发送 |
| Helmet | ^8.1 | 安全中间件 |
| class-validator | ^0.14 | 数据验证 |
| Docker | - | 容器化部署 |

---

## 🏗 系统架构

```
┌──────────────────────────────────────────────────────┐
│                   用户浏览器                          │
│            Vue 3 + Tailwind CSS + Pinia              │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP/REST API
                   ▼
┌──────────────────────────────────────────────────────┐
│                 NestJS API 服务器                     │
│                                                      │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │ Controllers│ │  Services  │ │ Guards/Pipes/     │ │
│  │ (26 模块)  │ │ (业务逻辑) │ │ Interceptors     │ │
│  └────────────┘ └────────────┘ └──────────────────┘ │
└────────┬──────────────┬──────────────┬───────────────┘
         │              │              │
         ▼              ▼              ▼
┌──────────────┐ ┌────────────┐ ┌───────────────┐
│  MySQL 8.0   │ │  Redis 7   │ │ Elasticsearch │
│  (26 张表)   │ │  (缓存)    │ │ 8.13 (搜索)   │
└──────────────┘ └────────────┘ └───────────────┘
```

---

## 🎯 功能总览

### 核心内容管理
| 功能 | 说明 | 状态 |
|------|------|------|
| 📄 文章管理 | CRUD、草稿/发布/定时发布/归档、版本历史、导出 | ✅ |
| 📂 分类管理 | 层级分类、排序、颜色标识、可见性控制 | ✅ |
| 🏷️ 标签管理 | 标签云、文章计数、Slug 唯一性 | ✅ |
| 📑 自定义页面 | 关于、简历、作品集等多类型页面 | ✅ |
| 📚 文章系列 | 多篇文章组成系列、排序管理 | ✅ |
| 🔍 全文搜索 | Elasticsearch 搜索 + 数据库降级方案 | ✅ |
| 📅 文章归档 | 按年月分组的时间线归档 | ✅ |

### 用户与认证
| 功能 | 说明 | 状态 |
|------|------|------|
| 🔐 JWT 认证 | 注册/登录、bcrypt 密码加密、角色控制 | ✅ |
| 👤 用户管理 | 个人资料、头像上传压缩、密码修改 | ✅ |
| 🛡️ 权限控制 | super_admin/admin/author/user 四级角色 | ✅ |
| ⏱️ 请求限流 | 登录/注册接口独立限流、全局限流 | ✅ |

### 社区互动
| 功能 | 说明 | 状态 |
|------|------|------|
| 💬 评论系统 | 嵌套回复、审核管理、IP 追踪 | ✅ |
| 📖 留言板 | 访客留言、审核、管理员回复 | ✅ |
| ⭐ 文章收藏 | 收藏/取消收藏、批量检查 | ✅ |
| 🔔 站内通知 | 评论回复通知、系统通知、已读管理 | ✅ |
| 📢 公告管理 | 发布/置顶公告 | ✅ |

### 运营与变现
| 功能 | 说明 | 状态 |
|------|------|------|
| 💰 付费内容 | 文章定价、预览百分比、购买记录 | ✅ |
| 📧 邮件订阅 | 订阅确认、退订、新文章通知推送 | ✅ |
| 🔗 友情链接 | 链接展示、申请提交、审核管理 | ✅ |
| 📊 访客统计 | PV/UV、设备/浏览器/OS、来源分析 | ✅ |

### 系统管理
| 功能 | 说明 | 状态 |
|------|------|------|
| ⚙️ 站点设置 | 标题/描述/Logo/SEO/社交链接等 | ✅ |
| 🌐 SEO 优化 | OG 标签、Sitemap 生成、Meta 管理 | ✅ |
| 🌍 国际化 (i18n) | 中文/英文切换、自定义翻译覆盖 | ✅ |
| 💾 数据备份 | MySQL 备份/恢复/下载/删除 | ✅ |
| 📝 操作日志 | 全局自动记录管理操作审计日志 | ✅ |
| 🏥 健康检查 | MySQL + Redis 连通性检测 | ✅ |
| 🤝 多人协作 | 草稿协作编辑、权限管理、变更记录 | ✅ |
| 🖼️ 媒体库 | 文件上传、SHA256 去重、类型校验 | ✅ |
| 📰 仪表盘 | 文章/评论/浏览统计、近期文章 | ✅ |

---

## 🖥 前端功能详情

### 公共页面

#### 🏠 首页 (HomeView)
- **轮播图**：Top 5 热门文章自动轮播（5 秒间隔，悬停暂停）
- **文章列表**：最新 10 篇已发布文章，双列瀑布流布局
- **响应式设计**：移动端单列、桌面端双列
- 懒加载图片、空状态提示

#### 📄 文章详情 (ArticleDetailView)
- **面包屑导航** + 标题/摘要/作者信息
- **元信息展示**：发布时间、预计阅读时间、阅读量、点赞、评论数
- **分享功能**：原生分享、微博、X/Twitter、复制链接
- **目录导航**：根据 h2/h3 标题生成，移动端可折叠
- **阅读进度条**：页面顶部进度指示器
- **付费内容门控**：未购买显示价格与购买按钮
- **相关文章推荐**：基于标签权重 (10)、分类权重 (4)、阅读量排序
- **侧栏热门文章**：Top 4 高阅读量文章
- **收藏按钮**：登录用户可收藏/取消
- **评论区**：支持嵌套回复，管理员可直接回复

#### 🏷️ 分类/标签浏览 (CategoriesView)
- 标签云展示，显示文章计数
- 点击标签筛选对应文章列表
- 卡片网格布局

#### 📅 文章归档 (ArchivesView)
- **侧栏导航**：年份/月份分组，逆序排列
- **主内容区**：选中月份的文章列表 + 分页
- URL 参数同步 (`?year=2024&month=1`)

#### 🔍 搜索 (SearchView)
- 实时搜索（260ms 防抖）
- 关键词高亮显示
- 分页（每页 12 篇）
- 可分享的搜索 URL (`?q=keyword`)

#### 📖 留言板 (GuestbookView)
- 装饰性背景 + 浮动动画
- 留言时间线（按日期分组）
- 用户头像（基于昵称哈希的彩色头像）
- 留言表单：昵称、邮箱、内容（1000 字限制）
- 实时字符计数、乐观更新

#### ℹ️ 关于页面 (AboutView)
- 自定义页面内容渲染
- 支持 Markdown 格式
- 页面类型标签（关于/自定义/简历/作品集）

#### 📧 邮件订阅确认 (SubscriptionStatusView)
- Token 验证、成功/失败提示
- 退订页面

### 用户中心 (ProfileView)

- **个人资料**：头像（首字母头像降级）、昵称、邮箱、简介
- **编辑资料**：上传头像（FormData）、修改个人信息
- **修改密码**：旧密码验证、新密码强度指示器（弱/中/强）
- **我的收藏**：收藏文章列表，可跳转原文
- **通知中心**：未读徽标、回复/点赞/系统通知、已读/删除
- **已购内容**：付费文章购买记录

### 管理后台

#### 📊 仪表盘 (DashboardView)
- 文章总数、总阅读量、总评论数统计卡片
- 近期更新文章表格（最近 5 篇）

#### 📝 文章管理 (ArticleManageView)
三个标签页：文章 / 分类 / 标签

**文章管理**：
- 搜索 + 状态筛选（草稿/已发布/定时/归档）
- 文章表单：标题、Slug（自动生成）、摘要、Markdown 内容
- 封面图、分类选择、标签多选
- 发布状态：草稿/立即发布/定时发布
- SEO 字段：标题、描述、关键词
- Markdown 内容预览

**分类管理**：名称、Slug、描述、颜色选择器
**标签管理**：名称、Slug、文章计数

#### 💬 评论管理 (CommentManageView)
- 状态筛选（已通过/待审核/垃圾/已拒绝）
- 统计：总评论数、待审核数、未回复数
- 审核操作：通过/拒绝/标记垃圾
- 内联回复表单

#### 📑 页面管理 (PageManageView)
- 已发布/草稿标签页
- 页面表单：标题、Slug、类型（关于/自定义/简历/作品集）
- Markdown 内容 + 预览、摘要、可见性、SEO 字段

#### ⚙️ 站点设置 (SettingsView)
- **基础设置**：标题、副标题、描述、SEO 关键词、作者、Logo、Favicon、OG 图片、ICP 备案、版权信息
- **社交链接**：动态添加/删除（名称 + URL）
- **关于页设置**：技术栈标签、时间线条目、联系邮箱、GitHub 地址

#### 🔧 技术管理 (TechnicalView)
- **安全信息**：SQL 注入/XSS/CSRF/暴力破解防护说明
- **备份管理**：创建/下载/恢复/删除数据库备份
- **Sitemap**：生成与查看站点地图
- **公告管理**：创建/编辑/删除/发布/置顶公告
- **国际化**：语言切换（中文/英文）
- **访客统计**：今日 PV/UV、平均停留、热门页面、来源、设备分布

### 状态管理 (Pinia Stores)

| Store | 职责 |
|-------|------|
| `auth` | JWT Token、用户信息、登录/注册/登出 |
| `content` | 文章/分类/标签 CRUD、公共内容加载 |
| `ecosystem` | 归档、搜索、付费内容、购买记录 |
| `user` | 个人资料、收藏、通知、头像上传 |
| `community` | 公告、留言板、访客统计 |
| `pages` | 自定义页面 CRUD |
| `site` | 站点设置、仪表盘统计 |
| `i18n` | 多语言翻译加载与切换 |

---

## 🔌 后端 API 模块详情

### 1. 认证模块 (Auth)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/auth/register` | POST | 用户注册（限流 3/分钟） | 无 |
| `/auth/login` | POST | 用户登录（限流 5/分钟） | 无 |
| `/auth/me` | GET | 获取当前用户信息 | JWT |
| `/auth/admin/me` | GET | 获取管理员信息 | Admin |

- JWT Token 认证，bcrypt 10 轮加密
- 不区分大小写的邮箱登录
- 账户激活状态检测

### 2. 文章模块 (Articles)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/articles` | GET | 公开文章列表（分页/筛选） | 无 |
| `/articles/:slug` | GET | 文章详情（自动增加阅读量） | 无 |
| `/admin/articles` | POST | 创建文章 | Author |
| `/admin/articles` | GET | 管理文章列表 | Author |
| `/admin/articles/:id` | GET | 获取文章详情 | Author |
| `/admin/articles/:id` | PATCH | 更新文章 | Author |
| `/admin/articles/:id` | DELETE | 软删除（归档） | Author |
| `/admin/articles/:id/permanent` | DELETE | 永久删除 | Author |
| `/admin/articles/:id/export` | GET | 导出（Markdown/JSON） | Author |

**文章版本管理**：
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/admin/articles/:id/versions` | GET | 版本列表 | Author |
| `/admin/articles/:id/versions/:versionId` | GET | 版本详情 | Author |
| `/admin/articles/:id/versions/:versionId/restore` | POST | 恢复版本 | Author |

- 状态：draft / scheduled / published / archived
- 可见性：public / private / password
- 定时发布、自动发布
- SEO 字段（seoTitle, seoDescription, seoKeywords）
- 封面图、分类和标签关联

### 3. 分类模块 (Categories)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/categories` | GET | 公开分类列表（仅可见） | 无 |
| `/admin/categories` | GET | 全部分类列表 | Admin |
| `/admin/categories/:id` | GET | 分类详情 | Admin |
| `/admin/categories` | POST | 创建分类 | Admin |
| `/admin/categories/:id` | PATCH | 更新分类 | Admin |
| `/admin/categories/:id` | DELETE | 删除分类（使用中禁止删除） | Admin |

- Slug 唯一性、排序、颜色标识、可见性控制

### 4. 标签模块 (Tags)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/tags` | GET | 公开标签列表 | 无 |
| `/admin/tags` | GET | 管理标签列表 | Admin |
| `/admin/tags/:id` | GET | 标签详情 | Admin |
| `/admin/tags` | POST | 创建标签 | Admin |
| `/admin/tags/:id` | PATCH | 更新标签 | Admin |
| `/admin/tags/:id` | DELETE | 删除标签（使用中禁止删除） | Admin |

### 5. 评论模块 (Comments)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/articles/:articleId/comments` | GET | 获取已审核评论（树形） | 无 |
| `/articles/:articleId/comments` | POST | 发表评论（限流 5/分钟） | 可选 |
| `/admin/comments` | GET | 管理评论列表（按状态筛选） | Admin |
| `/admin/comments/:id/status` | PUT | 审核评论 | Admin |
| `/admin/comments/:id/reply` | POST | 管理员回复 | Admin |
| `/admin/comments/:id` | DELETE | 删除评论（含子评论） | Admin |

- 嵌套评论（树形结构）、自动审核（默认待审核）
- IP/UserAgent 追踪、评论计数同步
- 新评论通知作者、回复通知评论者

### 6. 自定义页面模块 (Pages)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/pages/about` | GET | 获取关于页面 | 无 |
| `/pages/:slug` | GET | 获取页面详情 | 无 |
| `/friend-links` | GET | 获取已审核友链 | 无 |
| `/friend-links/applications` | POST | 申请友链 | 无 |
| `/admin/pages` | POST/GET/PATCH/DELETE | 页面 CRUD | Admin |
| `/admin/friend-links` | POST/GET/PATCH/DELETE | 友链 CRUD | Admin |

- 页面类型：about / custom / resume / portfolio
- 仅允许一个 About 页面
- 友链申请与审核流程

### 7. 文章系列模块 (Article Series)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/series` | GET | 公开系列列表 | 无 |
| `/series/:slug` | GET | 系列详情（含文章列表） | 无 |
| `/admin/series` | POST/GET/PATCH/DELETE | 系列 CRUD | Author |

- Slug 唯一性、排序管理、权限检查

### 8. 搜索模块 (Search)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/search` | GET | 全文搜索 | 无 |
| `/admin/search/rebuild-index` | POST | 重建索引 | Admin |

- Elasticsearch 全文搜索 + 数据库降级方案
- 关键词高亮、分类筛选、相关性评分
- 批量索引（每批 100 篇）、自动恢复与冷却

### 9. 归档模块 (Archives)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/archives` | GET | 归档摘要（年/月/计数） | 无 |
| `/archives/articles` | GET | 指定月份的文章列表 | 无 |

### 10. 留言板模块 (Guestbook)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/guestbook` | GET | 已审核留言（树形/分页） | 无 |
| `/guestbook` | POST | 提交留言（限流 5/分钟） | 无 |
| `/admin/guestbook` | GET | 管理留言列表 | Admin |
| `/admin/guestbook/:id/status` | PUT | 审核留言 | Admin |
| `/admin/guestbook/:id/reply` | POST | 管理员回复 | Admin |
| `/admin/guestbook/:id` | DELETE | 删除留言 | Admin |

- 邮箱/IP 脱敏显示、嵌套回复、XSS 防护

### 11. 收藏模块 (Favorites)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/favorites/:articleId` | POST | 收藏文章 | JWT |
| `/favorites/:articleId` | DELETE | 取消收藏 | JWT |
| `/favorites/:articleId/check` | GET | 检查收藏状态 | JWT |
| `/favorites/batch-check` | POST | 批量检查收藏状态 | JWT |

### 12. 通知模块 (User Notifications)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/notifications` | GET | 我的通知列表（分页） | JWT |
| `/notifications/unread-count` | GET | 未读数量 | JWT |
| `/notifications/:id/read` | PUT | 标记已读 | JWT |
| `/notifications/read-all` | PUT | 全部已读 | JWT |
| `/notifications/:id` | DELETE | 删除通知 | JWT |
| `/admin/notifications/broadcast` | POST | 广播通知 | Admin |

- 通知类型：comment_reply / like / system / announcement / favorite

### 13. 邮件订阅模块 (Notifications/Subscriptions)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/subscriptions` | POST | 邮件订阅 | 无 |
| `/subscriptions/confirm/:token` | GET | 确认订阅 | 无 |
| `/subscriptions/unsubscribe/:token` | GET | 退订 | 无 |
| `/admin/notifications/send` | POST | 发送邮件 | Admin |
| `/admin/notifications/notify-subscribers` | POST | 新文章推送 | Admin |
| `/admin/notifications/retry-failed` | POST | 重试失败邮件 | Admin |
| `/admin/notifications/subscribers` | GET | 订阅者列表 | Admin |

- SMTP 邮件发送、Token 验证、最多 3 次重试

### 14. 付费内容模块 (Paid Content)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/paid-content/:articleId/info` | GET | 获取定价信息 | 可选 |
| `/paid-content/:articleId/content` | GET | 获取内容（未购显示预览） | 可选 |
| `/paid-content/purchase` | POST | 购买文章 | JWT |
| `/paid-content/:articleId/check` | GET | 检查购买状态 | JWT |
| `/paid-content/my-purchases` | GET | 我的购买记录 | JWT |
| `/admin/paid-content/:articleId` | PUT | 设置付费内容 | Author |
| `/admin/paid-content/:articleId` | DELETE | 取消付费 | Author |
| `/admin/paid-content/:articleId/purchases` | GET | 购买记录 | Author |

- 可配置预览百分比（默认 30%）、购买记录追踪

### 15. 用户模块 (Users)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/users/profile` | GET | 获取个人资料 | JWT |
| `/users/profile` | PUT | 更新个人资料 | JWT |
| `/users/avatar` | POST | 上传头像 | JWT |
| `/users/password` | PUT | 修改密码 | JWT |
| `/users/favorites` | GET | 收藏文章列表 | JWT |

- 头像压缩：WebP 格式、最大 1024px、质量 85%、自动 EXIF 旋转

### 16. 公告模块 (Announcements)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/announcements` | GET | 已发布公告列表 | 无 |
| `/announcements/pinned` | GET | 最新置顶公告 | 无 |
| `/admin/announcements` | POST/GET/PUT/DELETE | 公告 CRUD | Admin |

### 17. 站点设置模块 (Settings)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/settings` | GET | 公开设置 | 无 |
| `/admin/settings` | GET | 所有设置 | Admin |
| `/admin/settings/:key` | GET | 单个设置 | Admin |
| `/admin/settings` | PUT | 更新设置 | Admin |
| `/admin/settings/batch` | PUT | 批量更新 | Admin |
| `/admin/settings/:key` | DELETE | 删除设置 | Admin |

- Key-Value 存储、类型标注、分组管理、公开/私有标志

### 18. SEO 模块
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/seo/site` | GET | 站点 SEO 设置 | 无 |
| `/seo/articles/:slug` | GET | 文章 SEO Meta | 无 |
| `/seo/pages/:slug` | GET | 页面 SEO Meta | 无 |
| `/seo/sitemap` | GET | 生成 Sitemap JSON | 无 |

- OpenGraph 标签、作者归属、分类信息、发布日期

### 19. 国际化模块 (i18n)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/i18n/locales` | GET | 支持的语言列表 | 无 |
| `/i18n/default` | GET | 默认语言 | 无 |
| `/i18n/translations/:locale` | GET | 翻译包 | 无 |
| `/i18n/default` | PUT | 设置默认语言 | Admin |

- 支持 zh-CN / en-US、内置翻译 + 数据库自定义覆盖

### 20. 仪表盘模块 (Dashboard)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/admin/dashboard/stats` | GET | 综合统计 | Admin |
| `/admin/dashboard/recent-articles` | GET | 近期文章 | Admin |

- 文章/浏览/评论/分类/标签/草稿/页面/友链计数

### 21. 访客统计模块 (Visitor Stats)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/stats/visit` | POST | 记录访问 | 无 |
| `/admin/stats/today` | GET | 今日统计 | Admin |
| `/admin/stats/range` | GET | 日期范围统计 | Admin |
| `/admin/stats/top-pages` | GET | 热门页面 | Admin |
| `/admin/stats/referers` | GET | 来源统计 | Admin |
| `/admin/stats/devices` | GET | 设备分布 | Admin |

- IP/UserAgent 追踪、设备/浏览器/OS 识别、来源分析

### 22. 备份模块 (Backup)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/admin/backup` | POST | 创建备份 | Admin |
| `/admin/backup` | GET | 备份列表 | Admin |
| `/admin/backup/:filename/download` | GET | 下载备份 | Admin |
| `/admin/backup/:filename/restore` | POST | 恢复备份 | Admin |
| `/admin/backup/:filename` | DELETE | 删除备份 | Admin |

- 基于 mysqldump 的数据库备份与恢复

### 23. 协作模块 (Collaboration)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/admin/collaboration/:articleId/collaborators` | POST | 添加协作者 | Author |
| `/admin/collaboration/:articleId/collaborators/:id` | DELETE | 移除协作者 | Author |
| `/admin/collaboration/:articleId/collaborators` | GET | 协作者列表 | Author |
| `/admin/collaboration/:articleId/draft` | PATCH | 协作编辑草稿 | Author |
| `/admin/collaboration/:articleId/history` | GET | 编辑历史 | Author |

- 权限等级：viewer / editor、变更追踪

### 24. 媒体库模块 (Media Assets)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/media-assets/files/:fileName` | GET | 访问文件 | 无 |
| `/admin/media-assets/upload` | POST | 上传文件（5MB 限制） | Author |
| `/admin/media-assets` | GET | 媒体列表 | Author |
| `/admin/media-assets/:id` | GET/PATCH/DELETE | 媒体 CRUD | Author |

- 支持类型：JPEG, PNG, WebP, GIF, PDF, TXT, JSON, Markdown
- SHA256 去重、Alt 文本支持

### 25. 操作日志模块 (Operation Logs)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/admin/operation-logs` | GET | 日志列表（按模块/操作筛选） | Admin |

- 全局拦截器自动记录、模块名/操作名/目标/请求/响应/IP

### 26. 健康检查模块 (Health)
| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/health` | GET | 服务健康状态 | 无 |

- 检测 MySQL 和 Redis 连通性，返回 ok / degraded

---

## 💾 数据库设计

系统共包含 **26 张数据表**，分三期建设：

### 一期：核心表（MVP）

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `users` | 用户表 | username, email, password_hash, role, status |
| `categories` | 分类表 | name, slug, color, sort_order, is_visible |
| `tags` | 标签表 | name, slug, article_count |
| `articles` | 文章表 | title, slug, content_markdown, status, visibility, view_count |
| `article_tags` | 文章标签关联 | article_id, tag_id |
| `pages` | 自定义页面 | title, slug, page_type, content_markdown |
| `comments` | 评论表 | article_id, parent_id, content, status |
| `friend_links` | 友情链接 | site_name, site_url, status |
| `site_settings` | 站点设置 | setting_key, setting_value, is_public |

### 二期：扩展表

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `article_versions` | 文章版本 | article_id, version_no, content, change_note |
| `media_assets` | 媒体库 | file_name, mime_type, file_path, hash_value |
| `operation_logs` | 操作日志 | operator_id, module_name, action_name |
| `article_series` | 文章系列 | name, slug, status |
| `article_series_items` | 系列文章关联 | series_id, article_id, sort_order |
| `email_subscribers` | 邮件订阅 | email, confirm_token, is_confirmed |

### 三期：社区与变现

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `user_favorites` | 文章收藏 | user_id, article_id |
| `user_notifications` | 站内通知 | user_id, type, title, is_read |
| `visitor_logs` | 访客日志 | ip, path, device, browser, os |
| `guestbook` | 留言板 | nickname, content, status |
| `announcements` | 公告 | title, content, status, is_pinned |
| `paid_contents` | 付费设置 | article_id, price, preview_percent |
| `article_purchases` | 购买记录 | article_id, user_id, paid_amount |
| `draft_collaborators` | 协作者 | article_id, user_id, permission |
| `draft_edit_logs` | 协作编辑日志 | article_id, field_changed, old_value |
| `email_notifications` | 邮件队列 | to_email, subject, status, retry_count |
| `favorites` | 收藏记录 | user_id, article_id |

### 主要关系
```
users ──1:M──> articles ──M:M──> tags
  │                │
  │                ├──M:1──> categories
  │                ├──1:M──> comments (嵌套自引用)
  │                ├──1:M──> article_versions
  │                ├──1:1──> paid_contents
  │                └──M:M──> article_series
  │
  ├──M:M──> articles (via favorites)
  ├──1:M──> user_notifications
  ├──1:M──> operation_logs
  └──1:M──> media_assets
```

---

## 🚀 快速启动

### 前置条件
- Node.js >= 18
- MySQL 8.0
- Redis 7+
- Elasticsearch 8.13+ （可选，搜索功能降级为数据库查询）

### 1. 克隆项目
```bash
git clone <repository-url>
cd boke
```

### 2. 启动后端
```bash
cd server
cp .env.example .env       # 编辑 .env 配置数据库/Redis/JWT 等
npm install
npm run db:init             # 初始化数据库（建库建表）
npm run start:dev           # 开发模式启动（http://localhost:3000）
```

### 3. 启动前端
```bash
cd client
cp .env.example .env        # 编辑 .env 配置 API 地址
npm install
npm run dev                 # 开发模式启动（http://localhost:5173）
```

### 4. Docker 一键启动（可选）
```bash
cd server
docker-compose up -d        # 启动 MySQL + Redis + Elasticsearch + API
```

---

## 📜 项目脚本

### 后端 (Server)

| 命令 | 说明 |
|------|------|
| `npm run start:dev` | 开发服务器（热重载） |
| `npm run start:debug` | 调试模式 |
| `npm run build` | 生产构建 |
| `npm run start:prod` | 生产启动 |
| `npm run db:init` | 初始化数据库（建库建表） |
| `npm run db:seed-content` | 导入示例数据（用户/分类/标签/文章） |
| `npm run db:seed:about` | 导入关于页面内容 |
| `npm run db:seed-bulk` | 批量生成测试文章 |
| `npm run search:refresh-local` | 数据导入 + Elasticsearch 重建索引 |
| `npm test` | 运行单元测试 |
| `npm run test:cov` | 测试覆盖率 |
| `npm run lint` | ESLint 检查 |
| `npm run format` | Prettier 格式化 |

### 前端 (Client)

| 命令 | 说明 |
|------|------|
| `npm run dev` | Vite 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run e2e` | Playwright E2E 测试 |
| `npm run e2e:headed` | 有界面 E2E 测试 |
| `npm run format` | Prettier 格式化 |

---

## 🔧 环境变量配置

### 后端 (.env)

```env
# 应用
NODE_ENV=development
PORT=3000
APP_NAME=Blog System
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# 数据库 (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=blog_user
DB_PASSWORD=your_db_password
DB_DATABASE=blog_system
DB_SYNCHRONIZE=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT
JWT_SECRET=your_32_plus_char_random_secret
JWT_EXPIRATION=7d

# 超级管理员（推荐使用 SUPER_ADMIN_*）
SUPER_ADMIN_USERNAME=rootmaster
SUPER_ADMIN_PASSWORD=change_me_super_admin_password_strong
SUPER_ADMIN_EMAIL=root@example.com
SUPER_ADMIN_NICKNAME=系统超管

# Elasticsearch（可选）
ES_NODE=http://localhost:9200

# SMTP 邮件（可选）
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# 限流
THROTTLE_TTL=60000
THROTTLE_LIMIT=120
```

---

## 📂 项目结构

```
boke/
├── README.md                      # 项目总文档（本文件）
├── ARCHITECTURE.md                # 技术架构文档
├── DATABASE.md                    # 数据库设计文档
├── 需求文档.md                     # 产品需求文档
├── 技术设计文档.md                  # 技术设计文档
│
├── server/                        # 后端 (NestJS)
│   ├── src/
│   │   ├── main.ts               # 应用入口
│   │   ├── app.module.ts         # 根模块（26 模块注册）
│   │   ├── config/               # 配置管理
│   │   │   ├── configuration.ts  # 配置工厂
│   │   │   ├── validation.ts     # Joi 环境变量验证
│   │   │   └── cors.config.ts    # 动态 CORS 配置
│   │   ├── common/               # 公共工具
│   │   │   ├── filters/          # 全局异常过滤器
│   │   │   ├── interceptors/     # 响应拦截器
│   │   │   ├── pipes/            # XSS 清理管道
│   │   │   └── redis/            # Redis 模块
│   │   ├── database/             # 数据库
│   │   │   ├── database.module.ts
│   │   │   ├── entities/         # TypeORM 实体
│   │   │   └── migrations/       # 数据库迁移
│   │   └── modules/              # 功能模块
│   │       ├── announcements/    # 公告
│   │       ├── archives/         # 归档
│   │       ├── article-series/   # 文章系列
│   │       ├── articles/         # 文章（含版本管理）
│   │       ├── auth/             # 认证
│   │       ├── backup/           # 备份
│   │       ├── categories/       # 分类
│   │       ├── collaboration/    # 多人协作
│   │       ├── comments/         # 评论
│   │       ├── dashboard/        # 仪表盘
│   │       ├── favorites/        # 收藏
│   │       ├── guestbook/        # 留言板
│   │       ├── health/           # 健康检查
│   │       ├── i18n/             # 国际化
│   │       ├── media-assets/     # 媒体库
│   │       ├── notifications/    # 邮件通知
│   │       ├── operation-logs/   # 操作日志
│   │       ├── pages/            # 页面与友链
│   │       ├── paid-content/     # 付费内容
│   │       ├── search/           # 全文搜索
│   │       ├── seo/              # SEO
│   │       ├── settings/         # 站点设置
│   │       ├── tags/             # 标签
│   │       ├── user-notifications/ # 站内通知
│   │       ├── users/            # 用户管理
│   │       └── visitor-stats/    # 访客统计
│   ├── sql/                      # SQL 文件
│   │   └── init/001_init_schema.sql
│   ├── scripts/                  # 初始化与数据脚本
│   ├── docker-compose.yml        # Docker 编排
│   ├── Dockerfile                # 容器化构建
│   └── package.json
│
├── client/                       # 前端 (Vue 3)
│   ├── src/
│   │   ├── main.ts              # 入口
│   │   ├── App.vue              # 根组件
│   │   ├── router/index.ts      # 路由配置
│   │   ├── api/                 # API 请求层（16 个文件）
│   │   ├── stores/              # Pinia 状态管理（8 个 Store）
│   │   ├── views/               # 页面视图
│   │   │   ├── HomeView.vue
│   │   │   ├── ArticleDetailView.vue
│   │   │   ├── CategoriesView.vue
│   │   │   ├── ArchivesView.vue
│   │   │   ├── SearchView.vue
│   │   │   ├── GuestbookView.vue
│   │   │   ├── AboutView.vue
│   │   │   ├── ProfileView.vue
│   │   │   └── admin/           # 管理后台视图
│   │   │       ├── DashboardView.vue
│   │   │       ├── ArticleManageView.vue
│   │   │       ├── CommentManageView.vue
│   │   │       ├── PageManageView.vue
│   │   │       ├── SettingsView.vue
│   │   │       └── TechnicalView.vue
│   │   ├── components/          # 公共组件
│   │   ├── layouts/             # 布局组件
│   │   ├── types/               # TypeScript 类型
│   │   └── utils/               # 工具函数
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
└── scripts/                     # 项目级脚本
```

---

## 🔐 安全特性

- **Helmet**：HTTP 安全头
- **CORS**：动态白名单 + 403 拒绝非法来源
- **JWT**：Token 认证 + 角色权限控制
- **bcrypt**：密码加密（10 轮）
- **class-validator**：DTO 数据验证 + 白名单模式
- **SanitizePipe**：XSS 防护（HTML 实体转义）
- **ThrottlerGuard**：全局请求限流（120 次/分钟）
- **接口限流**：登录 5/分钟、注册 3/分钟、评论 5/分钟

## 📐 API 响应格式

### 成功响应
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "message": "Success",
  "timestamp": "2026-04-19T13:00:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errors": null,
  "timestamp": "2026-04-19T13:00:00.000Z"
}
```

---

## 📄 License

MIT
