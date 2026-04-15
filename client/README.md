# 个人博客系统前端

基于 `技术设计文档.md` 初始化的 Vue 3 + TypeScript + Tailwind CSS + Vite 前端项目。

## 技术栈

- Vue 3
- TypeScript
- Vue Router
- Pinia
- Axios
- Tailwind CSS
- Vite

## 目录结构

```text
client/
├── src/
│   ├── api/          # HTTP 客户端与统一响应类型适配
│   ├── components/   # 通用组件
│   ├── data/         # 后端接口完成前的演示数据
│   ├── layouts/      # 前台与后台布局
│   ├── router/       # 路由配置
│   ├── services/     # 业务数据访问层
│   ├── stores/       # Pinia 状态
│   ├── types/        # 博客领域类型
│   └── views/        # 页面
├── .env.example
├── tailwind.config.js
└── vite.config.ts
```

## 启动

```bash
npm install
npm run dev
```

默认开发地址为 `http://localhost:5173`，`/api` 会代理到后端 `http://localhost:3000`。

## 可用命令

```bash
npm run dev        # 开发服务器
npm run build      # 类型检查并构建生产包
npm run preview    # 预览构建产物
npm run typecheck  # 仅运行类型检查
npm run format     # 格式化 src 下的代码
```

## 后续接入点

- 将 `src/services/blog.ts` 中的演示数据替换为真实 API 请求。
- 认证模块完成后，把 `src/views/admin/LoginView.vue` 接入 JWT 登录接口。
- 文章详情页可继续接入 Markdown 渲染、目录、代码高亮和阅读进度。
