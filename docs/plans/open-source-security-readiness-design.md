# 博客系统开源安全与治理完善设计方案

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 博客系统开源安全与治理完善设计方案 |
| 文档版本 | v1.0 |
| 编写日期 | 2026-05-24 |
| 适用范围 | `boke` 博客系统全仓库开源前安全审查、供应链治理、开源协作规范和持续安全门禁 |
| 当前状态 | 设计方案 |
| 目标读者 | 项目维护者、后续开发者、安全审查人员、开源协作者 |

## 2. 背景与目标

当前项目已经具备完整的前后端代码、Docker 编排、测试用例、接口文档和部署脚本，具备开源基础。但在正式公开仓库前，需要完成一次系统化的开源就绪治理，避免将个人路径、真实密钥、弱默认配置、供应链风险或不完整的开源治理流程暴露给公众。

本方案目标如下：

- 确保 Git 已跟踪文件和 Git 历史中不存在真实敏感信息。
- 确保示例配置、文档示例和测试样例不会被误认为真实凭据，也不会诱导用户直接使用弱密码部署。
- 建立自动化安全门禁，避免后续贡献重新引入密钥、漏洞依赖或不安全的镜像引用。
- 补齐开源项目必要的许可证、安全策略、贡献指南、变更日志和 CI 规范。
- 将开源前检查流程固化为可重复执行的工程流程，而不是一次性人工审查。

## 3. 当前审查结论摘要

### 3.1 已确认的安全基线

- 当前 Git 跟踪的环境文件仅包含 `.example` 模板：
  - `.env.docker.example`
  - `.env.docker.dev.example`
  - `server/.env.example`
  - `client/.env.example`
- 真实环境文件未被 Git 跟踪，并已被 `.gitignore` 或子项目 `.gitignore` 忽略：
  - `.env.docker`
  - `.env.docker.dev`
  - `.env.docker.prod.verify`
  - `server/.env`
  - `client/.env`
- 通用密钥模式未发现 AWS、GitHub、OpenAI、私钥、Slack token、完整 JWT 等高风险真实凭据。
- 项目已经存在部分安全能力：
  - 生产环境配置校验。
  - 响应安全头配置。
  - CORS 白名单配置。
  - 供应链策略校验脚本。
  - SBOM 生成脚本。
  - 后端接口和安全相关测试用例。

### 3.2 开源前阻断问题

| 编号 | 问题 | 位置 | 风险 | 优先级 |
| --- | --- | --- | --- | --- |
| R-001 | README 存在个人本机绝对路径 | `README.md` 文档链接区 | 暴露个人用户名和本地路径，降低开源专业度 | P0 |
| R-002 | Gitleaks 命中示例 JWT 占位符 | `server/docs/ADMIN_API.md` | 会导致 secrets 扫描失败，影响 CI 和贡献流程 | P0 |
| R-003 | Gitleaks 命中 curl Authorization 示例 | `server/docs/AUTH_API.md` | 会导致 secrets 扫描失败，影响 CI 和贡献流程 | P0 |
| R-004 | Gitleaks 命中测试数据库密码样例 | `server/test/validation.spec.ts` | 测试值不是真实密钥，但应改为明确测试占位符 | P0 |
| R-005 | 生产依赖存在漏洞 | `server/package-lock.json`、`client/package-lock.json` | 当前 `npm audit --omit=dev` 存在 critical/high 漏洞 | P0 |
| R-006 | Docker 镜像未固定 digest | `Dockerfile`、`docker-compose.yml` | 镜像标签可变，供应链校验失败 | P0 |
| R-007 | 开源治理文件缺失 | 仓库根目录、`.github/` | 不利于许可证、漏洞报告、贡献流程和自动化治理 | P1 |

## 4. 设计原则

### 4.1 默认不信任公开仓库内容

任何已提交内容都应假设会被永久复制和索引。因此，开源前不仅要检查当前工作树，还要检查 Git 历史、文档示例、测试数据、脚本输出和 Docker 配置。

### 4.2 示例配置必须不可直接用于生产

所有示例密码、JWT 密钥、Redis 密码、MySQL 密码、Elasticsearch 密码、超级管理员密码都必须使用明显占位符，并在文档中要求用户自行生成强随机值。

### 4.3 安全检查必须自动化

密钥扫描、依赖漏洞扫描、镜像 digest 校验、测试和构建必须进入 CI。人工审查只作为补充，不能作为唯一防线。

### 4.4 开源治理与代码质量同等重要

开源项目不仅要能运行，还要让外部贡献者知道如何报告漏洞、如何提交 PR、如何运行测试、项目采用何种许可证，以及维护者如何处理版本变更。

## 5. 目标状态

