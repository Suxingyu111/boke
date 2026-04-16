# 前后端接口映射说明

本文档用于说明 client 前端页面、Pinia store 与 server/docs 中 API 文档之间的对应关系，便于联调、回归测试和后续扩展。

## 1. 通用约定

- 后端统一前缀：/api
- 成功响应：success、statusCode、message、data、timestamp
- 失败响应：success、statusCode、message、errors、timestamp
- 公共请求封装：client/src/api/http.ts
- 错误消息提取：client/src/api/auth.ts 中的 getApiErrorMessage
- Bearer Token 注入：client/src/api/http.ts 请求拦截器自动从 localStorage / sessionStorage 读取
- 401 处理：client/src/api/http.ts 响应拦截器自动清理本地登录态

## 2. 公开端接口映射

| 页面/能力 | 服务函数 | 方法 | 路径 | 参数 | 成功数据 | 失败处理 |
|---|---|---|---|---|---|---|
| 首页文章流 | getPublicArticles | GET | /articles | page、pageSize、categoryId、tagId、keyword、sortBy、order | data.items + data.meta | content store 写入 errorMessage，页面展示错误提示 |
| 文章详情 | getPublicArticle | GET | /articles/:slug | slug | 公开文章详情 | 详情页展示“文章暂不可用” |
| 分类列表 | getPublicCategories | GET | /categories | 无 | 分类数组 | 分类页展示错误提示 |
| 标签列表 | getPublicTags | GET | /tags | 无 | 标签数组 | 标签页展示错误提示 |
| 关于页 | getPublicAboutPage | GET | /pages/about | 无 | about 页面对象 | About 页展示错误提示 |
| 自定义页面 | getPublicPage | GET | /pages/:slug | slug | 页面对象 | PageDetail 页展示错误提示 |
| 友情链接 | getPublicFriendLinks | GET | /friend-links | 无 | 通过审核的友链数组 | Links 页展示错误提示 |
| 友链申请 | applyFriendLink | POST | /friend-links/applications | siteName、siteUrl、description、contactEmail、applicantName | 新建申请对象 | Links 页表单内展示错误提示 |
| 公开站点设置 | getPublicSettings | GET | /settings | 无 | 公开设置键值对 | site store 写入 settingsError |

## 3. 管理端接口映射

| 页面/能力 | 服务函数 | 方法 | 路径 | 参数 | 认证 | 失败处理 |
|---|---|---|---|---|---|---|
| 登录 | login | POST | /auth/login | account、password | 否 | 登录页表单错误提示 |
| 注册 | register | POST | /auth/register | username、email、password、nickname | 否 | 注册页表单错误提示 |
| 当前用户 | getCurrentUser | GET | /auth/me | 无 | Bearer Token | auth store 刷新失败后清理登录态 |
| 当前管理员 | getCurrentAdminUser | GET | /auth/admin/me | 无 | Bearer Token + admin | 路由守卫跳回登录或首页 |
| 仪表盘统计 | getDashboardStats | GET | /admin/dashboard/stats | 无 | Bearer Token | Dashboard 展示错误提示 |
| 最近文章 | getRecentArticles | GET | /admin/dashboard/recent-articles | limit | Bearer Token | Dashboard 展示错误提示 |
| 管理文章列表 | getAdminArticles | GET | /admin/articles | page、pageSize、status、categoryId、tagId、keyword、sortBy、order | Bearer Token | ArticleManage 页展示错误提示 |
| 管理文章详情 | getAdminArticle | GET | /admin/articles/:id | id | Bearer Token | ArticleManage 编辑前加载详情 |
| 创建文章 | createArticle | POST | /admin/articles | 文章表单 | Bearer Token | 表单内提示错误 |
| 更新文章 | updateArticle | PATCH | /admin/articles/:id | id + 文章表单 | Bearer Token | 表单内提示错误 |
| 软删除文章 | archiveArticle | DELETE | /admin/articles/:id | id | Bearer Token | 表单内提示错误 |
| 永久删除文章 | deleteArticlePermanently | DELETE | /admin/articles/:id/permanent | id | Bearer Token | 表单内提示错误 |
| 管理分类列表/详情/新增/更新/删除 | getAdminCategories / getAdminCategory / createCategory / updateCategory / deleteCategory | GET / GET / POST / PATCH / DELETE | /admin/categories... | 分类表单 | Bearer Token | 分类面板提示错误 |
| 管理标签列表/详情/新增/更新/删除 | getAdminTags / getAdminTag / createTag / updateTag / deleteTag | GET / GET / POST / PATCH / DELETE | /admin/tags... | 标签表单 | Bearer Token | 标签面板提示错误 |
| 管理页面列表/详情/新增/更新/删除 | getAdminPages / getAdminPage / createPage / updatePage / deletePage | GET / GET / POST / PATCH / DELETE | /admin/pages... | 页面表单 | Bearer Token | PageManage 页提示错误 |
| 管理友链列表/详情/新增/更新/删除 | getAdminFriendLinks / getAdminFriendLink / createFriendLink / updateFriendLink / deleteFriendLink | GET / GET / POST / PATCH / DELETE | /admin/friend-links... | 友链表单 | Bearer Token | PageManage 页提示错误 |
| 读取后台设置 | getAdminSettings | GET | /admin/settings | 无 | Bearer Token | Settings 页提示错误 |
| 保存后台设置 | saveSiteSettings | PUT | /admin/settings/batch | settings 数组 | Bearer Token | Settings 页提示错误，不再伪装成本地保存成功 |

