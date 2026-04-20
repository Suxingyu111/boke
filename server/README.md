# 博客系统 - 后端项目

基于 NestJS + TypeORM + MySQL + Redis 的个人博客系统后端。

## 🏗️ 项目结构

```
server/
├── src/
│   ├── config/                  # 配置管理
│   │   ├── configuration.ts    # 配置对象
│   │   ├── validation.ts       # 环境变量验证
│   │   └── joi.ts              # Joi 拓展
│   │
│   ├── common/                  # 公共工具
│   │   ├── filters/            # 异常过滤器
│   │   ├── interceptors/       # 响应拦截器
│   │   ├── redis/              # Redis 服务
│   │   └── pipes/              # 验证管道
│   │
│   ├── database/                # 数据库
│   │   ├── entities/           # 实体定义
│   │   ├── migrations/         # 数据库迁移
│   │   └── database.module.ts  # 数据库模块
│   │
│   ├── modules/                 # 功能模块
│   │   ├── auth/               # 认证模块
│   │   ├── articles/           # 文章模块
│   │   ├── categories/         # 分类模块
│   │   ├── tags/               # 标签模块
│   │   └── users/              # 用户模块
│   │
│   ├── app.module.ts           # 应用模块
│   └── main.ts                 # 应用入口
│
├── package.json                # 依赖配置
├── tsconfig.json               # TypeScript 配置
├── nest-cli.json               # Nest CLI 配置
├── .env.example                # 环境变量示例
└── .gitignore                  # Git 忽略配置
```

## 📦 核心依赖

- **NestJS**: 现代化的 Node.js 框架
- **TypeORM**: ORM 库，支持 MySQL、PostgreSQL
- **MySQL2**: MySQL 数据库驱动
- **Redis**: 缓存和会话存储
- **Passport + JWT**: 身份验证和授权
- **class-validator**: DTO 验证

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
npm install
# 或
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库和 Redis 连接：

```env
# Application
NODE_ENV=development
PORT=3000

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=blog_user
DB_PASSWORD=blog_password
DB_DATABASE=blog_system

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_secret_key_here

# 连接池与文档
DB_POOL_SIZE=10
SWAGGER_ENABLED=true

# 前端地址与 OAuth（可选）
CLIENT_URL=http://localhost:5173
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:3000/api/auth/github/callback
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

### 3. 初始化数据库

推荐直接使用初始化脚本自动创建数据库和全部表结构：

```bash
npm run db:init
```

初始化脚本会读取 `.env` 中的 `DB_HOST`、`DB_PORT`、`DB_USERNAME`、`DB_PASSWORD` 和 `DB_DATABASE`，自动执行 [server/sql/init/001_init_schema.sql](server/sql/init/001_init_schema.sql) 中的建表语句。

前提条件：`.env` 中配置的数据库账号需要具备 `CREATE DATABASE` 和目标库建表权限。

如需手动授予数据库权限，可先执行：

```sql
CREATE DATABASE blog_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'blog_user'@'localhost' IDENTIFIED BY 'blog_password';
GRANT ALL PRIVILEGES ON blog_system.* TO 'blog_user'@'localhost';
FLUSH PRIVILEGES;
```

如果数据库已存在，也可以在完成授权后直接执行 `npm run db:init`，脚本会复用已有数据库并补齐缺失表。

### 4. 启动应用

**开发环境**：
```bash
npm run start:dev
```

**生产环构建**：
```bash
npm run build
npm run start:prod
```

## 📋 数据库实体

### User（用户）
- id: UUID
- username: 用户名
- email: 邮箱
- password: 密码（加密）
- nickname: 昵称
- avatar: 头像 URL
- bio: 个人介绍
- role: 角色 (admin, user)
- createdAt, updatedAt: 时间戳

### Article（文章）
- id: UUID
- title: 标题
- slug: URL 友好的标识
- excerpt: 摘要
- content: 正文（支持 Markdown）
- coverImage: 封面图
- status: 状态 (draft, published, archived)
- viewCount: 浏览次数
- userId: 作者 ID
- publishedAt: 发布时间
- createdAt, updatedAt: 时间戳

### Category（分类）
- id: UUID
- name: 分类名称
- slug: URL 友好的标识
- description: 描述
- articleCount: 文章数
- color: 颜色标识

### Tag（标签）
- id: UUID
- name: 标签名称
- slug: URL 友好的标识
- articleCount: 文章数

## 🔧 可用命令

```bash
# 开发
npm run start:dev          # 启动开发服务器（热重载）
npm run start:debug        # 启动调试模式
npm run search:refresh-local # 导入演示内容并重建 Elasticsearch 索引

