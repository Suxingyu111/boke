# 开源安全与治理实现状态

## 当前完成范围

本轮已根据 `docs/plans/open-source-security-readiness-design.md` 落地开源前安全与治理基础能力：

- 清理 README 中的个人本机绝对路径，改为相对文档链接。
- 修复 API 文档和测试中触发 Gitleaks 的示例 token、Authorization 和测试密码占位符。
- 加固 `.env.docker.dev.example`，移除可直接照抄的固定开发密码。
- 升级前后端依赖，使完整 `npm audit` 当前无漏洞。
- 固定前后端 Dockerfile、根 Compose 和后端 Compose 中的远程镜像 digest。
- 扩展供应链校验逻辑，忽略本地构建产物镜像，同时校验 Compose build args 中的远程基础镜像。
- 新增开源治理文件：`LICENSE`、`SECURITY.md`、`CONTRIBUTING.md`、`CHANGELOG.md`。
- 新增 Gitleaks、pre-commit、GitHub Actions、Dependabot、Issue 模板和 PR 模板。
- 新增统一开源前检查脚本：`scripts/open-source-check.sh`，根目录 `package.json` 提供 `npm run open-source:check`。
- 新增 `.gitleaksignore`，仅忽略历史中已确认为文档/测试示例的 3 个假阳性 fingerprint。
- 移除本地 agent 技能上下文：`.agents/`、`CLAUDE.md`、`skills-lock.json`。

## 涉及文件

- 根目录文档与治理：`README.md`、`LICENSE`、`SECURITY.md`、`CONTRIBUTING.md`、`CHANGELOG.md`
- 开源检查配置：`.gitleaks.toml`、`.pre-commit-config.yaml`、`.github/`
- 历史 secrets 假阳性忽略：`.gitleaksignore`
- 统一检查入口：`package.json`、`scripts/open-source-check.sh`
- Docker 与供应链：`server/Dockerfile`、`client/Dockerfile`、`docker-compose.yml`、`server/docker-compose.yml`
- 供应链校验代码：`server/src/config/supply-chain-policy.ts`
- 供应链测试：`server/test/supply-chain-policy.spec.ts`
- 环境变量模板：`.env.docker.dev.example`
- 状态文档：`docs/status/open-source-readiness-status.md`

## 重要约束

- 真实 `.env` 文件仍不得提交，当前 `.gitignore` 保持忽略真实环境文件。
- 示例环境文件只保留占位符，生产部署必须自行生成强随机密钥和密码。
- 本地构建镜像如 `blog-server:local`、`blog-web:local`、`blog-elasticsearch-ik:*` 不作为远程拉取镜像进行 digest 校验；其基础镜像和 build args 仍需要固定 digest。
- GitHub 仓库侧的 secret scanning、push protection、Dependabot alerts、branch protection 需要在远程仓库设置中手动开启。

## 已执行验证

- `npm test -- supply-chain-policy.spec.ts --runInBand`
- `cd server && npm run supply-chain:verify`
- `cd server && npm audit --json`
- `cd client && npm audit --json`

最终完整验证已通过：

- `npm run open-source:check`

该命令覆盖：

- Git 工作区状态输出。
- 个人路径扫描。
- Gitleaks 全历史扫描。
- 后端 `npm ci`、`npm test -- --runInBand`、`npm run build`、`npm audit`、`npm run supply-chain:verify`。
- 前端 `npm ci`、`npm run typecheck`、`npm test`、`npm run build`、`npm audit`。

## 已知限制与下一步

- 本地 npm 全局缓存存在权限问题，统一检查脚本已默认使用 `/tmp/boke-npm-cache` 规避；长期建议修复 `~/.npm` 权限。
- 后端集成测试在 Jest 多 worker 下存在偶发超时风险，统一检查脚本和 CI 均使用 `npm test -- --runInBand` 保持验证结果稳定。
- GitHub Actions 只能在推送到 GitHub 后由远程环境实际验证。
- OpenSSF Scorecard 分数需要仓库公开并启用 GitHub 安全功能后才能完整体现。