## 4. 页面到 Store 的调用链

### 前台页面

- 首页 HomeView -> contentStore.loadPublicContent -> /articles + /categories + /tags
- 分类页 CategoriesView -> contentStore.loadPublicContent({ categoryId })
- 标签页 TagsView -> contentStore.loadPublicContent({ tagId })
- 搜索页 SearchView -> contentStore.loadPublicContent({ keyword })
- 文章详情页 ArticleDetailView -> contentStore.loadPublicArticleDetail(slug)
- 关于页 AboutView -> pagesStore.loadAboutPage
- 友情链接页 LinksView -> pagesStore.loadPublicFriendLinks、pagesStore.applyFriendLink
- 自定义页面 PageDetailView -> pagesStore.loadPublicPage(slug)
- 页头/页脚 AppHeader、AppFooter -> siteStore.loadPublicSettings 的结果

### 后台页面

- 登录页 LoginView -> authStore.login
- 注册页 RegisterView -> authStore.register
- 仪表盘 DashboardView -> siteStore.loadDashboardStats、siteStore.loadRecentArticles、contentStore.loadAdminContent
- 文章管理 ArticleManageView -> contentStore.loadAdminContent、loadAdminArticleDetail、create/update/delete 系列接口
- 页面管理 PageManageView -> pagesStore.loadAdminPages、loadAdminPageDetail、loadAdminFriendLinkDetail、save/delete 系列接口
- 系统设置 SettingsView -> siteStore.loadAdminSettings、siteStore.saveSettings

## 5. 关键交互与请求组装

- 搜索：keyword 通过路由 query.q 同步到 /articles?keyword=...
- 分类筛选：分类 slug 先映射为 categoryId，再请求 /articles?categoryId=...
- 标签筛选：标签 slug 先映射为 tagId，再请求 /articles?tagId=...
- 文章定时发布：status=scheduled 时附带 scheduledAt ISO 时间字符串
- 设置保存：通用设置映射为 site_title、site_subtitle、site_description、site_icp、site_copyright；社交链接保留为 social_links JSON 字符串，同时读取端兼容对象映射 socialLinks

## 6. 当前前端错误处理策略

- 请求级错误统一由 getApiErrorMessage 转换成人类可读文案
- 公开页面失败时展示错误提示或空态，不再用 mock 数据静默覆盖真实失败
- 管理页面失败时保留当前表单输入，并在当前页面提示错误
- 设置保存失败时仅提示失败，不再伪装成已保存到本地
- 401 发生时自动清理 token 和用户信息，路由守卫重新鉴权

## 7. 当前端到端验证范围

- 前台：首页、搜索、文章详情、关于页、友情链接、自定义页面
- 后台：登录、仪表盘、文章管理、页面管理、系统设置
- 协议：Bearer Token、公开设置、内容查询、友链申请、管理端 CRUD