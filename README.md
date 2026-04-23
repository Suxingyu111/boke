# 📝 个人博客系统

基于 **Vue 3 + NestJS** 的全栈博客系统，前后端完全分离，后端提供 **27 个功能模块**，覆盖内容管理、社区互动、SEO 优化、安全防护、系统运维等完整能力。

---

## 📑 目录

- [技术栈](#-技术栈)
- [系统架构](#-系统架构)
- [功能总览](#-功能总览)
- [前端功能](#-前端功能)
- [后端模块](#-后端模块)
- [数据库设计](#-数据库设计)
- [快速启动](#-快速启动)
- [常用命令](#-常用命令)
- [环境变量配置](#-环境变量配置)
- [项目结构](#-项目结构)
- [安全特性](#-安全特性)
- [API 响应格式](#-api-响应格式)

---

## 🛠 技术栈

### 前端（client）

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue 3 | ^3.5 | 前端框架（Composition API） |
| Vue Router | ^4.6 | 路由管理 |
| Pinia | ^3.0 | 状态管理 |
| Vite | ^8.0 | 构建工具 |
| TypeScript | ~6.0 | 类型安全 |
| Tailwind CSS | ^3.4 | 原子化 CSS 框架 |
| Axios | ^1.15 | HTTP 请求 |
| markdown-it | ^14.1 | Markdown 渲染 |
| highlight.js | ^11.11 | 代码高亮 |
| DOMPurify | ^3.4 | XSS 内容净化 |
| Vitest | ^3.2 | 单元测试 |
| Playwright | ^1.56 | E2E 测试 |

### 后端（server）

| 技术 | 版本 | 说明 |
|------|------|------|
| NestJS | ^10.2 | 后端框架 |
| TypeORM | ^0.3 | ORM 数据库操作 |
| MySQL | 8.0 | 关系型数据库 |
| Redis | 7（Alpine） | 缓存与会话 |
| Elasticsearch | 8.13 | 全文搜索引擎 |
| Passport + JWT | ^11.0 | 身份认证 |
| Swagger | ^7.4 | API 文档 |
| Sharp | ^0.34 | 图片处理与压缩 |
| Nodemailer | ^8.0 | 邮件发送 |
| Helmet | ^8.1 | HTTP 安全头中间件 |
| class-validator | ^0.14 | DTO 数据校验 |
| sanitize-html | ^2.17 | XSS 内容清理 |
| Docker | — | 容器化部署 |

---

## 🏗 系统架构

```
┌──────────────────────────────────────────────────────┐
│                   用户浏览器                          │
│        Vue 3 + Tailwind CSS + Pinia + Vue Router      │
└──────────────────┬───────────────────────────────────┘
                   │ HTTP/REST API（/api 前缀）
                   ▼
┌──────────────────────────────────────────────────────┐
│               NestJS API 服务器（:3000）              │
│                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ Controllers  │ │   Services   │ │ Guards/Pipes/ │ │
│  │ (27 模块)    │ │  (业务逻辑)  │ │ Interceptors  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ │
└────────┬──────────────┬──────────────┬───────────────┘
         │              │              │
         ▼              ▼              ▼
┌──────────────┐ ┌────────────┐ ┌───────────────┐
│  MySQL 8.0   │ │  Redis 7   │ │ Elasticsearch │
│   (数据持久) │ │  (缓存)    │ │  8.13 (搜索)  │
└──────────────┘ └────────────┘ └───────────────┘
```

**全局管线（所有请求自动经过）：**
- `ThrottlerGuard`：全局限流（120 次/分钟）
- `SanitizePipe`：XSS 内容清理
- `OperationLogInterceptor`：自动记录管理操作日志
- `ResponseInterceptor`：统一响应格式封装
- `HttpExceptionFilter`：统一异常处理

---

## 🎯 功能总览

### 内容管理
| 功能 | 说明 |
|------|------|
| 📄 文章管理 | CRUD、草稿/定时发布/归档、版本历史、Markdown 编辑、导出 |
| 📂 分类管理 | 层级分类、排序、颜色标识、可见性控制 |
| 🏷️ 标签管理 | 标签云、文章计数、Slug 唯一性 |
| 📑 自定义页面 | 关于/简历/作品集等多类型页面，含友情链接管理 |
| 📚 文章系列 | 多篇文章组成系列、排序管理 |
| 🔍 全文搜索 | Elasticsearch 搜索 + 数据库降级方案，关键词高亮 |
| 📅 文章归档 | 按年月分组的时间线归档 |

### 用户与认证
| 功能 | 说明 |
|------|------|
| 🔐 JWT 认证 | 登录/注册/登出，Cookie 方式携带 Token |
| 📧 邮箱验证注册 | 注册前发送验证码，校验后方可完成注册 |
| 🔗 OAuth 登录 | GitHub / Google 第三方登录（可选） |
| 🛡️ 二次认证（Step-Up） | 高危操作（如数据库管理、备份恢复）需二次密码确认 |
| 👤 用户中心 | 个人资料、头像上传压缩、密码修改 |
| 🎭 四级角色 | super_admin / admin / author / user |

### 社区互动
| 功能 | 说明 |
|------|------|
| 💬 评论系统 | 嵌套回复（树形结构）、审核管理、IP 追踪 |
| 📖 留言板 | 访客留言、审核、管理员回复、邮箱脱敏 |
| ⭐ 文章收藏 | 收藏/取消收藏、批量检查状态 |
| 🔔 站内通知 | 评论回复/系统/公告等通知、未读徽标、批量已读 |
| 📢 公告管理 | 发布/置顶/管理公告 |

### 运营能力
| 功能 | 说明 |
|------|------|
| 📧 邮件订阅 | 双重确认订阅、退订、新文章推送通知 |
| 🔗 友情链接 | 展示、申请提交、审核管理 |
| 📊 访客统计 | PV/UV、设备/浏览器/OS、热门页面、来源分析 |
| 📰 RSS/Atom 订阅 | 自动生成标准订阅源，支持 Redis 缓存 |

### 系统管理
| 功能 | 说明 |
|------|------|
| ⚙️ 站点设置 | 标题/描述/Logo/SEO/社交链接等 Key-Value 配置 |
| 🌐 SEO 优化 | OG 标签、Sitemap 生成、Meta 管理 |
| 🌍 国际化（i18n） | zh-CN / en-US 切换，内置翻译 + 数据库自定义覆盖 |
| 💾 数据备份 | 基于 mysqldump 的备份/恢复/下载/删除（需二次认证） |
| 📝 操作日志 | 全局自动记录管理操作审计日志 |
| 🏥 健康检查 | MySQL + Redis 连通性检测 |
| 🤝 多人协作 | 草稿协作编辑、协作者权限管理、变更历史 |
| 🖼️ 媒体库 | 文件上传、SHA256 去重、类型/大小校验 |
| 🗄️ 数据库管理 | Super Admin 专属，可直接浏览/增删改数据表行（需二次认证） |
| �� 仪表盘 | 文章/评论/浏览统计，近期文章概览 |

---

## 🖥 前端功能

### 公共页面

#### 🏠 首页
- 热门文章轮播（Top 5，5 秒自动轮播，悬停暂停）
- 最新文章双列瀑布流，移动端单列响应式布局
- 懒加载图片、空状态提示

#### 📄 文章详情
- 面包屑导航、标题/摘要/作者/发布时间/阅读时间/阅读量/点赞/评论数
- 分享功能（原生分享、微博、X/Twitter、复制链接）
- 目录导航（根据 h2/h3 自动生成，移动端可折叠）
- 页面顶部阅读进度条
- 相关文章推荐（基于标签/分类/阅读量权重排序）
- 侧栏热门文章（Top 4）
- 收藏按钮（登录用户可收藏/取消）
- 评论区（支持嵌套回复）

#### 🏷️ 分类/标签浏览
- 标签云展示，显示文章计数
- 点击标签筛选对应文章列表，卡片网格布局

#### 📅 文章归档
- 侧栏年份/月份分组导航（逆序排列）
- 主内容区展示选中月份的文章列表 + 分页
- URL 参数同步（`?year=2024&month=1`）

#### 🔍 搜索
- 实时搜索（260ms 防抖）
- 关键词高亮、分页（每页 12 篇）
- 可分享的搜索链接（`?q=keyword`）

#### 📖 留言板
- 留言时间线（按日期分组）
- 用户头像（基于昵称哈希的彩色头像）
- 留言表单（昵称、邮箱、内容，1000 字限制，实时计数）
- 乐观更新、邮箱脱敏显示

#### ℹ️ 关于页面
- Markdown 内容渲染，支持 about/custom/resume/portfolio 类型

#### 📧 邮件订阅确认
- Token 验证确认订阅、退订操作、成功/失败提示

### 用户中心（需登录）
- 个人资料（首字母头像降级显示）
- 编辑资料：上传头像（WebP 压缩）、修改昵称/简介
- 修改密码（旧密码验证、新密码强度指示器）
- 我的收藏（收藏文章列表，可跳转原文）
- 通知中心（未读徽标、回复/点赞/系统通知、已读/删除）

### 管理后台（需登录 + 角色权限）

#### 📊 仪表盘（Admin+）
- 文章总数、总阅读量、总评论数统计卡片
- 近期更新文章表格

#### 📝 文章管理（Author+）
- 文章列表：搜索 + 状态筛选（草稿/已发布/定时/归档）
- 文章编辑：标题、Slug 自动生成、摘要、Markdown 内容、封面图
- 分类选择、标签多选
- 发布状态：草稿 / 立即发布 / 定时发布
- SEO 字段：seoTitle、seoDescription、seoKeywords
- Markdown 内容实时预览
- 分类管理（名称/Slug/描述/颜色）
- 标签管理（名称/Slug/文章计数）

#### 💬 评论管理（Admin+）
- 状态筛选（已通过/待审核/垃圾/已拒绝）
- 统计：总评论数、待审核数、未回复数
- 审核操作：通过/拒绝/标记垃圾/内联回复

#### 📑 页面管理（Admin+）
- 已发布/草稿标签页
- 页面编辑：标题/Slug/类型/Markdown 内容/预览/可见性/SEO 字段

#### ⚙️ 站点设置（Admin+）
- 基础设置：标题、副标题、描述、SEO 关键词、作者、Logo、Favicon、OG 图片、ICP 备案、版权信息
- 社交链接：动态添加/删除
- 关于页设置：技术栈标签、时间线条目、联系邮箱、GitHub 地址

#### 🔧 技术管理（Admin+）
- 安全信息：SQL 注入/XSS/CSRF/暴力破解防护说明
- 备份管理：创建/下载/恢复/删除数据库备份（恢复操作需二次认证）
- Sitemap：生成与查看站点地图
- 公告管理：创建/编辑/删除/发布/置顶
- 国际化：语言切换（中文/英文）
- 访客统计：今日 PV/UV、平均停留时长、热门页面、来源分析、设备分布

#### 🗄️ 数据库管理（Super Admin 专属）
- 数据库概览（表数量/大小/引擎信息）
- 数据表列表（支持按名称/引擎搜索筛选）
- 表详情（字段、索引、外键结构）
- 分页读取任意数据表行，支持关键字搜索
- 增删改数据行（所有写操作均需二次认证）

### 状态管理（Pinia Stores）

| Store | 职责 |
|-------|------|
| `auth` | JWT Token、用户信息、登录/注册/登出/二次认证 |
| `content` | 文章/分类/标签 CRUD、公共内容加载 |
| `ecosystem` | 归档、搜索 |
| `user` | 个人资料、收藏、通知、头像上传 |
| `community` | 公告、留言板、访客统计 |
| `pages` | 自定义页面 CRUD |
| `site` | 站点设置、仪表盘统计 |
| `i18n` | 多语言翻译加载与切换 |

---

## 🔌 后端模块

### 1. 认证模块（Auth）

| 端点 | 方法 | 说明 | 限流 |
|------|------|------|------|
| `/api/auth/register/check-availability` | POST | 检查用户名/邮箱可用性 | 20/分钟 |
| `/api/auth/register/send-code` | POST | 发送邮箱注册验证码 | 6/分钟 |
| `/api/auth/register/verify-code` | POST | 校验注册验证码 | 12/分钟 |
| `/api/auth/register` | POST | 完成注册 | 3/分钟 |
| `/api/auth/login` | POST | 账号登录 | 5/分钟 |
| `/api/auth/logout` | POST | 退出登录 | — |
| `/api/auth/step-up` | POST | 二次认证（高危操作前） | 5/分钟 |
| `/api/auth/me` | GET | 获取当前用户信息 | — |
| `/api/auth/admin/me` | GET | 获取当前管理员信息 | — |
| `/api/auth/oauth/providers` | GET | 查询 OAuth 提供商状态 | — |
| `/api/auth/github` | GET | 发起 GitHub OAuth | — |
| `/api/auth/github/callback` | GET | GitHub OAuth 回调 | — |
| `/api/auth/google` | GET | 发起 Google OAuth | — |
| `/api/auth/google/callback` | GET | Google OAuth 回调 | — |

- JWT Token 写入 HttpOnly Cookie
- bcrypt 10 轮密码加密
- 不区分大小写的邮箱匹配

### 2. 文章模块（Articles）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/articles` | 公开文章列表（分页/筛选/排序） | 无 |
| `GET /api/articles/:slug` | 文章详情（自动计阅读量） | 无 |
| `POST /api/admin/articles` | 创建文章 | Author+ |
| `GET /api/admin/articles` | 管理文章列表 | Author+ |
| `GET /api/admin/articles/:id` | 获取文章详情 | Author+ |
| `PATCH /api/admin/articles/:id` | 更新文章 | Author+ |
| `DELETE /api/admin/articles/:id` | 软删除（归档） | Author+ |
| `DELETE /api/admin/articles/:id/permanent` | 永久删除 | Author+ |
| `GET /api/admin/articles/:id/export` | 导出（Markdown/JSON） | Author+ |
| `GET /api/admin/articles/:id/versions` | 版本列表 | Author+ |
| `GET /api/admin/articles/:id/versions/:versionId` | 版本详情 | Author+ |
| `POST /api/admin/articles/:id/versions/:versionId/restore` | 恢复版本 | Author+ |

- 状态：draft / scheduled / published / archived
- 可见性：public / private / password
- 定时发布自动触发

### 3. 分类模块（Categories）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/categories` | 公开分类列表 | 无 |
| `GET/POST/PATCH/DELETE /api/admin/categories` | 分类管理 CRUD | Admin+ |

- Slug 唯一性、可见性控制、使用中禁止删除

### 4. 标签模块（Tags）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/tags` | 公开标签列表 | 无 |
| `GET/POST/PATCH/DELETE /api/admin/tags` | 标签管理 CRUD | Admin+ |

### 5. 评论模块（Comments）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/articles/:articleId/comments` | 已审核评论（树形） | 无 |
| `POST /api/articles/:articleId/comments` | 发表评论 | 可选（限流 5/分钟） |
| `GET /api/admin/comments` | 管理评论列表 | Admin+ |
| `PUT /api/admin/comments/:id/status` | 审核评论 | Admin+ |
| `POST /api/admin/comments/:id/reply` | 管理员回复 | Admin+ |
| `DELETE /api/admin/comments/:id` | 删除评论（含子评论） | Admin+ |

- 嵌套评论树形结构、IP/UA 追踪
- 新评论自动通知作者，回复自动通知评论者

### 6. 留言板模块（Guestbook）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/guestbook` | 已审核留言（树形/分页） | 无 |
| `POST /api/guestbook` | 提交留言 | 无（限流 5/分钟） |
| `GET /api/admin/guestbook` | 管理留言列表 | Admin+ |
| `PUT /api/admin/guestbook/:id/status` | 审核留言 | Admin+ |
| `POST /api/admin/guestbook/:id/reply` | 管理员回复 | Admin+ |
| `DELETE /api/admin/guestbook/:id` | 删除留言 | Admin+ |

### 7. 自定义页面与友链（Pages）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/pages/about` | 获取关于页面 | 无 |
| `GET /api/pages/:slug` | 页面详情 | 无 |
| `GET /api/friend-links` | 已审核友链列表 | 无 |
| `POST /api/friend-links/applications` | 申请友链 | 无 |
| `CRUD /api/admin/pages` | 页面管理 | Admin+ |
| `CRUD /api/admin/friend-links` | 友链管理 | Admin+ |

- 页面类型：about / custom / resume / portfolio

### 8. 文章系列（Article Series）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/series` | 公开系列列表 | 无 |
| `GET /api/series/:slug` | 系列详情（含文章列表） | 无 |
| `CRUD /api/admin/series` | 系列管理 | Author+ |

### 9. 搜索模块（Search）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/search` | 全文搜索（关键词/分类/分页） | 无 |
| `POST /api/admin/search/rebuild-index` | 重建 ES 索引 | Admin+ |

- Elasticsearch 全文搜索，Elasticsearch 不可用时自动降级到数据库 LIKE 搜索
- 批量索引（每批 100 篇），关键词高亮

### 10. 归档模块（Archives）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/archives` | 归档摘要（年/月/计数） | 无 |
| `GET /api/archives/articles` | 指定月份文章列表 | 无 |

### 11. 收藏模块（Favorites）

| 端点 | 说明 | 角色 |
|------|------|------|
| `POST /api/favorites/:articleId` | 收藏文章 | JWT |
| `DELETE /api/favorites/:articleId` | 取消收藏 | JWT |
| `GET /api/favorites/:articleId/check` | 检查收藏状态 | JWT |
| `POST /api/favorites/batch-check` | 批量检查收藏状态 | JWT |

### 12. 站内通知（User Notifications）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/notifications` | 我的通知列表（分页） | JWT |
| `GET /api/notifications/unread-count` | 未读数量 | JWT |
| `PUT /api/notifications/:id/read` | 标记已读 | JWT |
| `PUT /api/notifications/read-all` | 全部标记已读 | JWT |
| `DELETE /api/notifications/:id` | 删除通知 | JWT |
| `POST /api/admin/notifications/broadcast` | 广播通知给所有用户 | Admin+ |

- 通知类型：comment_reply / like / system / announcement / favorite

### 13. 邮件订阅与通知（Notifications）

| 端点 | 说明 | 角色 |
|------|------|------|
| `POST /api/subscriptions` | 发起邮件订阅 | 无 |
| `GET /api/subscriptions/confirm/:token` | 确认订阅 | 无 |
| `GET /api/subscriptions/unsubscribe/:token` | 退订 | 无 |
| `POST /api/admin/notifications/send` | 发送单封邮件 | Admin+ |
| `POST /api/admin/notifications/notify-subscribers` | 新文章推送给所有订阅者 | Admin+ |
| `POST /api/admin/notifications/retry-failed` | 重试失败邮件 | Admin+ |
| `GET /api/admin/notifications/subscribers` | 订阅者列表 | Admin+ |

- SMTP 邮件发送、Token 验证双重确认、最多 3 次重试

### 14. 用户中心（Users）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/users/profile` | 获取个人资料 | JWT |
| `PUT /api/users/profile` | 更新个人资料 | JWT |
| `POST /api/users/avatar` | 上传头像 | JWT |
| `PUT /api/users/password` | 修改密码 | JWT |
| `GET /api/users/favorites` | 我的收藏文章列表 | JWT |

- 头像压缩：WebP 格式、最大 1024px、质量 85%、自动 EXIF 旋转

### 15. 公告（Announcements）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/announcements` | 已发布公告列表 | 无 |
| `GET /api/announcements/pinned` | 最新置顶公告 | 无 |
| `CRUD /api/admin/announcements` | 公告管理 | Admin+ |

### 16. 站点设置（Settings）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/settings` | 公开设置 | 无 |
| `GET/PUT/DELETE /api/admin/settings` | 设置管理 | Admin+ |
| `PUT /api/admin/settings/batch` | 批量更新设置 | Admin+ |

- Key-Value 存储、类型标注、分组管理、公开/私有标志

### 17. SEO 模块

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/seo/site` | 站点 SEO 配置 | 无 |
| `GET /api/seo/articles/:slug` | 文章 SEO Meta | 无 |
| `GET /api/seo/pages/:slug` | 页面 SEO Meta | 无 |
| `GET /api/seo/sitemap` | 生成 Sitemap JSON | 无 |

- OpenGraph 标签、作者归属、发布日期、分类信息

### 18. 国际化（i18n）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/i18n/locales` | 支持的语言列表 | 无 |
| `GET /api/i18n/default` | 默认语言 | 无 |
| `GET /api/i18n/translations/:locale` | 翻译包 | 无 |
| `PUT /api/i18n/default` | 设置默认语言 | Admin+ |

- 支持 zh-CN / en-US，内置翻译 + 数据库自定义覆盖

### 19. 仪表盘（Dashboard）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/admin/dashboard/stats` | 综合统计数据 | Admin+ |
| `GET /api/admin/dashboard/recent-articles` | 近期文章列表 | Admin+ |

### 20. 访客统计（Visitor Stats）

| 端点 | 说明 | 角色 |
|------|------|------|
| `POST /api/stats/visit` | 记录一次访问 | 无 |
| `GET /api/admin/stats/today` | 今日统计 | Admin+ |
| `GET /api/admin/stats/range` | 日期范围统计 | Admin+ |
| `GET /api/admin/stats/top-pages` | 热门页面 Top N | Admin+ |
| `GET /api/admin/stats/referers` | 来源统计 | Admin+ |
| `GET /api/admin/stats/devices` | 设备/浏览器/OS 分布 | Admin+ |

### 21. 数据备份（Backup）

| 端点 | 说明 | 角色 |
|------|------|------|
| `POST /api/admin/backup` | 创建备份 | Admin+ |
| `GET /api/admin/backup` | 备份列表 | Admin+ |
| `GET /api/admin/backup/:filename/download` | 下载备份 | Admin+ |
| `POST /api/admin/backup/:filename/restore` | 恢复备份（需二次认证） | Admin+ |
| `DELETE /api/admin/backup/:filename` | 删除备份 | Admin+ |

### 22. 多人协作（Collaboration）

| 端点 | 说明 | 角色 |
|------|------|------|
| `POST /api/admin/collaboration/:articleId/collaborators` | 添加协作者 | Author+ |
| `DELETE /api/admin/collaboration/:articleId/collaborators/:id` | 移除协作者 | Author+ |
| `GET /api/admin/collaboration/:articleId/collaborators` | 协作者列表 | Author+ |
| `PATCH /api/admin/collaboration/:articleId/draft` | 协作编辑草稿 | Author+ |
| `GET /api/admin/collaboration/:articleId/history` | 编辑历史 | Author+ |

- 权限等级：viewer / editor，变更追踪记录

### 23. 媒体库（Media Assets）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/media-assets/files/:fileName` | 访问文件 | 无 |
| `POST /api/admin/media-assets/upload` | 上传文件（5MB 限制） | Author+ |
| `GET /api/admin/media-assets` | 媒体列表 | Author+ |
| `GET/PATCH/DELETE /api/admin/media-assets/:id` | 媒体 CRUD | Author+ |

- 支持：JPEG、PNG、WebP、GIF、PDF、TXT、JSON、Markdown
- SHA256 内容去重、Alt 文本支持

### 24. 操作日志（Operation Logs）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/admin/operation-logs` | 日志列表（按模块/操作筛选） | Admin+ |

- 全局拦截器自动记录：模块名/操作名/目标/请求/响应/IP

### 25. 健康检查（Health）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/health` | 服务健康状态 | 无 |

- 检测 MySQL 和 Redis 连通性，返回 ok / degraded

### 26. RSS/Atom 订阅源（Feed）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/feed/rss` | RSS 2.0 订阅源 | 无 |
| `GET /api/feed/atom` | Atom 订阅源 | 无 |

- Redis 缓存（5 分钟服务端缓存，2 分钟客户端缓存）

### 27. 数据库管理（Database Admin）

| 端点 | 说明 | 角色 |
|------|------|------|
| `GET /api/admin/database/overview` | 数据库概览信息 | Super Admin |
| `GET /api/admin/database/tables` | 数据表列表（可搜索） | Super Admin |
| `GET /api/admin/database/tables/:tableName` | 表详情（字段/索引/外键） | Super Admin |
| `GET /api/admin/database/tables/:tableName/rows` | 分页读取数据行 | Super Admin |
| `POST /api/admin/database/tables/:tableName/rows` | 新增数据行（需二次认证） | Super Admin |
| `PATCH /api/admin/database/tables/:tableName/rows` | 更新数据行（需二次认证） | Super Admin |
| `POST /api/admin/database/tables/:tableName/rows/delete` | 删除数据行（需二次认证） | Super Admin |

---

## 💾 数据库设计

系统共包含 **26 张数据表**，分三期建设：

### 核心表
| 表名 | 说明 |
|------|------|
| `users` | 用户（username, email, password_hash, role, status） |
| `categories` | 分类（name, slug, color, sort_order, is_visible） |
| `tags` | 标签（name, slug, article_count） |
| `articles` | 文章（title, slug, content_markdown, status, visibility, view_count） |
| `article_tags` | 文章-标签关联 |
| `pages` | 自定义页面（title, slug, page_type, content_markdown） |
| `comments` | 评论（article_id, parent_id, content, status） |
| `friend_links` | 友情链接（site_name, site_url, status） |
| `site_settings` | 站点设置（setting_key, setting_value, is_public） |

### 扩展表
| 表名 | 说明 |
|------|------|
| `article_versions` | 文章版本历史（version_no, content, change_note） |
| `media_assets` | 媒体库（file_name, mime_type, file_path, hash_value） |
| `operation_logs` | 操作日志（operator_id, module_name, action_name） |
| `article_series` | 文章系列（name, slug, status） |
| `article_series_items` | 系列文章关联（series_id, article_id, sort_order） |
| `email_subscribers` | 邮件订阅（email, confirm_token, is_confirmed） |

### 社区扩展表
| 表名 | 说明 |
|------|------|
| `user_favorites` | 文章收藏（user_id, article_id） |
| `user_notifications` | 站内通知（user_id, type, title, is_read） |
| `visitor_logs` | 访客日志（ip, path, device, browser, os） |
| `guestbook` | 留言板（nickname, content, status） |
| `announcements` | 公告（title, content, status, is_pinned） |
| `draft_collaborators` | 协作者（article_id, user_id, permission） |
| `draft_edit_logs` | 协作编辑历史（article_id, field_changed, old_value） |
| `email_notifications` | 邮件队列（to_email, subject, status, retry_count） |

---

## 🚀 快速启动

### 前置条件

- Node.js >= 18
- MySQL 8.0
- Redis 7+
- Elasticsearch 8.13+（可选，不配置时搜索自动降级为数据库查询）

### 1. 克隆项目

```bash
git clone <仓库地址>
cd boke
```

### 2. 启动后端

```bash
cd server
cp .env.example .env      # 按实际环境编辑配置项
npm install
npm run db:init           # 初始化数据库（建库建表）
npm run start:dev         # 开发模式启动（http://localhost:3000）
```

### 3. 启动前端

```bash
cd client
npm install
npm run dev               # 开发模式启动（http://localhost:5173）
```

前端 `/api` 代理到 `http://localhost:3000`，详见 `client/vite.config.ts`。

### 4. Docker 一键启动（可选）

```bash
cd server
docker-compose up -d      # 启动 MySQL + Redis + Elasticsearch + API
```

### 5. 导入示例数据（可选）

```bash
cd server
npm run db:seed-content   # 导入用户/分类/标签/示例文章
npm run db:seed:about     # 导入关于页面内容
npm run db:seed-bulk      # 批量生成测试文章
npm run search:refresh-local  # 同步数据到 Elasticsearch
```

---

## 📜 常用命令

### 后端（server/）

```bash
npm run start:dev         # 开发服务器（热重载）
npm run start:debug       # 调试模式
npm run build             # 生产构建
npm run start:prod        # 生产启动（需先 build）
npm run db:init           # 初始化数据库
npm run migration:run     # 执行数据库迁移
npm run migration:revert  # 回滚数据库迁移
npm test                  # 运行单元测试
npm run test:cov          # 测试覆盖率
npm run lint              # ESLint 检查（含自动修复）
npm run format            # Prettier 格式化
npm run docs:generate     # 导出 OpenAPI 文档
```

### 前端（client/）

```bash
npm run dev               # Vite 开发服务器
npm run build             # 生产构建（vue-tsc + vite build）
npm run preview           # 预览构建产物
npm run typecheck         # 仅执行 TypeScript 类型检查
npm run test              # Vitest 单元测试
npm run test:watch        # Vitest 监听模式
npm run e2e               # Playwright E2E 测试
npm run e2e:headed        # Playwright 有界面模式
npm run format            # Prettier 格式化
```

---

## 🔧 环境变量配置

完整示例见 `server/.env.example`，以下为关键配置项：

```env
# 应用
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=blog_user
DB_PASSWORD=your_db_password
DB_DATABASE=blog_system

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=至少32位的随机字符串
JWT_EXPIRATION=7d

# 超级管理员（首次启动自动创建）
SUPER_ADMIN_USERNAME=rootmaster
SUPER_ADMIN_PASSWORD=强密码
SUPER_ADMIN_EMAIL=admin@example.com

# Elasticsearch（可选）
ES_NODE=http://localhost:9200

# SMTP 邮件（可选，用于注册验证码和订阅通知）
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password

# OAuth（可选）
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 限流
THROTTLE_TTL=60000
THROTTLE_LIMIT=120
```

---

## 📂 项目结构

```
boke/
├── server/                         # 后端（NestJS）
│   ├── src/
│   │   ├── main.ts                # 应用入口
│   │   ├── app.module.ts          # 根模块（27 模块注册）
│   │   ├── config/                # 配置管理（Joi 验证）
│   │   ├── common/                # 公共工具
│   │   │   ├── filters/           # 全局异常过滤器
│   │   │   ├── interceptors/      # 响应拦截器
│   │   │   ├── pipes/             # XSS 清理管道
│   │   │   ├── redis/             # Redis 模块
│   │   │   └── security/          # 安全模块（响应头/缓存）
│   │   ├── database/              # 数据库（TypeORM 实体/迁移）
│   │   └── modules/               # 功能模块（27 个）
│   │       ├── announcements/     # 公告
│   │       ├── archives/          # 归档
│   │       ├── article-series/    # 文章系列
│   │       ├── articles/          # 文章（含版本管理）
│   │       ├── auth/              # 认证（JWT/OAuth/二次认证）
│   │       ├── backup/            # 数据备份
│   │       ├── categories/        # 分类
│   │       ├── collaboration/     # 多人协作
│   │       ├── comments/          # 评论
│   │       ├── dashboard/         # 仪表盘
│   │       ├── database-admin/    # 数据库管理
│   │       ├── favorites/         # 收藏
│   │       ├── feed/              # RSS/Atom
│   │       ├── guestbook/         # 留言板
│   │       ├── health/            # 健康检查
│   │       ├── i18n/              # 国际化
│   │       ├── media-assets/      # 媒体库
│   │       ├── notifications/     # 邮件通知/订阅
│   │       ├── operation-logs/    # 操作日志
│   │       ├── pages/             # 页面与友链
│   │       ├── search/            # 全文搜索
│   │       ├── seo/               # SEO
│   │       ├── settings/          # 站点设置
│   │       ├── tags/              # 标签
│   │       ├── user-notifications/# 站内通知
│   │       ├── users/             # 用户管理
│   │       └── visitor-stats/     # 访客统计
│   ├── sql/                       # 初始化 SQL
│   ├── scripts/                   # 数据库初始化/种子脚本
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── package.json
│
├── client/                        # 前端（Vue 3）
│   ├── src/
│   │   ├── main.ts               # 应用入口
│   │   ├── App.vue               # 根组件
│   │   ├── router/index.ts       # 路由（含权限守卫）
│   │   ├── api/                  # API 请求层（18 个模块）
│   │   ├── stores/               # Pinia（8 个 Store）
│   │   ├── views/                # 页面视图
│   │   │   ├── HomeView.vue
│   │   │   ├── ArticleDetailView.vue
│   │   │   ├── CategoriesView.vue
│   │   │   ├── ArchivesView.vue
│   │   │   ├── SearchView.vue
│   │   │   ├── GuestbookView.vue
│   │   │   ├── AboutView.vue
│   │   │   ├── ProfileView.vue
│   │   │   └── admin/            # 管理后台（6 个视图）
│   │   ├── components/           # 公共组件（13 个）
│   │   ├── layouts/              # 布局（BlogLayout/AdminLayout）
│   │   ├── composables/          # 组合式函数
│   │   ├── types/                # TypeScript 类型定义
│   │   └── utils/                # 工具函数
│   ├── tests/                    # Playwright E2E 测试
│   ├── vite.config.ts
│   └── package.json
│
├── scripts/                       # 项目级脚本
├── ARCHITECTURE.md                # 技术架构文档
├── DATABASE.md                    # 数据库设计文档
└── README.md                      # 本文件
```

---

## 🔐 安全特性

| 特性 | 说明 |
|------|------|
| Helmet | HTTP 安全头（X-Frame-Options/HSTS/CSP 等） |
| CORS | 动态白名单，非法来源返回 403 |
| JWT + Cookie | HttpOnly Cookie 携带 Token，防 XSS 窃取 |
| bcrypt | 密码加密（10 轮） |
| 二次认证（Step-Up） | 高危操作需再次输入密码，带作用域控制 |
| class-validator | DTO 白名单模式，未声明字段自动剔除 |
| SanitizePipe | 全局 XSS 清理管道，自动转义 HTML 实体 |
| ThrottlerGuard | 全局限流（120 次/分钟），各敏感接口独立限流 |
| CSRF Token | 非 GET 请求携带 CSRF Token 验证 |
| 角色权限 | super_admin / admin / author / user 四级 RBAC |

---

## 📐 API 响应格式

### 成功响应

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "message": "Success",
  "timestamp": "2026-04-22T10:00:00.000Z"
}
```

### 错误响应

```json
{
  "success": false,
  "statusCode": 400,
  "message": "错误描述",
  "errors": null,
  "timestamp": "2026-04-22T10:00:00.000Z"
}
```

---

## 📄 License

MIT