# 构建和生产
npm run build              # 构建项目
npm run start:prod         # 启动生产服务器
npm run docs:generate      # 导出 OpenAPI 文档到 docs/openapi.json

# 质量检查
npm run lint               # 运行 ESLint
npm run format             # 格式化代码
npm test                   # 运行单元测试
npm run test:cov           # 生成覆盖率报告

# 数据库
npm run db:init            # 自动创建数据库和全部表
npm run db:seed-content    # 填充基础演示内容
npm run typeorm            # 运行 TypeORM CLI
npm run migration:generate # 生成迁移文件
npm run migration:run      # 执行迁移
npm run migration:revert   # 回滚迁移
```

当本地 Elasticsearch、MySQL 和 Redis 都已启动后，可以执行 `npm run search:refresh-local`。
这个命令会先导入内容种子数据，再直接调用后端 SearchService 完成全文索引重建，适合联调前快速恢复可搜索数据。

## 🔐 认证

项目使用 JWT (JSON Web Token) 进行身份验证：

1. 用户登录时返回 access token
2. 后续请求在 Authorization header 中传递 token
3. 服务器验证 token 并提取用户信息
4. 当前认证接口文档见 [server/docs/AUTH_API.md](server/docs/AUTH_API.md)
5. 内容管理接口文档见 [server/docs/CONTENT_API.md](server/docs/CONTENT_API.md)
6. 页面管理接口文档见 [server/docs/PAGES_API.md](server/docs/PAGES_API.md)
7. 前端展示接口文档见 [server/docs/FRONTEND_DISPLAY_API.md](server/docs/FRONTEND_DISPLAY_API.md)
8. 在线 Swagger 文档（启用时）见 `http://localhost:3000/api/docs`
9. 原始 OpenAPI JSON：`http://localhost:3000/api/docs-json`
10. 原始 OpenAPI YAML：`http://localhost:3000/api/docs-yaml`
11. 可离线导出完整接口文档：`npm run docs:generate`
12. 导出文件位置：`server/docs/openapi.json`
13. 订阅源接口：`/api/feed/rss`、`/api/feed/atom`
14. OAuth 登录入口：`/api/auth/github`、`/api/auth/google`

```bash
# 请求示例
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/me
```

## 🗄️ 数据库连接配置

TypeORM 已配置为自动加载 `src/database/entities` 下的所有实体。

### 添加新实体的步骤

1. 在 `src/database/entities` 下创建新实体文件
2. 导出实体类
3. 在 `src/database/entities/index.ts` 中导出
4. TypeORM 将自动识别

### 创建数据库迁移

```bash
npm run migration:generate -- -n InitialSchema
npm run migration:run
```

## 📝 项目特性

✅ 基于 NestJS 的模块化架构
✅ 完整的异常处理和日志系统
✅ TypeORM 数据库 ORM
✅ MySQL 数据库支持
✅ Redis 缓存支持
✅ JWT 身份验证
✅ 全局响应格式化
✅ 环境变量配置
✅ TypeScript 类型安全
✅ API 请求验证
✅ CORS 支持

## 🤝 后续开发

项目已准备好开发以下功能模块：

- [x] 项目初始化和基础配置
- [x] 用户认证模块 (auth)
- [ ] 用户管理模块 (users)
- [ ] 文章管理模块 (articles)
- [ ] 分类管理模块 (categories)
- [ ] 标签管理模块 (tags)
- [ ] 评论系统 (comments)
- [ ] 媒体管理 (media)
- [ ] 统计分析 (analytics)

## 📄 许可证

MIT

## 🆘 故障排除

### 连接数据库失败
- 检查 MySQL 服务是否运行
- 验证数据库凭证是否正确
- 如果数据库尚未创建，先执行 `npm run db:init`

### Redis 连接失败
- 检查 Redis 服务是否运行
- 验证 Redis 主机和端口配置
- 如果不需要 Redis，可在代码中注释相关模块

### 端口被占用
修改 `.env` 中的 PORT 值为其他未被占用的端口。