开源就绪后的仓库应满足以下状态：

- `git status` 清晰，无意外未跟踪敏感文件。
- `gitleaks detect --source=. --redact` 无未处理命中。
- `npm audit` 无已知依赖漏洞；如存在无法修复项，需在 `SECURITY.md` 或安全例外记录中说明影响面、缓解措施和跟踪计划。
- `server npm run supply-chain:verify` 通过。
- Docker 基础镜像和 Compose 镜像全部固定 digest。
- 仓库根目录包含 `LICENSE`、`SECURITY.md`、`CONTRIBUTING.md`、`CHANGELOG.md`。
- `.github/` 包含 CI workflow、Dependabot 配置和必要的 Issue/PR 模板。
- README 不包含个人绝对路径、真实账号、真实域名、真实邮箱或不可公开的部署信息。
- GitHub 仓库侧开启 secret scanning、push protection、Dependabot alerts、Dependabot security updates、branch protection。

## 6. 分阶段实施方案

### 6.1 P0：开源阻断项修复

#### 6.1.1 清理个人路径和本地信息

处理内容：

- 将 `README.md` 中 `/Users/suxingyu/boke/...` 形式的链接改为相对路径。
- 全仓库扫描 `/Users/`、`C:\Users`、真实个人邮箱、真实域名、真实公网 IP。
- 保留 `localhost`、`127.0.0.1`、`example.com` 等明确示例值。

验收标准：

```bash
git grep -n '/Users/' -- .
git grep -n 'C:\\Users' -- .
```

上述命令不应返回个人路径。

#### 6.1.2 修复 Gitleaks 命中

处理内容：

- 将文档中的 JWT 示例改为 `<access-token>`、`<jwt-token>` 或 `<redacted-jwt>`。
- 将 curl Authorization 示例改为 `Authorization: Bearer <access-token>`。
- 将测试中的数据库密码样例改为明显测试值，例如 `example-test-db-password`，并在必要时添加测试上下文说明。

验收标准：

```bash
gitleaks detect --source=. --redact --no-banner
```

命令不应返回未处理泄露项。

#### 6.1.3 加固示例环境文件

处理内容：

- 将 `.env.docker.dev.example` 中的固定开发密码替换为 `change_me_*` 占位符。
- 在 `.env.example` 和 README 中明确说明：
  - 示例密码不能用于公网环境。
  - 生产环境必须使用随机生成的强密码。
  - `JWT_SECRET` 至少 32 位，建议使用 `openssl rand -base64 48` 生成。
  - 超级管理员密码首次部署后应立即轮换。

验收标准：

```bash
git grep -n 'dev_.*password\\|root123456789\\|dev_jwt_secret' -- '*.example' 'README.md' 'server/docs' 'client/src' 'server/src'
```

除明确解释性文本外，不应存在可直接照抄的弱密码。

#### 6.1.4 修复生产依赖漏洞

当前审查结果：

- `server npm audit --omit=dev`：存在 critical/high 漏洞，重点关注 `sanitize-html`、`axios`、Nest 相关依赖链。
- `client npm audit --omit=dev`：存在 `axios` high 和 `postcss` moderate。

处理策略：

- 优先升级直接依赖：
  - `sanitize-html`
  - `axios`
  - `@elastic/elasticsearch`
  - NestJS 相关包
  - `postcss`
- 对需要大版本升级的 NestJS 依赖，单独建立兼容性验证任务，避免一次性升级破坏运行时行为。
- 对无法立即消除的 transitive 漏洞，记录安全例外，说明：
  - 漏洞来源。
  - 项目是否实际触达受影响代码路径。
  - 临时缓解措施。
  - 目标修复版本和负责人。

验收标准：

```bash
cd server && npm audit --omit=dev
cd client && npm audit --omit=dev
```

不应存在未记录、未缓解的依赖漏洞；开源前优先以完整 `npm audit` 清零为准。

#### 6.1.5 固定 Docker 镜像 digest

当前失败项：

- `node:20-alpine`
- `blog-elasticsearch-ik:8.13.4`
- `docker.elastic.co/kibana/kibana:8.13.4`

处理内容：

- 使用 digest 固定基础镜像和 Compose 镜像。
- 对本地构建镜像 `blog-elasticsearch-ik` 明确策略：
  - 若作为本地 build 产物，不应作为外部拉取镜像校验。
  - 若作为发布镜像，应推送到可信 registry 并固定 digest。
- 更新供应链校验脚本，区分 `build` 产物与远程 `image` 拉取项，避免误报。

验收标准：

```bash
cd server && npm run supply-chain:verify
```

命令应通过。

### 6.2 P1：自动化安全门禁

