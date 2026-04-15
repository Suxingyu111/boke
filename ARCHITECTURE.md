# 📈 技术栈和架构方案

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器                              │
│               (Vue3/React + Tailwind CSS)                    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Nginx 反向代理                             │
│           (负载均衡、静态文件、缓存)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                NestJS API 服务器                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controllers          │ Services       │ Providers   │  │
│  │  ├─ Users            │ ├─ Auth        │ (Guards)    │  │
│  │  ├─ Articles         │ ├─ Articles    │             │  │
│  │  ├─ Categories       │ ├─ Categories  │             │  │
│  │  ├─ Tags             │ └─ Tags        │             │  │
│  │  └─ Admin            │                │             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────┬─────────────────────────────────┬──────────────┘
             │                                 │
             ▼                                 ▼
    ┌──────────────────┐              ┌──────────────────┐
    │   MySQL 数据库    │              │   Redis 缓存     │
    │  (blog_system)   │              │  (会话+缓存)     │
    │                  │              │                  │
    │ • User          │              │ • 会话存储      │
    │ • Articles      │              │ • 数据缓存      │
    │ • Categories    │              │ • 队列任务      │
    │ • Tags          │              │                  │
    │ • Comments      │              │                  │
    └──────────────────┘              └──────────────────┘
```

## 📦 项目结构

```
boke/
├── server/                          ✅ 已完成
│   ├── src/
│   │   ├── app.module.ts           # 应用模块
│   │   ├── main.ts                 # 应用入口
│   │   │
│   │   ├── config/
│   │   │   ├── configuration.ts    # 配置对象
│   │   │   ├── validation.ts       # Joi 验证schema
│   │   │   └── joi.ts              # Joi 拓展
│   │   │
│   │   ├── common/
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts
│   │   │   ├── interceptors/
│   │   │   │   └── response.interceptor.ts
│   │   │   ├── redis/
│   │   │   │   └── redis.module.ts
│   │   │   └── pipes/
│   │   │
│   │   ├── database/
│   │   │   ├── database.module.ts  # TypeORM 配置
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   ├── article.entity.ts
│   │   │   │   ├── category.entity.ts
│   │   │   │   ├── tag.entity.ts
│   │   │   │   └── index.ts
│   │   │   └── migrations/
│   │   │
│   │   └── modules/                # 待开发
│   │       ├── auth/
│   │       ├── users/
│   │       ├── articles/
│   │       ├── categories/
│   │       └── tags/
│   │
│   ├── package.json                ✅
│   ├── tsconfig.json              ✅
│   ├── nest-cli.json              ✅
│   ├── .env.example               ✅
│   ├── .env                       ⚠️ 本地配置
│   ├── Dockerfile                 ✅
│   ├── docker-compose.yml         ✅
│   ├── README.md                  ✅
│   ├── STARTUP.md                 ✅
│   ├── PROJECT_SUMMARY.md         ✅
│   ├── .eslintrc.js              ✅
│   ├── .prettierrc                ✅
│   ├── jest.config.js             ✅
│   └── .gitignore                 ✅
│
└── client/                         ⏳ 待开发
    └── (Vue3 + Vite 前端项目)
```

## 🔌 关键配置

### 数据库配置 (TypeORM)
```typescript
// src/database/database.module.ts
TypeOrmModule.forRootAsync({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['src/database/entities/*.entity.ts'],
  charset: 'utf8mb4',
  synchronize: false,
  logging: false,
})
```

### Redis 配置
```typescript
// src/common/redis/redis.module.ts
createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB,
})
```

## 📊 数据库设计

### User 表
```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  avatar TEXT,
  bio TEXT,
  role ENUM('admin', 'user') DEFAULT 'user',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
);
```

### Article 表
```sql
CREATE TABLE articles (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  excerpt TEXT,
  content LONGTEXT NOT NULL,
  coverImage VARCHAR(100),
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  viewCount INT DEFAULT 0,
  likes INT DEFAULT 0,
  userId VARCHAR(36) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  publishedAt DATETIME,
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_slug (slug),
  INDEX idx_user_id (userId),
  INDEX idx_status (status),
  INDEX idx_created_at (createdAt)
);
```

### Category 表
```sql
CREATE TABLE categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  articleCount INT DEFAULT 0,
  color VARCHAR(10) DEFAULT '000000',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug)
);
```

### Tag 表
```sql
CREATE TABLE tags (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  articleCount INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug)
);
```

## 🔐 API 响应格式

### 成功响应
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2026-04-14T08:30:00.000Z"
}
```

### 错误响应
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error message",
  "errors": { ... },
  "timestamp": "2026-04-14T08:30:00.000Z"
}
```

## 🚀 启动命令

```bash
# 开发
npm run start:dev

# 调试
npm run start:debug

# 生产
npm run build
npm run start:prod

# 测试
npm test
npm run test:cov

# 代码质量
npm run lint
npm run format
```

## 🎯 项目进度

```
已完成: ████████████████████░░░░░░░░░░░░░░░░░ 50%

[✅] 项目初始化和依赖配置      ▓▓▓▓▓▓▓▓▓▓
[✅] 目录结构和配置文件         ▓▓▓▓▓▓▓▓▓▓
[✅] 数据库连接和实体定义       ▓▓▓▓▓▓▓▓▓▓
[✅] Redis 缓存配置            ▓▓▓▓▓▓▓▓▓▓
[✅] 全局异常处理和拦截器      ▓▓▓▓▓▓▓▓▓▓
[⏳] 认证模块开发               
[⏳] 用户模块开发               
[⏳] 文章模块开发               
[⏳] 分类/标签模块开发          
[⏳] 前端项目创建               
```

## 📋 待开发模块

### 优先级 1（核心功能）
- [ ] 认证模块 (auth) - JWT + Passport
- [ ] 用户模块 (users) - 用户管理
- [ ] 文章模块 (articles) - CRUD + 搜索

### 优先级 2（重要功能）
- [ ] 分类模块 (categories)
- [ ] 标签模块 (tags)
- [ ] 评论模块 (comments)
- [ ] 统计模块 (analytics)

### 优先级 3（增强功能）
- [ ] 媒体管理 (media)
- [ ] 缓存优化 (caching)
- [ ] 队列任务 (queues)
- [ ] 日志系统 (logging)

---

**创建时间**: 2026-04-14  
**状态**: ✅ 完成初始化  
**下一步**: 开发认证模块
