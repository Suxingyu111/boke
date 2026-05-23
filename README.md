# 个人博客系统

这是一个基于 `Vue 3 + NestJS` 的前后端分离个人博客系统。当前项目已经不只是初始化骨架，而是包含前台站点、管理后台、后端业务 API、MySQL 表结构、Redis 缓存、Elasticsearch 搜索、Docker 编排、启动脚本、测试用例和部署配置的完整全栈项目。

项目目标是提供一套可以用于个人博客、技术文章站、内容运营站点的完整系统，覆盖文章发布、分类标签、评论留言、收藏通知、订阅推送、SEO、访问统计、备份恢复、数据库管理和后台运维等能力。

## 目录

- [当前实现状态](#当前实现状态)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [已实现功能模块](#已实现功能模块)
- [后端 27 个模块说明](#后端-27-个模块说明)
- [数据库实现](#数据库实现)
- [初始化方式](#初始化方式)
- [启动方式](#启动方式)
- [Docker 启动引导细节](#docker-启动引导细节)
- [常用命令](#常用命令)
- [环境变量说明](#环境变量说明)
- [安全与稳定性实现](#安全与稳定性实现)
- [测试与质量检查](#测试与质量检查)
- [访问地址汇总](#访问地址汇总)
- [常见问题](#常见问题)

## 当前实现状态

- 前端位于 `client/`，使用 `Vue 3 + TypeScript + Vite + Pinia + Vue Router + Tailwind CSS`。
- 后端位于 `server/`，使用 `NestJS 10 + TypeORM + MySQL + Redis + Elasticsearch`。
- 根目录提供 `docker-compose.yml`，可以一次启动 MySQL、Redis、Elasticsearch、Kibana、后端服务和 Nginx 前端。
- 后端已经注册 27 个业务模块，并提供统一响应、统一异常处理、全局参数校验、XSS 清理、限流、响应缓存、安全响应头和操作审计。
- 数据库初始化脚本位于 `server/sql/init/001_init_schema.sql`，自动初始化脚本位于 `server/scripts/init-db.ts`。
- Docker 后端镜像启动时会执行 `server/scripts/docker-bootstrap.js`，自动等待依赖服务、初始化数据库、灌入演示数据和重建搜索索引。

## 技术栈

### 前端技术

| 技术 | 当前用途 |
| --- | --- |
| `Vue 3` | 前台站点和后台管理界面 |
| `TypeScript` | 类型约束和领域模型定义 |
| `Vite` | 开发服务器和生产构建 |
| `Vue Router` | 前台、用户中心、后台路由 |
| `Pinia` | 认证、内容、站点设置、用户中心等状态管理 |
| `Axios` | API 请求封装，统一 Cookie、CSRF、缓存处理 |
| `Tailwind CSS` | 页面样式与响应式布局 |
| `markdown-it` | Markdown 渲染 |
| `highlight.js` | 代码高亮 |
| `DOMPurify` | 前端 HTML 内容净化 |
| `Vitest` | 前端单元测试 |
| `Playwright` | 前端 E2E 测试 |

### 后端技术

| 技术 | 当前用途 |
| --- | --- |
| `NestJS 10` | 后端模块化框架 |
| `TypeORM` | MySQL 实体映射和查询 |
| `MySQL 8` | 主业务数据库 |
| `Redis 7` | 缓存、响应缓存、临时状态 |
| `Elasticsearch 8.13` | 文章全文搜索 |
| `Passport + JWT` | 登录认证、OAuth、权限保护 |
| `Swagger` | API 文档生成 |
| `Joi` | 环境变量校验 |
| `class-validator` | DTO 入参校验 |
| `sanitize-html` | 服务端 XSS 内容清理 |
| `Helmet` | HTTP 安全头 |
| `Sharp` | 图片处理和头像压缩 |
| `Nodemailer` | 邮件通知和订阅确认 |
| `Docker Compose` | 本地和生产容器编排 |

## 系统架构

```text
浏览器
  |
  | 访问站点、后台、用户中心
  v
Vue 3 前端应用
  |
  | /api REST 请求，携带 Cookie 与 CSRF Header
  v
NestJS API 服务
  |
  |-- MySQL：文章、用户、评论、设置、通知等持久化数据
  |-- Redis：响应缓存、临时状态、缓存锁
  |-- Elasticsearch：文章搜索索引和关键词查询
  |-- SMTP：注册验证码、订阅确认、文章通知邮件
```

后端所有 API 默认挂载在 `/api` 前缀下。前端开发环境通过 Vite 代理访问后端，Docker 环境通过 Nginx 将 `/api/` 转发到 `server:3000/api/`。

## 已实现功能模块

### 前台站点

| 页面或能力 | 实现说明 |
| --- | --- |
| 首页 | 展示站点内容入口、文章列表和公共内容数据，调用内容 API 获取文章、分类、标签等信息。 |
| 文章详情 | 根据文章 `slug` 加载文章详情，支持 Markdown/HTML 内容展示、阅读量、点赞、收藏、评论区等文章交互能力。 |
| 分类页 | 展示分类列表和分类下文章，支持前台浏览内容分类。 |
| 标签页 | 当前路由重定向到分类浏览入口，标签数据由内容 Store 和标签 API 支撑。 |
| 归档页 | 按年月查询文章归档数据，支持通过 URL 查询参数定位年份和月份。 |
| 搜索页 | 调用后端搜索 API，支持关键词搜索、分页、结果展示和搜索参数同步。 |
| 关于页 | 从页面模块读取 `about` 类型内容，支持 Markdown 内容展示。 |
| 自定义页面 | 通过 `/pages/:slug` 展示后台创建的自定义页面。 |
| 留言板 | 支持访客提交留言、查看已审核留言和管理员回复。 |
| 邮件订阅状态页 | 支持订阅确认和退订状态展示。 |
| OAuth 回调页 | 处理 GitHub / Google OAuth 登录后的前端状态刷新。 |
| 404 页面 | 处理未知路由。 |

### 用户中心

| 功能 | 实现说明 |
| --- | --- |
| 登录状态保持 | 使用服务端 Cookie 承载认证状态，前端用 `localStorage` 或 `sessionStorage` 保存会话存在标记和用户快照。 |
| 个人资料 | 读取当前用户信息，支持更新昵称、简介等资料。 |
| 头像上传 | 用户头像接口支持上传，后端使用 `Sharp` 处理图片。 |
| 密码修改 | 提供旧密码校验和新密码更新流程。 |
| 我的收藏 | 展示登录用户收藏的文章列表。 |
| 通知中心 | 支持站内通知列表、未读数量、标记已读、全部已读和删除。 |

### 管理后台

| 后台页面 | 权限 | 实现说明 |
| --- | --- | --- |
| 仪表盘 | `admin` 及以上 | 展示文章、阅读、评论等统计数据，以及近期文章列表。 |
| 文章管理 | `author` 及以上 | 支持文章创建、编辑、查询、状态筛选、软删除、永久删除、导出和版本管理。 |
| 评论管理 | `admin` 及以上 | 支持评论列表、状态审核、管理员回复和删除。 |
| 页面管理 | `admin` 及以上 | 支持自定义页面创建、编辑、发布状态管理和 SEO 字段维护。 |
| 站点设置 | `admin` 及以上 | 管理站点标题、描述、Logo、Favicon、社交链接、SEO、关于页扩展配置等 Key-Value 设置。 |
| 技术管理 | `admin` 及以上 | 集成备份管理、Sitemap、公告、国际化、访问统计等运维入口。 |
| 数据库管理 | `super_admin` | 浏览数据库概览、表结构、表数据，支持数据行新增、修改和删除；写操作需要二次认证。 |

后台路由权限由 `client/src/router/index.ts` 和 `client/src/utils/permissions.ts` 共同控制。后端通过 JWT Guard、角色 Guard 和 Step-Up Guard 进行服务端权限校验。

## 后端 27 个模块说明

### 认证与用户

| 模块 | API 前缀 | 实现说明 |
| --- | --- | --- |
| `auth` | `/api/auth` | 支持注册可用性检查、发送注册验证码、验证码校验、注册、登录、登出、当前用户、当前管理员用户、二次认证、OAuth Provider 列表、GitHub OAuth、Google OAuth。认证状态使用 Cookie，生产环境会校验强密码、Cookie SameSite 与 Secure 配置。 |
| `users` | `/api/users` | 提供当前用户资料读取和更新、头像上传、密码修改、用户收藏列表。头像上传由后端处理文件类型和图片压缩。 |
| `favorites` | `/api/favorites` | 支持收藏文章、取消收藏、检查单篇文章收藏状态、批量检查收藏状态。 |
| `user-notifications` | `/api/notifications` 和 `/api/admin/notifications` | 前台用户可查看通知、未读数、标记已读、全部已读、删除；后台可广播站内通知。 |

### 内容管理

| 模块 | API 前缀 | 实现说明 |
| --- | --- | --- |
| `articles` | `/api/articles` 和 `/api/admin/articles` | 前台支持文章列表、详情、点赞状态、点赞和取消点赞；后台支持文章 CRUD、状态管理、导出、软删除、永久删除。文章实体包含标题、Slug、摘要、Markdown/HTML 内容、封面、分类、作者、状态、发布时间、SEO 字段、阅读量和点赞数等信息。 |
| `article-versions` | `/api/admin/articles/:articleId/versions` | 记录文章版本历史，支持版本列表、版本详情和恢复指定版本。 |
| `categories` | `/api/categories` 和 `/api/admin/categories` | 前台提供分类列表；后台支持分类创建、查询、更新、删除。分类支持 Slug、描述、颜色、排序、可见性和文章计数。 |
| `tags` | `/api/tags` 和 `/api/admin/tags` | 前台提供标签列表；后台支持标签创建、查询、更新、删除。标签支持 Slug、描述、颜色和文章计数。 |
| `pages` | `/api/pages`、`/api/friend-links` 和 `/api/admin` | 支持关于页、自定义页面、友情链接展示、友链申请；后台支持页面 CRUD、友链 CRUD 和申请审核。 |
| `article-series` | `/api/series` 和 `/api/admin/series` | 支持前台系列文章列表和详情；后台支持系列创建、查询、更新、删除，以及系列内文章排序管理。 |
| `media-assets` | `/api/media-assets` 和 `/api/admin/media-assets` | 支持后台文件上传、媒体资源列表、详情、元数据更新和删除；公共接口提供媒体文件访问。媒体库支持类型校验、大小限制和文件哈希去重。 |
| `collaboration` | `/api/admin/collaboration` | 支持文章草稿协作，包括协作者添加、移除、查询、草稿更新和编辑历史查询。 |

### 社区互动

| 模块 | API 前缀 | 实现说明 |
| --- | --- | --- |
| `comments` | `/api/articles/:articleId/comments` 和 `/api/admin/comments` | 前台支持文章评论列表和评论提交；后台支持评论查询、审核状态变更、回复和删除。评论表支持父子评论结构、审核状态、访客信息和 IP/User-Agent 记录。 |
| `guestbook` | `/api/guestbook` 和 `/api/admin/guestbook` | 前台支持留言列表和留言提交；后台支持留言审核、回复和删除。 |
| `announcements` | `/api/announcements` 和 `/api/admin/announcements` | 前台支持公告列表和置顶公告；后台支持公告创建、编辑、删除、发布状态和置顶管理。 |

### 搜索、订阅与运营

| 模块 | API 前缀 | 实现说明 |
| --- | --- | --- |
| `search` | `/api/search` 和 `/api/admin/search` | 支持文章全文搜索，优先使用 Elasticsearch；后台提供重建索引接口。搜索服务包含数据库降级路径，避免搜索引擎不可用时完全阻断查询。 |
| `archives` | `/api/archives` | 提供文章归档月份聚合和归档文章分页查询。 |
| `feed` | `/api/feed` | 生成 RSS 和 Atom 订阅源，便于读者通过订阅器跟踪文章更新。 |
| `notifications` | `/api/subscriptions` 和 `/api/admin/notifications` | 支持邮件订阅、确认订阅、退订、发送通知、通知订阅者、失败邮件重试、订阅者管理和邮件通知记录查询。 |
| `visitor-stats` | `/api/stats` 和 `/api/admin/stats` | 前台记录访问；后台查询今日统计、时间范围统计、热门页面、来源分析和设备分布。 |
| `seo` | `/api/seo` | 提供站点 SEO、文章 SEO、页面 SEO 和 Sitemap 数据。 |
| `i18n` | `/api/i18n` | 提供语言列表、默认语言、指定语言翻译读取，以及默认语言更新。 |

### 系统管理

| 模块 | API 前缀 | 实现说明 |
| --- | --- | --- |
| `settings` | `/api/settings` 和 `/api/admin/settings` | 前台读取公开站点设置；后台支持设置查询、单项读取、单项写入、批量写入和删除。 |
| `dashboard` | `/api/admin/dashboard` | 提供后台统计卡片和近期文章数据。 |
| `backup` | `/api/admin/backup` | 支持创建备份、备份列表、下载、恢复、删除和备份演练。恢复和演练属于高风险操作，需要二次认证。 |
| `database-admin` | `/api/admin/database` | 提供数据库概览、表列表、表结构、表数据分页查询，以及表数据新增、更新、删除。该模块限定 `super_admin` 使用，并结合 Step-Up 二次认证保护写操作。 |
| `operation-logs` | `/api/admin/operation-logs` | 通过全局操作日志拦截器记录后台管理操作，支持操作日志查询和安全审计辅助能力。 |
| `health` | `/api/health` | 提供服务健康检查，覆盖应用、MySQL、Redis 等基础依赖状态。 |

## 数据库实现

数据库使用 `MySQL 8 + InnoDB + utf8mb4`。建表 SQL 位于 `server/sql/init/001_init_schema.sql`，初始化脚本会自动创建数据库、执行建表 SQL，并补齐兼容字段、索引、外键和默认角色。

当前核心表包括：

| 表名 | 说明 |
| --- | --- |
| `user_roles` | 用户角色字典，包含 `super_admin`、`admin`、`author`、`user` 等默认角色。 |
| `users` | 用户账号、资料、角色、状态、OAuth 信息、邮箱验证信息。 |
| `verification_codes` | 注册验证码和验证状态。 |
| `categories` | 文章分类。 |
| `tags` | 文章标签。 |
| `articles` | 文章主体数据。 |
| `article_tags` | 文章和标签的多对多关联。 |
| `article_likes` | 文章点赞记录。 |
| `article_versions` | 文章版本历史。 |
| `draft_collaborators` | 草稿协作者。 |
| `draft_edit_logs` | 草稿编辑历史。 |
| `pages` | 自定义页面和关于页。 |
| `friend_links` | 友情链接和友链申请。 |
| `comments` | 文章评论与回复。 |
| `guestbook` | 留言板数据。 |
| `site_settings` | 站点配置。 |
| `media_assets` | 媒体资源。 |
| `operation_logs` | 后台操作日志。 |
| `article_series` | 文章系列。 |
| `article_series_items` | 系列文章条目。 |
| `email_subscribers` | 邮件订阅者。 |
| `email_notifications` | 邮件通知记录。 |
| `announcements` | 公告。 |
| `favorites` | 用户收藏。 |
| `user_notifications` | 站内通知。 |
| `visitor_logs` | 访问统计日志。 |

## 初始化方式

### 方式一：本地手动初始化

适合日常开发，前后端分别启动。

1. 准备基础服务。

需要本机已有：

- `Node.js 20+`
- `npm 10+`
- `MySQL 8`
- `Redis 7`
- `Elasticsearch 8`（搜索功能需要；不启用搜索时后端有数据库降级逻辑）

本地执行 `npm run db:init` 时，脚本会使用 `DB_USERNAME` 和 `DB_PASSWORD` 连接 MySQL，并执行 `CREATE DATABASE`、`CREATE TABLE`、`ALTER TABLE`、`CREATE INDEX` 等操作。因此本地数据库账号需要具备建库、建表、改表、创建索引和写入数据的权限。

2. 初始化后端环境变量。

```bash
cd server
cp .env.example .env
```

重点检查 `.env` 中这些配置：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=blog_user
DB_PASSWORD=change_me_db_password
DB_DATABASE=blog_system

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=change_me_redis_password_strong

ES_NODE=http://localhost:9200

JWT_SECRET=change_me_to_a_32_plus_char_random_secret

SUPER_ADMIN_USERNAME=rootmaster
SUPER_ADMIN_PASSWORD=change_me_super_admin_password_strong
SUPER_ADMIN_EMAIL=root@example.com
SUPER_ADMIN_NICKNAME=系统超管
```

3. 安装依赖并初始化数据库。

```bash
cd server
npm install
npm run db:init
```

`npm run db:init` 会执行以下事情：

- 读取 `server/.env`
- 连接 MySQL 实例
- 自动创建 `DB_DATABASE` 指定的数据库
- 执行 `sql/init/001_init_schema.sql`
- 补齐历史兼容字段、索引和外键
- 写入默认用户角色
- 如果配置了 `SUPER_ADMIN_*`，会创建或更新超级管理员账号

4. 可选：初始化内容数据。

```bash
cd server
npm run db:seed:about
npm run db:seed-content
npm run db:seed:demo
```

常用种子脚本说明：

| 命令 | 说明 |
| --- | --- |
| `npm run db:seed:about` | 写入关于页基础内容。 |
| `npm run db:seed-content` | 写入基础文章、分类、标签等内容。 |
| `npm run db:seed:showcase` | 写入展示型内容数据。 |
| `npm run db:seed:demo` | 写入演示环境所需的完整演示数据。 |
| `npm run db:seed-bulk` | 批量生成文章数据，适合测试分页、搜索和性能。 |

5. 可选：重建搜索索引。

```bash
cd server
npm run search:rebuild
```

如果希望一条命令完成演示数据和索引刷新，可以使用：

```bash
cd server
npm run search:refresh-local
```

### 方式二：Docker 开发环境初始化

适合希望快速拉起完整依赖的开发或验收场景。

```bash
cp .env.docker.dev.example .env.docker.dev
docker compose --env-file .env.docker.dev -f docker-compose.yml up -d --build
```

开发环境模板默认配置：

| 配置 | 默认值 |
| --- | --- |
| 前端入口 | `http://localhost` |
| 后端 API | `http://localhost:3000/api` |
| MySQL 端口 | `3306` |
| Redis 端口 | `6379` |
| Elasticsearch 端口 | `9200` |
| Kibana 端口 | `5601` |
| 数据库名 | `blog_system_dev` |
| 超管用户名 | `rootmaster` |
| 超管密码 | 复制 `.env.docker.dev.example` 后自行设置 |
| 自动建库 | `DOCKER_BOOTSTRAP_INIT_DB=true` |
| 自动灌入演示数据 | `DOCKER_BOOTSTRAP_SEED_DEMO=true` |
| 自动重建索引 | `DOCKER_BOOTSTRAP_REINDEX=true` |

Docker 开发环境启动后会自动构建并启动：

- `mysql`
- `redis`
- `elasticsearch`
- `kibana`
- `server`
- `nginx`

### 方式三：Docker 生产环境初始化

适合部署或接近生产的验证环境。

```bash
cp .env.docker.example .env.docker
```

启动前必须修改 `.env.docker` 中的敏感信息：

```env
CLIENT_URL=https://blog.example.com
CORS_ORIGINS=https://blog.example.com,https://www.blog.example.com
JWT_SECRET=change_me_to_a_32_plus_char_random_secret

MYSQL_ROOT_PASSWORD=change_me_to_a_strong_root_password
MYSQL_DATABASE=blog_system
MYSQL_USER=blog_user
MYSQL_PASSWORD=change_me_to_a_strong_app_password

REDIS_PASSWORD=change_me_to_a_strong_redis_password

SUPER_ADMIN_USERNAME=rootmaster
SUPER_ADMIN_PASSWORD=change_me_to_a_strong_admin_password
SUPER_ADMIN_EMAIL=admin@example.com
```

生产模板默认不灌入演示数据：

```env
DOCKER_BOOTSTRAP_INIT_DB=true
DOCKER_BOOTSTRAP_SEED_DEMO=false
DOCKER_BOOTSTRAP_REINDEX=false
DB_SYNCHRONIZE=false
```

启动命令：

```bash
docker compose --env-file .env.docker -f docker-compose.yml up -d --build
```

## 启动方式

### 正常本地启动

本地开发时建议前后端分开启动。

1. 启动后端。

```bash
cd server
npm run start:dev
```

后端默认地址：

- API：`http://localhost:3000/api`
- 健康检查：`http://localhost:3000/api/health`
- Swagger：`http://localhost:3000/api/docs`

2. 启动前端。

```bash
cd client
npm run dev
```

前端默认地址：

- `http://localhost:5173`

3. 生产构建和本地预览。

```bash
cd server
npm run build
npm run start:prod
```

```bash
cd client
npm run build
npm run preview
```

### 通过 Docker Compose 启动

开发环境：

```bash
docker compose --env-file .env.docker.dev -f docker-compose.yml up -d --build
```

生产环境：

```bash
docker compose --env-file .env.docker -f docker-compose.yml up -d --build
```

查看服务状态：

```bash
docker compose --env-file .env.docker.dev -f docker-compose.yml ps
```

查看后端日志：

```bash
docker compose --env-file .env.docker.dev -f docker-compose.yml logs -f server
```

停止服务：

```bash
docker compose --env-file .env.docker.dev -f docker-compose.yml down
```

如需同时删除数据卷，谨慎执行：

```bash
docker compose --env-file .env.docker.dev -f docker-compose.yml down -v
```

### 通过启动脚本启动

项目提供了脚本化启动入口，适合生产服务器或日常快速拉起。

#### Linux / macOS 生产启动脚本

```bash
./scripts/start-prod.sh
```

默认行为：

- 如果存在 `.env.docker`，使用它作为环境文件
- 如果不存在 `.env.docker`，会从 `.env.docker.example` 生成一份
- 校验 `docker compose` 配置
- 启动 `mysql`、`redis`、`elasticsearch`、`kibana`
- 等待 MySQL 和 Elasticsearch 健康
- 校验或修复 MySQL 应用用户授权
- 启动 `server` 和 `nginx`
- 等待后端健康检查通过
- 输出最终容器状态

指定环境文件启动：

```bash
./scripts/start-prod.sh .env.docker.dev
```

停止脚本：

```bash
./scripts/stop-prod.sh
```

指定环境文件停止：

```bash
./scripts/stop-prod.sh .env.docker.dev
```

#### Windows 本地开发启动脚本

```bat
scripts\start-local-dev.bat
```

该脚本会依次检查端口并启动：

- `9200`：Elasticsearch
- `3000`：后端开发服务
- `5173`：前端开发服务

如果对应端口已经被监听，脚本会跳过该服务。脚本完成后可访问：

- 后端健康检查：`http://127.0.0.1:3000/api/health`
- 前端默认地址：`http://127.0.0.1:5173/`
- 前端备用地址：`http://127.0.0.1:5174/`
- Elasticsearch：`http://127.0.0.1:9200/`

### systemd 托管启动

仓库提供了 `deploy/systemd/boke-compose.service` 示例，可用于 Linux 服务器托管 Docker Compose 栈。

使用前需要修改文件中的：

```ini
Environment=PROJECT_ROOT=/path/to/boke
Environment=ENV_FILE=.env.docker
```

示例安装流程：

```bash
sudo cp deploy/systemd/boke-compose.service /etc/systemd/system/boke-compose.service
sudo systemctl daemon-reload
sudo systemctl enable boke-compose
sudo systemctl start boke-compose
```

查看状态：

```bash
sudo systemctl status boke-compose
```

停止服务：

```bash
sudo systemctl stop boke-compose
```

## Docker 启动引导细节

后端 Dockerfile 的启动命令是：

```dockerfile
CMD ["node", "scripts/docker-bootstrap.js"]
```

这意味着容器启动后不是直接运行 NestJS，而是先执行引导脚本。引导脚本会：

1. 等待 MySQL TCP 端口可连接。
2. 等待 Redis TCP 端口可连接。
3. 等待 Elasticsearch `_cluster/health` 可访问。
4. 如果 `DOCKER_BOOTSTRAP_INIT_DB=true`，执行已编译的 `dist/scripts/init-db.js`。
5. 如果 `DOCKER_BOOTSTRAP_SEED_DEMO=true`，执行 `dist/scripts/seed-demo.js`。
6. 如果没有灌入演示数据但 `DOCKER_BOOTSTRAP_REINDEX=true`，执行 `dist/scripts/rebuild-search-index.js`。
7. 最后启动 `dist/src/main.js`。

这套设计可以保证容器第一次启动时自动完成基础初始化，也能通过环境变量关闭演示数据灌入，适配生产部署。

## 常用命令

### 后端命令

```bash
cd server

npm run start:dev              # 开发模式启动，支持热重载
npm run start:debug            # 调试模式启动
npm run build                  # 构建 dist
npm run start:prod             # 运行构建产物
npm run test                   # 运行 Jest 测试
npm run test:watch             # 监听模式测试
npm run test:cov               # 测试覆盖率
npm run lint                   # ESLint 自动修复
npm run format                 # Prettier 格式化
npm run db:init                # 初始化数据库
npm run docs:generate          # 生成 OpenAPI 文档
npm run sbom:generate          # 生成 SBOM
npm run supply-chain:verify    # 供应链策略校验
npm run supply-chain:scan      # 扫描固定镜像策略
npm run backup:drill           # 备份恢复演练
npm run search:rebuild         # 重建 Elasticsearch 索引
npm run search:refresh-local   # 灌入数据并刷新索引
```

### 前端命令

```bash
cd client

npm run dev                    # Vite 开发服务器
npm run build                  # 类型检查并构建生产产物
npm run preview                # 本地预览生产构建
npm run test                   # Vitest 单元测试
npm run test:watch             # Vitest 监听模式
npm run typecheck              # Vue 类型检查
npm run format                 # 格式化前端代码
npm run e2e                    # Playwright E2E 测试
npm run e2e:headed             # 有界面模式运行 E2E
```

## 环境变量说明

### 后端核心环境变量

| 变量 | 说明 |
| --- | --- |
| `NODE_ENV` | 运行环境，支持 `development`、`production`、`test`。 |
| `PORT` | 后端监听端口，默认 `3000`。 |
| `APP_NAME` | 应用名称。 |
| `APP_DESC` | Swagger 和应用描述。 |
| `CORS_ORIGINS` | 允许跨域访问的前端域名，多个值用逗号分隔。 |
| `DB_HOST` | MySQL 地址。 |
| `DB_PORT` | MySQL 端口。 |
| `DB_USERNAME` | MySQL 应用用户。 |
| `DB_PASSWORD` | MySQL 应用用户密码。 |
| `DB_DATABASE` | 业务数据库名。 |
| `DB_SYNCHRONIZE` | TypeORM 自动同步开关，当前推荐保持 `false`。 |
| `REDIS_HOST` | Redis 地址。 |
| `REDIS_PORT` | Redis 端口。 |
| `REDIS_PASSWORD` | Redis 密码。生产环境要求强密码。 |
| `ES_NODE` | Elasticsearch 节点地址。 |
| `JWT_SECRET` | JWT 密钥，生产环境至少 32 位。 |
| `JWT_EXPIRATION` | JWT 过期时间，默认 `7d`。 |
| `AUTH_COOKIE_NAME` | 登录 Cookie 名称。 |
| `AUTH_COOKIE_SECURE` | Cookie Secure 开关。 |
| `AUTH_COOKIE_SAME_SITE` | Cookie SameSite 策略。 |
| `AUTH_STEP_UP_COOKIE_NAME` | 二次认证 Cookie 名称。 |
| `AUTH_STEP_UP_TTL` | 二次认证有效期。 |
| `CLIENT_URL` | 前端地址，用于 OAuth 回跳和邮件链接。 |
| `SUPER_ADMIN_USERNAME` | 超级管理员用户名。 |
| `SUPER_ADMIN_PASSWORD` | 超级管理员密码。 |
| `SUPER_ADMIN_EMAIL` | 超级管理员邮箱。 |
| `SMTP_HOST` | SMTP 主机，可为空。 |
| `SMTP_PORT` | SMTP 端口。 |
| `SMTP_USER` | SMTP 用户。 |
| `SMTP_PASS` | SMTP 密码。 |
| `SMTP_FROM` | 发件人。 |
| `SWAGGER_ENABLED` | 是否启用 Swagger。 |

### Docker 专用变量

| 变量 | 说明 |
| --- | --- |
| `NGINX_HOST_PORT` | Nginx 对外端口，默认 `80`。 |
| `SERVER_HOST_PORT` | 后端对外端口，默认 `3000`。 |
| `MYSQL_HOST_PORT` | MySQL 对外端口，默认 `3306`。 |
| `REDIS_HOST_PORT` | Redis 对外端口，默认 `6379`。 |
| `ES_HOST_PORT` | Elasticsearch 对外端口，默认 `9200`。 |
| `KIBANA_HOST_PORT` | Kibana 对外端口，默认 `5601`。 |
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码。 |
| `MYSQL_DATABASE` | Docker 初始化数据库名。 |
| `MYSQL_USER` | Docker 应用数据库用户。 |
| `MYSQL_PASSWORD` | Docker 应用数据库密码。 |
| `REDIS_PASSWORD` | Docker Redis 密码。 |
| `ES_JAVA_OPTS` | Elasticsearch JVM 参数。 |
| `VITE_PAGE_CACHE_TTL` | 前端 GET 页面缓存时间。 |
| `DOCKER_BOOTSTRAP_INIT_DB` | 容器启动时是否初始化数据库。 |
| `DOCKER_BOOTSTRAP_SEED_DEMO` | 容器启动时是否写入演示数据。 |
| `DOCKER_BOOTSTRAP_REINDEX` | 容器启动时是否重建搜索索引。 |
| `DOCKER_BOOTSTRAP_WAIT_TIMEOUT_MS` | 容器等待依赖服务的超时时间。 |

### 前端环境变量

| 变量 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | API 地址，Docker Nginx 环境默认为 `/api`。 |
| `VITE_ASSET_CDN` | 静态资源 CDN 前缀。 |
| `VITE_PAGE_CACHE_TTL` | 前端 GET 请求缓存时长。 |
| `VITE_PAGE_CACHE_MAX_ENTRIES` | 前端 GET 请求缓存最大条目数。 |

## 安全与稳定性实现

| 能力 | 实现说明 |
| --- | --- |
| 全局限流 | `ThrottlerGuard` 默认限制 60 秒 120 次请求，可通过 `THROTTLE_TTL` 和 `THROTTLE_LIMIT` 调整。 |
| 参数校验 | 全局 `ValidationPipe` 开启白名单、禁止未知字段和自动类型转换。 |
| XSS 清理 | 全局 `SanitizePipe` 和 `sanitize-html` 清理输入内容。 |
| 安全响应头 | `Helmet` 配合自定义安全头配置，支持 HSTS、CSP Report Only、Referrer Policy 和 Permissions Policy。 |
| 统一响应 | `ResponseInterceptor` 将成功响应封装为 `success`、`statusCode`、`data`、`message`、`timestamp`。 |
| 统一异常 | `HttpExceptionFilter` 统一处理异常响应。 |
| 响应缓存 | `ResponseCacheInterceptor` 和 Redis 缓存服务提供可控响应缓存。 |
| 操作审计 | `OperationLogInterceptor` 自动记录后台管理操作。 |
| 二次认证 | 数据库管理、备份恢复等高风险操作由 Step-Up Guard 保护。 |
| CSRF 辅助 | 前端非 GET 请求自动附带 `X-CSRF-Token`。 |
| 文件安全 | 媒体库和头像上传包含类型、大小和文件名校验逻辑。 |
| 生产校验 | `Joi` 在生产环境强制校验 JWT、Redis 密码和超级管理员密码强度。 |

## API 响应格式

后端成功响应会被统一封装：

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "message": "Success",
  "timestamp": "2026-04-26T00:00:00.000Z"
}
```

前端 `client/src/api/http.ts` 已适配该响应格式，并统一处理：

- `withCredentials`
- `Accept: application/json`
- `X-Requested-With`
- 非 GET 请求的 `X-CSRF-Token`
- 401 后清理本地会话缓存
- GET 请求短期缓存
- 开发环境 GET 请求网络错误重试

## 项目结构

```text
boke/
├── client/
│   ├── src/
│   │   ├── api/                 # 前端 API 封装
│   │   ├── components/          # 通用组件
│   │   ├── composables/         # 组合式逻辑
│   │   ├── layouts/             # 前台和后台布局
│   │   ├── router/              # Vue Router 路由和权限跳转
│   │   ├── stores/              # Pinia 状态管理
│   │   ├── types/               # 前端领域类型
│   │   ├── utils/               # Markdown、SEO、安全、权限工具
│   │   └── views/               # 页面视图
│   ├── tests/e2e/               # Playwright E2E 测试
│   ├── nginx/default.conf       # 前端容器 Nginx 配置
│   ├── Dockerfile               # 前端 Docker 镜像
│   └── package.json
├── server/
│   ├── src/
│   │   ├── common/              # 过滤器、拦截器、管道、安全、Redis
│   │   ├── config/              # 配置解析、CORS、安全头、环境校验
│   │   ├── database/            # TypeORM 模块、实体、默认角色
│   │   └── modules/             # 27 个业务模块
│   ├── scripts/                 # 数据库、搜索、备份、OpenAPI、供应链脚本
│   ├── sql/init/                # 初始化 SQL
│   ├── test/                    # Jest 测试
│   ├── docs/                    # API 和安全设计文档
│   ├── Dockerfile
│   └── package.json
├── deploy/systemd/              # systemd 服务示例
├── scripts/                     # 根目录启动和停止脚本
├── docker-compose.yml           # 全栈 Docker Compose
├── .env.docker.example          # 生产 Docker 环境模板
├── .env.docker.dev.example      # 开发 Docker 环境模板
├── DATABASE.md                  # 数据库设计文档
├── ARCHITECTURE.md              # 架构文档
├── 技术设计文档.md               # 技术设计文档
└── 需求文档.md                   # 需求文档
```

## 测试与质量检查

### 后端测试

```bash
cd server
npm run test
```

后端测试覆盖范围包括：

- 认证与 JWT
- 角色权限与二次认证
- 文章、分类、标签
- 评论、留言板、收藏
- 页面、设置、SEO
- 搜索、归档、Feed
- 访问统计
- 备份和数据库管理
- 安全头、CORS、XSS 清理、响应缓存
- 操作日志和供应链策略

### 前端测试

```bash
cd client
npm run test
npm run e2e
```

前端测试覆盖范围包括：

- API 客户端缓存和错误处理
- 认证 Store
- 内容 Store
- 通用组件
- 权限工具
- 公共站点 E2E
- 后台站点 E2E

## 访问地址汇总

### 本地开发

| 服务 | 地址 |
| --- | --- |
| 前端开发服务器 | `http://localhost:5173` |
| 后端 API | `http://localhost:3000/api` |
| 健康检查 | `http://localhost:3000/api/health` |
| Swagger | `http://localhost:3000/api/docs` |
| Elasticsearch | `http://localhost:9200` |
| Kibana | `http://localhost:5601` |

### Docker 默认

| 服务 | 地址 |
| --- | --- |
| 站点首页 | `http://localhost` |
| 后端 API | `http://localhost:3000/api` |
| 健康检查 | `http://localhost:3000/api/health` |
| Swagger | `http://localhost:3000/api/docs` |
| Elasticsearch | `http://localhost:9200` |
| Kibana | `http://localhost:5601` |

## 常见问题

### 1. MySQL 已有数据卷导致密码不一致

如果 Docker 启动时报 MySQL 认证失败，通常是已有 `mysql_data` 数据卷使用了旧密码。处理方式：

- 保持 `.env.docker` 中的 MySQL 密码和首次初始化时一致。
- 或在确认不需要旧数据后执行 `docker compose down -v` 删除数据卷重新初始化。

### 2. Docker 生产环境不要直接使用模板密码

`.env.docker.example` 中所有 `change_me_*` 都必须替换。生产环境下后端会校验弱密码和占位密码，超级管理员密码少于 12 位会启动失败。

### 3. Swagger 地址打不开

检查 `SWAGGER_ENABLED`。开发环境默认可开启，生产环境建议按实际需求开启或关闭。

### 4. 搜索不可用

先检查 Elasticsearch：

```bash
curl http://localhost:9200/_cluster/health
```

然后重建索引：

```bash
cd server
npm run search:rebuild
```

### 5. 前端请求 401

登录态由 Cookie 和前端会话标记共同维护。出现 401 时前端会自动清理本地会话缓存，需要重新登录。跨域场景要检查 `CORS_ORIGINS`、`CLIENT_URL`、`AUTH_COOKIE_SECURE` 和 `AUTH_COOKIE_SAME_SITE`。

## 相关文档

- [后端 README](server/README.md)
- [前端 README](client/README.md)
- [数据库设计](DATABASE.md)
- [系统架构](ARCHITECTURE.md)
- [技术设计文档](技术设计文档.md)
- [需求文档](需求文档.md)
- [后端 OpenAPI JSON](server/docs/openapi.json)

## 开发建议

新功能开发时建议先从以下入口理解项目：

- 前端路由入口：`client/src/router/index.ts`
- 前端 API 封装：`client/src/api/http.ts`
- 前端状态管理：`client/src/stores/`
- 后端模块注册：`server/src/app.module.ts`
- 后端入口：`server/src/main.ts`
- 数据库实体：`server/src/database/entities/`
- 初始化脚本：`server/scripts/init-db.ts`
- Docker 启动引导：`server/scripts/docker-bootstrap.js`

如果只是快速体验完整系统，优先使用 `.env.docker.dev.example` 和 Docker Compose；如果要深入开发，建议使用本地手动启动方式，前后端分别运行，调试会更直接。

## License

MIT
