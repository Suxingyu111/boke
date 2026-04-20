# 前端展示接口文档

本文档面向博客前台页面联调，覆盖需求文档中“前端展示”相关的公开接口能力：响应式页面所需基础数据、导航栏、页脚信息，以及按文章标题和正文搜索。

## 基础信息

- 接口前缀：/api
- 内容类型：application/json
- 认证要求：本文档中的接口均无需登录
- 统一成功响应：success、statusCode、message、data、timestamp
- 统一失败响应：success、statusCode、message、errors、timestamp

## 统一响应格式

### 成功响应

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

### 失败响应

```json
{
  "success": false,
  "statusCode": 404,
  "message": "页面不存在",
  "errors": null,
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

## 公共缓存与安全响应头

下列公开 GET 接口已接入服务端响应缓存，并在重复访问时返回缓存命中标识：

- `/api/settings`
- `/api/categories`
- `/api/tags`
- `/api/pages/about`
- `/api/pages/:slug`
- `/api/friend-links`
- `/api/articles`
- `/api/articles/:articleId/comments`
- `/api/announcements`
- `/api/announcements/pinned`
- `/api/archives`
- `/api/archives/articles`
- `/api/search`
- `/api/feed/rss`
- `/api/feed/atom`
- `/api/seo/site`
- `/api/seo/articles/:slug`
- `/api/seo/pages/:slug`
- `/api/seo/sitemap`
- `/api/guestbook`

### 缓存响应头说明

- `X-Cache: MISS`：本次请求回源后写入缓存
- `X-Cache: HIT`：本次请求直接命中缓存
- `Cache-Control: public, max-age=...`：可被浏览器与网关短时复用

### 不参与缓存的接口

以下接口统一返回 `Cache-Control: no-store`：

- 全部带 `Authorization` 头的请求
- 全部 `/api/auth/**`
- 全部 `/api/admin/**`
- `/api/health`
- `/api/articles/:id/like`
- 所有写接口（POST / PUT / PATCH / DELETE）

## 一、页脚与站点基础信息

### 1.1 获取公开站点设置

- 方法：GET
- 路径：/api/settings
- 用途：前台页头、页脚、SEO 基础文案、社交链接

#### 返回说明

- 返回所有 isPublic = true 的设置项
- 保留原始键值对，便于兼容已有前端逻辑
- 当存在 social_ 前缀或 groupName = social 的公开设置项时，会额外聚合出 socialLinks 字段

#### 响应示例

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "site_title": "山海博客",
    "site_subtitle": "记录技术与生活",
    "site_description": "一个关注后端与工程实践的个人博客",
    "site_copyright": "© 2026 山海博客",
    "site_icp": "京ICP备2026000001号",
    "social_github": "https://github.com/example",
    "social_x": "https://x.com/example",
    "socialLinks": {
      "github": "https://github.com/example",
      "x": "https://x.com/example"
    }
  },
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

#### 推荐设置键

- site_title：站点标题
- site_subtitle：站点副标题
- site_description：站点描述
- site_copyright：版权信息
- site_icp：备案号
- social_github：GitHub 链接
- social_x：X / Twitter 链接
- social_weibo：微博链接
- social_email：公开邮箱或联系地址

## 二、导航栏与前台页面

### 2.1 获取分类列表

- 方法：GET
- 路径：/api/categories
- 用途：分类导航页、分类列表页

#### 返回规则

- 仅返回 isVisible = true 的分类
- 默认按 sortOrder 升序、name 升序排序

#### 单项结构

```json
{
  "id": "8a4b4aef-35d2-46d8-9ef3-31e0d3e31e02",
  "name": "后端开发",
  "slug": "backend-dev",
  "description": "服务端文章",
  "sortOrder": 0,
  "articleCount": 8,
  "isVisible": true,
  "color": "#123456",
  "createdAt": "2026-04-16T09:00:00.000Z",
  "updatedAt": "2026-04-16T09:00:00.000Z"
}
```

### 2.2 获取标签列表

- 方法：GET
- 路径：/api/tags
- 用途：标签页、标签云

#### 返回规则

- 返回全部标签
- 默认按 articleCount 降序、name 升序排序

### 2.3 获取关于页面

- 方法：GET
- 路径：/api/pages/about
- 用途：导航栏“关于”页面

#### 返回规则

- 仅返回 pageType = about 且 status = published 的页面
- 如果不存在已发布关于页，返回 404

### 2.4 获取友情链接列表

- 方法：GET
- 路径：/api/friend-links
- 用途：导航栏“友情链接”页面、页脚外链区

#### 返回规则

- 仅返回 status = approved 的友链
- 默认按 sortOrder 升序、siteName 升序排序

#### 单项结构

```json
{
  "id": "a1b2c3d4-5678-9abc-def0-123456789abc",
  "siteName": "已上线博客",
  "siteUrl": "https://approved.example.com",
  "logoUrl": null,
  "description": "已经通过审核",
  "contactEmail": null,
  "applicantName": null,
  "sortOrder": 1,
  "status": "approved",
  "approvedAt": "2026-04-16T09:00:00.000Z",
  "createdAt": "2026-04-16T08:00:00.000Z",
  "updatedAt": "2026-04-16T09:00:00.000Z"
}
```

## 三、文章列表与搜索

### 3.1 获取公开文章列表

- 方法：GET
- 路径：/api/articles
- 用途：首页文章流、分类筛选、标签筛选、搜索结果页

#### 查询参数

- page：选填，页码，默认 1
- pageSize：选填，每页条数，默认 10，最大 50
- categoryId：选填，分类 UUID v4
- tagId：选填，标签 UUID v4
- keyword：选填，搜索关键字，最多 100 个字符
- sortBy：选填，createdAt、updatedAt、publishedAt、viewCount，默认 publishedAt
- order：选填，ASC 或 DESC，默认 DESC

#### 搜索规则

- keyword 会同时匹配文章 title、excerpt、content
- 仅在公开已发布文章范围内搜索
- visibility 必须为 public

#### 响应示例

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
        "title": "NestJS 搜索实践",
        "slug": "nestjs-search-practice",
        "excerpt": "文章摘要",
        "coverImage": null,
        "category": {
          "id": "8a4b4aef-35d2-46d8-9ef3-31e0d3e31e02",
          "name": "后端开发",
          "slug": "backend-dev",
          "color": "#123456",
          "articleCount": 8
        },
        "tags": [],
        "status": "published",
        "isTop": false,
        "sortOrder": 0,
        "viewCount": 12,
        "publishedAt": "2026-04-16T09:00:00.000Z",
        "createdAt": "2026-04-16T08:00:00.000Z"
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "pageSize": 10,
      "totalPages": 1
    }
  },
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

### 3.2 获取公开文章详情

- 方法：GET
- 路径：/api/articles/:slug
- 用途：文章详情页

#### 返回规则

- 仅允许访问已发布、未删除、visibility = public 的文章
- 每次成功访问会自动累加一次 viewCount

### 3.3 获取文章公开评论列表

- 方法：GET
- 路径：`/api/articles/:articleId/comments`
- 用途：文章详情页评论列表

#### 查询参数

- page：选填，默认 1
- pageSize：选填，默认 20

#### 返回规则

- 仅返回 `approved` 且未删除的评论
- 返回顶层评论及其 replies 树结构
- 接口启用短 TTL 缓存；重复访问时响应头可能返回 `X-Cache: HIT`

#### 响应示例

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "comment-1",
        "articleId": "article-1",
        "parentId": null,
        "authorName": "访客A",
        "authorWebsite": "https://example.com",
        "content": "写得很好。",
        "createdAt": "2026-04-20T12:00:00.000Z",
        "repliedAt": null,
        "replies": [
          {
            "id": "comment-2",
            "articleId": "article-1",
            "parentId": "comment-1",
            "authorName": "博主",
            "authorWebsite": null,
            "content": "感谢支持。",
            "createdAt": "2026-04-20T12:10:00.000Z",
            "repliedAt": "2026-04-20T12:10:00.000Z",
            "replies": []
          }
        ]
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  },
  "timestamp": "2026-04-20T12:30:00.000Z"
}
```

### 3.4 获取文章点赞状态

- 方法：GET
- 路径：`/api/articles/:id/like`
- 用途：文章详情页初始化点赞按钮状态

#### 返回规则

- 支持登录用户与匿名访客
- 接口为个性化结果，不参与缓存
- 响应头固定为 `Cache-Control: no-store`

#### 响应示例

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "liked": true,
    "likes": 15
  },
  "timestamp": "2026-04-20T12:30:00.000Z"
}
```

### 3.5 点赞文章

- 方法：POST
- 路径：`/api/articles/:id/like`
- 用途：点赞文章

#### 返回示例

```json
{
  "success": true,
  "statusCode": 201,
  "message": "点赞成功",
  "data": {
    "liked": true,
    "likes": 16,
    "message": "点赞成功"
  },
  "timestamp": "2026-04-20T12:30:00.000Z"
}
```

### 3.6 取消点赞文章

- 方法：DELETE
- 路径：`/api/articles/:id/like`
- 用途：取消点赞

#### 返回示例

```json
{
  "success": true,
  "statusCode": 200,
  "message": "已取消点赞",
  "data": {
    "liked": false,
    "likes": 15,
    "message": "已取消点赞"
  },
  "timestamp": "2026-04-20T12:30:00.000Z"
}
```

## 四、订阅源接口

### 4.1 获取 RSS

- 方法：GET
- 路径：`/api/feed/rss`
- 用途：RSS 阅读器、站点订阅
- 响应类型：`application/rss+xml; charset=utf-8`

#### 缓存说明

- 已启用服务端缓存
- 重复访问可能返回 `X-Cache: HIT`

### 4.2 获取 Atom

- 方法：GET
- 路径：`/api/feed/atom`
- 用途：Atom 阅读器、站点订阅
- 响应类型：`application/atom+xml; charset=utf-8`

#### 缓存说明

- 已启用服务端缓存
- 重复访问可能返回 `X-Cache: HIT`

## 五、前台展示推荐调用方式

### 导航栏

- 固定导航项：首页、分类、标签、搜索、关于、友情链接
- 分类和标签页分别调用 /api/categories、/api/tags
- 关于页调用 /api/pages/about
- 友情链接页调用 /api/friend-links

### 页脚

- 版权与备案号来自 /api/settings
- 社交链接优先读取 socialLinks；如需兼容旧逻辑，也可以直接读取 social_* 原始键

### 搜索页

- 用户输入关键字后，请求 /api/articles?keyword=关键词&page=1&pageSize=10
- 如需组合筛选，可同时附带 categoryId 或 tagId
