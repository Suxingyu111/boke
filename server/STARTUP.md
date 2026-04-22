# 📚 博客系统后端 - 快速启动指南

## ⚡ 快速开始（5分钟）

### 方案A：本地开发（推荐用于开发）

#### 前置要求：
- Node.js 18+
- MySQL 8.0+
- Redis 7.0+

#### 步骤：

1. **进入项目目录**
   ```bash
   cd server
   ```

2. **复制环境配置**
   ```bash
   cp .env.example .env
   ```

3. **编辑 .env 文件**（根据你的本地环境调整）
   ```env
   DB_HOST=localhost
   DB_USERNAME=blog_user
   DB_PASSWORD=blog_password
   DB_DATABASE=blog_system
   REDIS_HOST=localhost
   JWT_SECRET=your_secret_key_change_later
   ```

4. **创建数据库**
   ```bash
   mysql -u root -p
   ```
   ```sql
   CREATE DATABASE blog_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'blog_user'@'localhost' IDENTIFIED BY 'blog_password';
   GRANT ALL PRIVILEGES ON blog_system.* TO 'blog_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. **安装依赖**
   ```bash
   npm install

   # 需要完全复现 lockfile 的环境（CI / Docker）请改用：
   npm ci

   # 供应链校验与 SBOM
   npm run supply-chain:verify
   npm run sbom:generate
   ```

6. **启动应用**
   ```bash
   npm run start:dev
   ```

7. **验证启动**
   ```
   ✅ Blog System is running on http://localhost:3000
   ```

8. **测试 API**
   ```bash
   curl http://localhost:3000/api
   ```

---

### 方案B：Docker 容器化（推荐用于生产）

#### 前置要求：
- Docker
- Docker Compose

#### 步骤：

1. **使用 Docker Compose 启动所有服务**
   ```bash
   docker-compose up -d
   ```

   这会自动启动：
   - MySQL 数据库
   - Redis 缓存
   - NestJS API 服务器

2. **查看日志**
   ```bash
   docker-compose logs -f blog-api
   ```

3. **停止服务**
   ```bash
   docker-compose down
   ```

4. **完全清理（包括数据）**
   ```bash
   docker-compose down -v
   ```

---

## 🔧 常见命令

### 开发命令
```bash
# 启动开发服务器（热重载）
npm run start:dev

# 启动调试模式
npm run start:debug

# 运行单元测试
npm test

# 查看测试覆盖率
npm run test:cov

# 代码格式化
npm run format

# 代码检查
npm run lint
```

### 生产命令
```bash
# 构建项目
npm run build

# 启动生产服务器
npm run start:prod
```

### 数据库命令
```bash
# 自动生成迁移文件
npm run migration:generate -- -n MigrationName

# 执行所有待执行的迁移
npm run migration:run

# 回滚上一次迁移
npm run migration:revert

# 执行恢复演练（默认取最新备份，也可用 --filename 指定）
npm run backup:drill
npm run backup:drill -- --filename backup_blog_system_2026-04-20.sql
```

---

## 📋 项目初始化了什么？

✅ **项目结构**
- 模块化的 NestJS 架构
- 规范的目录布局
- TypeScript 完整配置

✅ **配置管理**
- 环境变量管理（.env）
- 环境验证（Joi schema）
- 多环境支持

✅ **数据库**
- MySQL 连接配置（TypeORM）
- 4 个核心实体：User, Article, Category, Tag
- 带索引和约束的数据库结构
- 数据库迁移支持

✅ **缓存服务**
- Redis 连接配置
- Redis 模块集成

✅ **API 基础设施**
- 全局异常过滤器
- 统一响应格式
- 数据验证管道
- CORS 支持
- 速率限制

✅ **工具链**
- ESLint 代码检查
- Prettier 代码格式化
- Jest 单元测试框架
- TypeORM CLI 工具

---

## 🏗️ 下一步开发

建议按以下顺序开发功能模块：

1. **认证模块** (auth)
   - 用户登录/注册
   - JWT token 提取
   - 权限控制

2. **用户模块** (users)
   - 用户信息管理
   - 个人资料编辑

3. **文章模块** (articles)
   - 文章增删改查
   - 文章发布流程
   - 搜索和过滤

4. **分类与标签** (categories, tags)
   - 分类管理
   - 标签管理
   - 关系映射

5. **其他功能** (comments, media, analytics)
   - 评论系统
   - 媒体管理
   - 数据统计

---

## 🐛 故障排除

### 问题：`Error: connect ECONNREFUSED 127.0.0.1:3306`
**原因**：MySQL 服务未启动或连接信息错误
**解决**：
```bash
# 检查 MySQL 是否运行
mysql -u root -p

# 或重启 MySQL
brew services restart mysql-community  # macOS
sudo systemctl restart mysql            # Linux
```

### 问题：`Error: connect ECONNREFUSED 127.0.0.1:6379`
**原因**：Redis 服务未启动
**解决**：
```bash
# 启动 Redis
redis-server

# 或使用 Docker
docker run -d -p 6379:6379 redis:alpine
```

### 问题：`Port 3000 already in use`
**原因**：端口被占用
**解决**：修改 `.env` 文件中的 PORT 值，或杀死占用进程

### 问题：`Error: Failed to connect to MySQL`
**原因**：数据库凭证错误
**解决**：检查 `.env` 文件中的数据库配置是否与实际凭证匹配

---

## 🚨 灾备恢复演练 Runbook

### 建议基线
- 每月至少执行一次恢复演练。
- 使用独立演练库 `BACKUP_DRILL_DATABASE`，默认值为 `blog_system_drill`。
- 目标指标：`BACKUP_DRILL_RTO_SECONDS` 控制恢复时间目标，`BACKUP_DRILL_RPO_SECONDS` 控制允许的数据回退窗口。

### 推荐流程
1. 先确认最新备份已生成：`GET /api/admin/backup` 或在后台技术页面查看备份列表。
2. 执行恢复演练：`npm run backup:drill -- --filename <backup.sql>`，或调用 `POST /api/admin/backup/:filename/drill`。
3. 查看演练历史与指标摘要：`GET /api/admin/backup/drills`。
4. 若演练失败，优先检查 MySQL 客户端工具、目标演练库权限、备份文件完整性，以及 `backups/drill-reports.json` 中的失败原因。

### 应急处置建议
1. 先冻结高风险后台写操作，避免继续扩大 RPO。
2. 选择最近一次完整备份，必要时先在演练库验证可恢复性，再切换到正式恢复。
3. 记录本次事故的实际 RTO / RPO，与阈值比较后回填到演练报告或事故复盘。
4. 若 `BACKUP_DRILL_CLEANUP=false`，演练完成后需手动清理演练库，避免长期残留旧数据。

---

## 📞 支持

如有问题，请检查：
1. `.env` 配置是否正确
2. MySQL/Redis 是否正在运行
3. 日志中的错误信息

---

## 📄 文件说明

```
server/
├── .env                   # 环境变量（本地配置，不提交）
├── .env.example           # 环境变量模板（分享给团队）
├── package.json           # 项目依赖定义
├── tsconfig.json          # TypeScript 编译配置
├── nest-cli.json          # Nest CLI 配置
├── docker-compose.yml     # Docker 编排配置
├── Dockerfile             # Docker 镜像定义
├── README.md              # 项目文档
├── STARTUP.md             # 启动指南（此文件）
└── src/                   # 源代码目录
```

祝你开发顺利！🚀