#### 6.2.1 新增 Gitleaks 配置

建议新增文件：

- `.gitleaks.toml`
- `.pre-commit-config.yaml` 或项目自定义 git hook 文档

设计要求：

- 默认扫描全仓库。
- CI 中使用 `--redact`，避免日志泄露命中内容。
- 仅允许对明确的测试数据使用 allowlist。
- 禁止为了通过扫描而大面积忽略 `*.md` 或 `test/**`。

#### 6.2.2 新增 GitHub Actions CI

建议新增 workflow：

- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`

CI 最小门禁：

- 安装依赖：`npm ci`
- 后端检查：lint、test、build、audit、supply-chain verify
- 前端检查：typecheck、test、build、audit
- secrets 扫描：Gitleaks
- 可选：CodeQL、OpenSSF Scorecard

权限要求：

- workflow 默认使用最小权限：

```yaml
permissions:
  contents: read
```

- 只有需要写入安全结果或发布制品的 job 才单独提升权限。

#### 6.2.3 新增 Dependabot

建议新增：

- `.github/dependabot.yml`

覆盖范围：

- `npm`：`/server`
- `npm`：`/client`
- `github-actions`：`/`

策略：

- security update 自动开 PR。
- minor/patch 依赖可按周批量更新。
- major 依赖升级必须人工评估兼容性。

#### 6.2.4 启用 GitHub 仓库安全能力

仓库设置建议：

- Secret scanning：开启。
- Push protection：开启。
- Dependabot alerts：开启。
- Dependabot security updates：开启。
- Branch protection：保护 `main`，要求 PR、CI 通过和至少一次 review。
- 禁止直接 force push 到主分支。

### 6.3 P2：开源治理文件

#### 6.3.1 LICENSE

当前 `server/package.json` 声明 `MIT`，建议仓库根目录新增 `LICENSE`，并确认项目所有第三方素材、图标、字体和代码片段与 MIT 开源兼容。

#### 6.3.2 SECURITY.md

建议包含：

- 漏洞报告邮箱或 GitHub private vulnerability reporting。
- 支持版本范围。
- 预期响应时间。
- 漏洞披露流程。
- 不接受公开 issue 披露真实漏洞细节的说明。

#### 6.3.3 CONTRIBUTING.md

建议包含：

- 开发环境要求。
- 后端启动方式。
- 前端启动方式。
- Docker Compose 启动方式。
- 测试命令。
- 提交 PR 前检查清单。
- 文档同步要求。
- 安全相关变更的额外要求。

#### 6.3.4 CHANGELOG.md

建议采用 Keep a Changelog 风格，记录：

- 新增功能。
- 修复内容。
- 安全修复。
- 破坏性变更。
- 迁移说明。

#### 6.3.5 Issue 与 PR 模板

建议新增：

- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/pull_request_template.md`

PR 模板应包含：

- 变更类型。
- 安全影响。
- 接口文档是否更新。
- 状态文档是否更新。
- 已执行验证命令。

### 6.4 P3：开源体验与长期治理

#### 6.4.1 README 开源化

README 应面向首次访问的开源用户，建议结构：

- 项目简介。
- 功能截图或架构图。
- 技术栈。
- 快速启动。
- 环境变量说明。
- Docker 部署。
- 测试和质量检查。
- 安全说明。
- 贡献方式。
- 许可证。

#### 6.4.2 agent 配置公开策略

当前仓库跟踪了：

- `.agents/skills/frontend-design/LICENSE.txt`
- `.agents/skills/frontend-design/SKILL.md`
- `AGENTS.md`
- `CLAUDE.md`
- `skills-lock.json`

建议策略：

- `.agents/` 默认不随开源仓库发布，除非该目录是项目功能的一部分。
- `AGENTS.md` 可保留为项目协作规范，但应删除个人化上下文、历史流水账和仅面向本地 agent 的内容。
- `CLAUDE.md` 建议不公开，或合并必要内容到 `CONTRIBUTING.md`。
- `skills-lock.json` 若仅用于本地 agent 技能锁定，建议移出 Git 跟踪。

#### 6.4.3 Registry 与锁文件策略

当前 `package-lock.json` 中存在大量 `registry.npmmirror.com` 源。开源后建议二选一：

- 方案 A：统一改回 `https://registry.npmjs.org/`，提升全球可复现性。
- 方案 B：保留 npm mirror，但在 README 中说明原因和切换方法。

推荐方案 A。

#### 6.4.4 默认账号和种子数据策略

处理要求：

- 生产环境不得使用固定默认管理员密码。
- 演示数据中的账号密码必须明确标识为本地演示用途。
- 初始化脚本应在生产环境拒绝弱密码和占位符。
- 文档应要求首次部署后轮换超级管理员密码。

