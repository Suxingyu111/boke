# 接口安全与缓存防护设计

## 目标

本设计面向博客系统后端全部接口，目标是同时覆盖以下风险：

1. 恶意高频访问、撞库、接口滥用
2. 公开读接口被重复打穿数据库或 Elasticsearch
3. 缓存穿透、缓存击穿、缓存雪崩
4. 鉴权接口、管理接口、个性化接口被中间层或浏览器错误缓存
5. 上传与备份文件带来的内容伪装、路径穿越、头部污染风险

## 接口分级

### 1. 可缓存公开读接口

仅缓存“无用户态、无副作用、结果可重复”的 GET 接口：

- `/articles`
- `/categories`
- `/tags`
- `/pages/about`
- `/pages/:slug`
- `/friend-links`
- `/announcements`
- `/announcements/pinned`
- `/settings`
- `/archives`
- `/archives/articles`
- `/search`
- `/feed/rss`
- `/feed/atom`
- `/seo/site`
- `/seo/articles/:slug`
- `/seo/pages/:slug`
- `/seo/sitemap`
- `/articles/:articleId/comments`
- `/guestbook`

### 2. 禁缓存接口

以下接口统一 `Cache-Control: no-store`：

- 全部写接口（POST / PUT / PATCH / DELETE）
- 全部 `/api/auth/**`
- 全部 `/api/admin/**`
- 全部带鉴权头或已解析用户态的请求
- `/api/health`
- `/api/articles/:id/like`

## 缓存策略

### 1. Cache-Aside

公开读接口统一使用缓存装饰器 + 全局缓存拦截器，通过 Redis 执行 Cache-Aside。

### 2. 防缓存穿透

- 对允许“资源不存在”的接口开启 `cacheNotFound`
- 404 结果使用短 TTL 写入 Redis
- 同一不存在资源的重复请求不会持续打到数据库

适用场景：

- 页面详情
- SEO 详情
- 置顶公告

### 3. 防缓存击穿

- 单 key 回源前先抢 Redis 互斥锁
- 未抢到锁的请求短暂等待已有请求写入缓存
- 热点 key 过期时只允许极少数请求回源

### 4. 防缓存雪崩

- TTL 增加随机抖动
- 不同 key 不会同时批量过期
- 公共配置由服务层统一管理，避免业务代码各自写死 TTL

### 5. 缓存失效

后台写操作完成后主动失效相关前缀：

| 写操作 | 失效前缀 |
| --- | --- |
| 文章 create / update / delete / like / unlike | `articles:list` `categories:public` `tags:public` `archives:*` `seo:article` `seo:sitemap` `feed:*` `search:public` `comments:public` |
| 分类 create / update / delete | `categories:public` `articles:list` `archives:*` `seo:sitemap` |
| 标签 create / update / delete | `tags:public` `articles:list` |
| 页面 / 友链 create / update / delete | `pages:*` `friend-links:public` `seo:page` `seo:sitemap` |
| 站点设置 upsert / batch / remove | `settings:public` `seo:site` `feed:*` |
| 公告 create / update / delete | `announcements:*` |
| 评论审核 / 回复 / 删除 | `comments:public` 以及文章公开读缓存前缀 |
| 留言审核 / 回复 / 删除 | `guestbook:public` |

## 其他安全设计

### 1. 请求入口

- Helmet 安全头
- 禁用 `x-powered-by`
- 按环境启用 HSTS
- 可配置 `trust proxy`
- 请求体大小限制 1MB

### 2. 输入与输出

- 全局 ValidationPipe：白名单、拒绝额外字段、自动类型转换
- 全局 SanitizePipe：对 body 字符串做 HTML 转义
- 敏感接口统一禁缓存，避免浏览器或代理复用用户态数据

### 3. 速率限制

- 全局节流仍保留
- 对搜索、归档等较重读接口追加更严格限流
- 认证、评论、留言等高风险入口继续保留独立节流

### 4. 文件安全

- 上传文件校验扩展名与 MIME
- 进一步校验文件魔数，防止伪装上传
- 备份下载 / 恢复 / 删除统一校验文件名与扩展名，阻断路径穿越

## 测试策略

- 单元测试：缓存服务、空值缓存、前缀失效
- 集成测试：公开缓存头、敏感接口 no-store
- 业务测试：设置接口、媒体上传签名校验
- 全量回归：项目既有 Jest 测试套件、构建、Lint
