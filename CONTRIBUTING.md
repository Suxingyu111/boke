# 贡献指南

感谢你愿意参与这个博客系统。提交代码前，请先确保变更范围清晰、测试可复现、文档同步更新。

## 开发环境

- Node.js 20+
- npm 10+
- Docker 和 Docker Compose
- MySQL 8、Redis 7、Elasticsearch 8（可通过 Docker Compose 启动）

## 本地启动

后端：

```bash
cd server
npm ci
cp .env.example .env
npm run db:init
npm run start:dev
```

前端：

```bash
cd client
npm ci
cp .env.example .env
npm run dev
```

Docker Compose：

```bash
cp .env.docker.dev.example .env.docker.dev
docker compose --env-file .env.docker.dev -f docker-compose.yml up -d --build
```

示例环境文件中的密码和密钥均为占位符。公网或生产环境必须自行生成强随机值。

## 提交前检查

推荐在仓库根目录执行：

```bash
npm run open-source:check
```

至少应根据变更范围执行：

```bash
cd server && npm test && npm run build && npm audit --omit=dev
cd client && npm test && npm run typecheck && npm run build && npm audit --omit=dev
```

## 文档要求

- 后端接口、字段、权限或错误响应变化后，必须同步更新 `server/docs/` 中对应接口文档。
- 完成可独立描述的功能后，必须更新 `docs/status/` 中的状态文档。
- 安全、部署、供应链、CI 或开源治理变化，应同步更新 README、`SECURITY.md` 或 `docs/plans/`。

## Pull Request 要求

PR 描述应包含：

- 变更目的。
- 主要改动点。
- 用户可见影响。
- 安全影响。
- 已执行的验证命令。
- 文档是否已同步。

涉及认证、权限、数据库迁移、Docker、CI、依赖升级的 PR 需要更谨慎的回归测试。