#### 6.4.5 运行时安全增强

后续可逐步优化：

- 移除生产 CSP 中不必要的 `unsafe-inline`。
- 对 Swagger 文档增加生产环境访问控制或默认关闭。
- 对管理接口增加更细的审计日志和告警。
- 对备份文件、媒体上传目录、Elasticsearch 证书目录做明确权限约束。
- 增加容器非 root 用户、只读文件系统、资源限制和 healthcheck。

## 7. 自动化检查设计

### 7.1 本地开源前检查命令

建议维护一个统一脚本，例如：

```bash
npm run open-source:check
```

脚本内部执行：

```bash
git status --short --untracked-files=all
gitleaks detect --source=. --redact --no-banner
git grep -n '/Users/' -- .
git grep -n 'C:\\Users' -- .
cd server && npm ci && npm test && npm run build && npm audit --omit=dev && npm run supply-chain:verify
cd client && npm ci && npm run typecheck && npm test && npm run build && npm audit --omit=dev
```

### 7.2 CI 门禁矩阵

| 门禁 | 触发时机 | 失败处理 |
| --- | --- | --- |
| Secrets 扫描 | PR、push 到主分支 | 阻断合并 |
| 后端测试 | PR、push 到主分支 | 阻断合并 |
| 前端测试 | PR、push 到主分支 | 阻断合并 |
| 构建检查 | PR、push 到主分支 | 阻断合并 |
| 生产依赖 audit | PR、定时任务 | critical/high 阻断合并 |
| 供应链策略 | PR、push 到主分支 | 阻断合并 |
| Dependabot | 定时 | 自动开 PR |
| Scorecard | 定时 | 生成报告，逐步提高分数 |

## 8. 验收标准

开源前必须全部满足：

- [ ] 无个人绝对路径。
- [ ] 无真实 `.env`、私钥、token、证书文件被 Git 跟踪。
- [ ] Gitleaks 扫描通过。
- [ ] 后端生产依赖无 critical/high 漏洞，或存在正式安全例外说明。
- [ ] 前端生产依赖无 critical/high 漏洞，或存在正式安全例外说明。
- [ ] Docker 镜像 digest 固定策略落地，供应链校验通过。
- [ ] `LICENSE` 已补齐。
- [ ] `SECURITY.md` 已补齐。
- [ ] `CONTRIBUTING.md` 已补齐。
- [ ] `CHANGELOG.md` 已补齐。
- [ ] GitHub Actions CI 已补齐。
- [ ] Dependabot 已补齐。
- [ ] README 已移除个人化内容，并包含开源用户启动指引。
- [ ] 仓库设置开启 secret scanning、push protection、Dependabot alerts、branch protection。

## 9. 风险与缓解措施

| 风险 | 影响 | 缓解措施 |
| --- | --- | --- |
| Git 历史曾经出现真实密钥 | 即使当前删除，历史仍可被检索 | 使用 Gitleaks 扫描全历史；如确认真实泄露，立即轮换密钥，并考虑历史清理 |
| 依赖大版本升级导致兼容性破坏 | 后端认证、Swagger、TypeORM 集成可能受影响 | 分批升级，补充回归测试，优先修复直接高危依赖 |
| Docker digest 固定后维护成本增加 | 镜像升级需要显式更新 digest | 结合 Dependabot 或 Renovate 定期更新镜像 |
| CI 误报导致贡献体验下降 | 外部 PR 难以通过 | 使用精确 allowlist，不做大范围忽略，文档说明修复方式 |
| 公开默认开发密码被误用于生产 | 部署实例被入侵 | 示例文件使用占位符，生产启动强校验，README 强提示 |

## 10. 推荐实施顺序

1. 修复 README 个人路径和 Gitleaks 命中。
2. 调整示例环境文件中的弱默认值。
3. 修复生产依赖漏洞。
4. 固定 Docker 镜像 digest 并修正供应链校验策略。
5. 新增开源治理文件。
6. 新增 CI、Dependabot、Gitleaks 配置。
7. 整理 README 和 agent 配置公开策略。
8. 执行完整开源前验收命令。
9. 配置 GitHub 仓库侧安全能力。
10. 正式公开仓库。

## 11. 参考资料

- GitHub Docs：Secret scanning
  - https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning
- GitHub Docs：Dependabot alerts
  - https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts
- Gitleaks 官方文档
  - https://github.com/gitleaks/gitleaks
- OpenSSF Scorecard
  - https://github.com/ossf/scorecard
- OpenSSF Best Practices Badge
  - https://www.bestpractices.dev/
- OWASP Top 10
  - https://owasp.org/www-project-top-ten/
