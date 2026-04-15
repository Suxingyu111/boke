# 内容管理接口文档

本文档基于当前后端实现整理，用于前后端联调，覆盖文章、分类、标签三类接口。

## 基础信息

- 接口前缀：/api
- 内容类型：application/json
- 认证方式：Bearer Token
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
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

### 失败响应

```json
{
  "success": false,
  "statusCode": 400,
  "message": "参数校验失败",
  "errors": "Bad Request",
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

## 权限说明

- 管理端文章接口：需要登录，角色为 author 及以上
- 管理端分类接口：需要登录，角色为 admin 及以上
- 管理端标签接口：需要登录，角色为 admin 及以上
- 公开文章、分类、标签接口：无需登录

## 数据结构说明

### 管理端文章对象

管理端文章详情和管理端文章列表中的单项结构如下：

```json
{
  "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
  "title": "文章接口设计",
  "slug": "article-api-design",
  "excerpt": "文章摘要",
  "content": "# Markdown 内容",
  "contentHtml": null,
  "coverImage": null,
  "categoryId": "8a4b4aef-35d2-46d8-9ef3-31e0d3e31e02",
  "status": "draft",
  "visibility": "public",
  "allowComment": true,
  "isTop": false,
  "sortOrder": 0,
  "viewCount": 0,
  "likes": 0,
  "commentCount": 0,
  "seoTitle": null,
  "seoDescription": null,
  "seoKeywords": null,
  "userId": "1f7d3cef-35d2-46d8-9ef3-31e0d3e31e03",
  "scheduledAt": null,
  "createdAt": "2026-04-16T09:00:00.000Z",
  "updatedAt": "2026-04-16T09:00:00.000Z",
  "publishedAt": null,
  "deletedAt": null,
  "category": {
    "id": "8a4b4aef-35d2-46d8-9ef3-31e0d3e31e02",
    "name": "后端开发",
    "slug": "backend-dev",
    "description": "服务端文章",
    "sortOrder": 0,
    "articleCount": 1,
    "isVisible": true,
    "color": "#123456",
    "createdAt": "2026-04-16T09:00:00.000Z",
    "updatedAt": "2026-04-16T09:00:00.000Z"
  },
  "tags": [
    {
      "id": "2c4d3cef-35d2-46d8-9ef3-31e0d3e31e04",
      "name": "NestJS",
      "slug": "nestjs",
      "articleCount": 1,
      "createdAt": "2026-04-16T09:00:00.000Z",
      "updatedAt": "2026-04-16T09:00:00.000Z"
    }
  ]
}
```

### 公开文章列表项

```json
{
  "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
  "title": "文章接口设计",
  "slug": "article-api-design",
  "excerpt": "文章摘要",
  "coverImage": null,
  "category": {
    "id": "8a4b4aef-35d2-46d8-9ef3-31e0d3e31e02",
    "name": "后端开发",
    "slug": "backend-dev",
    "color": "#123456",
    "articleCount": 1
  },
  "tags": [
    {
      "id": "2c4d3cef-35d2-46d8-9ef3-31e0d3e31e04",
      "name": "NestJS",
      "slug": "nestjs",
      "articleCount": 1
    }
  ],
  "status": "published",
  "isTop": false,
  "sortOrder": 0,
  "viewCount": 12,
  "publishedAt": "2026-04-16T09:00:00.000Z",
  "createdAt": "2026-04-16T08:00:00.000Z"
}
```

### 公开文章详情对象

公开文章详情在公开文章列表项的基础上，额外返回：

- content：Markdown 正文
- contentHtml：HTML 正文，可为空

### 分类对象

```json
{
  "id": "8a4b4aef-35d2-46d8-9ef3-31e0d3e31e02",
  "name": "后端开发",
  "slug": "backend-dev",
  "description": "服务端文章",
  "sortOrder": 0,
  "articleCount": 1,
  "isVisible": true,
  "color": "#123456",
  "createdAt": "2026-04-16T09:00:00.000Z",
  "updatedAt": "2026-04-16T09:00:00.000Z"
}
```

### 标签对象

```json
{
  "id": "2c4d3cef-35d2-46d8-9ef3-31e0d3e31e04",
  "name": "NestJS",
  "slug": "nestjs",
  "articleCount": 1,
  "createdAt": "2026-04-16T09:00:00.000Z",
  "updatedAt": "2026-04-16T09:00:00.000Z"
}
```

## 1. 管理端文章接口

### 1.1 创建文章

- 方法：POST
- 路径：/api/admin/articles
- 是否需要登录：是
- 角色要求：author 及以上

#### 请求头

```http
Authorization: Bearer jwt-token
```

#### 请求参数

```json
{
  "title": "文章接口设计",
  "slug": "article-api-design",
  "excerpt": "文章摘要",
  "content": "# Markdown 内容",
  "contentHtml": "<h1>Markdown 内容</h1>",
  "coverImage": "https://example.com/cover.jpg",
  "categoryId": "8a4b4aef-35d2-46d8-9ef3-31e0d3e31e02",
  "tagIds": [
    "2c4d3cef-35d2-46d8-9ef3-31e0d3e31e04",
    "3d5e3cef-35d2-46d8-9ef3-31e0d3e31e05"
  ],
  "status": "draft",
  "visibility": "public",
  "allowComment": true,
  "isTop": false,
  "sortOrder": 0,
  "seoTitle": "SEO 标题",
  "seoDescription": "SEO 描述",
  "seoKeywords": "nestjs,blog",
  "scheduledAt": "2026-04-20T09:00:00.000Z"
}
```

#### 字段校验

- title：必填，1 到 255 个字符
- slug：必填，1 到 255 个字符，仅支持小写字母、数字和中划线
- excerpt：选填，最多 2000 个字符
- content：必填，最多 200000 个字符
- contentHtml：选填，字符串
- coverImage：选填，最多 500 个字符
- categoryId：必填，UUID v4
- tagIds：选填，UUID v4 数组，且不能重复
- status：选填，可选值为 draft、scheduled、published、archived，默认 draft
- visibility：选填，可选值为 public、private、password，默认 public
- allowComment：选填，布尔值，默认 true
- isTop：选填，布尔值，默认 false
- sortOrder：选填，整数，最小为 0
- seoTitle：选填，最多 255 个字符
- seoDescription：选填，最多 500 个字符
- seoKeywords：选填，最多 255 个字符
- scheduledAt：选填，ISO 8601 时间字符串；当 status 为 scheduled 时必填

#### 成功响应

- 状态码：201

返回值为“管理端文章对象”。

#### 常见失败响应

- 400：scheduledAt 在定时发布时必填
- 400：分类 ID 格式不正确
- 400：标签 ID 格式不正确
- 404：分类不存在
- 404：标签不存在
- 409：文章 slug 已存在

### 1.2 管理端文章列表

- 方法：GET
- 路径：/api/admin/articles
- 是否需要登录：是
- 角色要求：author 及以上

#### 查询参数

- page：选填，页码，默认 1
- pageSize：选填，每页条数，默认 10，最大 50
- status：选填，draft、scheduled、published、archived
- categoryId：选填，分类 UUID v4
- tagId：选填，标签 UUID v4
- keyword：选填，关键字，最多 100 个字符，会匹配 title、excerpt、content
- sortBy：选填，createdAt、updatedAt、publishedAt、viewCount，默认 updatedAt
- order：选填，ASC 或 DESC，默认 DESC

#### 成功响应

- 状态码：200

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
        "title": "文章接口设计",
        "slug": "article-api-design",
        "status": "draft",
        "category": {
          "id": "8a4b4aef-35d2-46d8-9ef3-31e0d3e31e02",
          "name": "后端开发",
          "slug": "backend-dev",
          "description": "服务端文章",
          "sortOrder": 0,
          "articleCount": 1,
          "isVisible": true,
          "color": "#123456",
          "createdAt": "2026-04-16T09:00:00.000Z",
          "updatedAt": "2026-04-16T09:00:00.000Z"
        },
        "tags": []
      }
    ],
    "meta": {
      "total": 1,
      "page": 1,
      "pageSize": 10,
      "totalPages": 1
    }
  },
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

#### 行为说明

- author 角色只能看到自己创建的文章
- admin、super_admin 可以看到全部文章
- 当前实现会优先按 isTop 进行排序，再按 sortBy 和 order 排序

### 1.3 管理端文章详情

- 方法：GET
- 路径：/api/admin/articles/:id
- 是否需要登录：是
- 角色要求：author 及以上

#### 成功响应

- 状态码：200

返回值为“管理端文章对象”。

#### 常见失败响应

- 403：无权操作该文章
- 404：文章不存在

### 1.4 更新文章

- 方法：PATCH
- 路径：/api/admin/articles/:id
- 是否需要登录：是
- 角色要求：author 及以上

#### 请求参数

请求体字段与创建文章一致，全部为选填。

#### 成功响应

- 状态码：200

返回值为“管理端文章对象”。

#### 常见失败响应

- 400：scheduledAt 在定时发布时必填
- 403：无权操作该文章
- 404：文章不存在
- 404：分类不存在
- 404：标签不存在
- 409：文章 slug 已存在

### 1.5 删除文章

- 方法：DELETE
- 路径：/api/admin/articles/:id
- 是否需要登录：是
- 角色要求：author 及以上

#### 行为说明

- 当前实现为软删除
- 删除时会将文章状态改为 archived，并写入 deletedAt
- 管理端列表支持查询 archived 状态文章，用于回收站展示
- 对 archived 文章调用更新接口并传入 status=draft，可恢复为草稿并清空 deletedAt

#### 成功响应

- 状态码：200

```json
{
  "success": true,
  "statusCode": 200,
  "message": "文章删除成功",
  "data": {
    "message": "文章删除成功"
  },
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

#### 常见失败响应

- 403：无权操作该文章
- 404：文章不存在

### 1.6 永久删除文章

- 方法：DELETE
- 路径：/api/admin/articles/:id/permanent
- 是否需要登录：是
- 角色要求：author 及以上

#### 行为说明

- 会删除文章与标签关联，并从数据库中移除文章记录
- 可用于回收站中的“永久删除”

#### 成功响应

- 状态码：200

```json
{
  "success": true,
  "statusCode": 200,
  "message": "文章永久删除成功",
  "data": {
    "message": "文章永久删除成功"
  },
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

#### 常见失败响应

- 403：无权操作该文章
- 404：文章不存在

## 2. 公开文章接口

### 2.1 公开文章列表

- 方法：GET
- 路径：/api/articles
- 是否需要登录：否

#### 查询参数

- page：选填，默认 1
- pageSize：选填，默认 10，最大 50
- categoryId：选填，分类 UUID v4
- tagId：选填，标签 UUID v4
- keyword：选填，最多 100 个字符
- sortBy：选填，createdAt、updatedAt、publishedAt、viewCount，默认 publishedAt
- order：选填，ASC 或 DESC，默认 DESC

#### 返回规则

- 仅返回 status 为 published 的文章
- 仅返回 visibility 为 public 的文章
- 调用列表接口时会先检查 scheduled 状态且已到时的文章，并自动转为 published

#### 成功响应

- 状态码：200

返回值中的 items 为“公开文章列表项”。

### 2.2 公开文章详情

- 方法：GET
- 路径：/api/articles/:slug
- 是否需要登录：否

#### 返回规则

- 仅可访问 status 为 published 且 visibility 为 public 的文章
- 每次成功访问详情时，viewCount 会自动加 1

#### 成功响应

- 状态码：200

返回值为“公开文章详情对象”。

#### 常见失败响应

- 404：文章不存在

## 3. 分类接口

### 3.1 创建分类

- 方法：POST
- 路径：/api/admin/categories
- 是否需要登录：是
- 角色要求：admin 及以上

#### 请求参数

```json
{
  "name": "后端开发",
  "slug": "backend-dev",
  "description": "服务端文章",
  "sortOrder": 0,
  "isVisible": true,
  "color": "#123456"
}
```

#### 字段校验

- name：必填，1 到 100 个字符
- slug：必填，1 到 100 个字符，仅支持小写字母、数字和中划线
- description：选填，最多 1000 个字符
- sortOrder：选填，整数，最小为 0
- isVisible：选填，布尔值
- color：选填，合法十六进制颜色值

#### 成功响应

- 状态码：201

返回值为“分类对象”。

#### 常见失败响应

- 409：分类 slug 已存在

### 3.2 管理端分类列表

- 方法：GET
- 路径：/api/admin/categories
- 是否需要登录：是
- 角色要求：admin 及以上

#### 成功响应

- 状态码：200

返回值为分类对象数组。

### 3.3 管理端分类详情

- 方法：GET
- 路径：/api/admin/categories/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 成功响应

- 状态码：200

返回值为“分类对象”。

#### 常见失败响应

- 404：分类不存在

### 3.4 更新分类

- 方法：PATCH
- 路径：/api/admin/categories/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 请求参数

请求体字段与创建分类一致，全部为选填。

#### 成功响应

- 状态码：200

返回值为“分类对象”。

#### 常见失败响应

- 404：分类不存在
- 409：分类 slug 已存在

### 3.5 删除分类

- 方法：DELETE
- 路径：/api/admin/categories/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 删除规则

- 如果该分类下仍存在未删除文章，会拒绝删除

#### 成功响应

- 状态码：200

```json
{
  "success": true,
  "statusCode": 200,
  "message": "分类删除成功",
  "data": {
    "message": "分类删除成功"
  },
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

#### 常见失败响应

- 404：分类不存在
- 409：分类下仍有文章，无法删除

### 3.6 公开分类列表

- 方法：GET
- 路径：/api/categories
- 是否需要登录：否

#### 返回规则

- 仅返回 isVisible 为 true 的分类

#### 成功响应

- 状态码：200

返回值为分类对象数组。

## 4. 标签接口

### 4.1 创建标签

- 方法：POST
- 路径：/api/admin/tags
- 是否需要登录：是
- 角色要求：admin 及以上

#### 请求参数

```json
{
  "name": "NestJS",
  "slug": "nestjs"
}
```

#### 字段校验

- name：必填，1 到 50 个字符
- slug：必填，1 到 100 个字符，仅支持小写字母、数字和中划线

#### 成功响应

- 状态码：201

返回值为“标签对象”。

#### 常见失败响应

- 409：标签 slug 已存在

### 4.2 管理端标签列表

- 方法：GET
- 路径：/api/admin/tags
- 是否需要登录：是
- 角色要求：admin 及以上

#### 成功响应

- 状态码：200

返回值为标签对象数组。

### 4.3 管理端标签详情

- 方法：GET
- 路径：/api/admin/tags/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 成功响应

- 状态码：200

返回值为“标签对象”。

#### 常见失败响应

- 404：标签不存在

### 4.4 更新标签

- 方法：PATCH
- 路径：/api/admin/tags/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 请求参数

请求体字段与创建标签一致，全部为选填。

#### 成功响应

- 状态码：200

返回值为“标签对象”。

#### 常见失败响应

- 404：标签不存在
- 409：标签 slug 已存在

### 4.5 删除标签

- 方法：DELETE
- 路径：/api/admin/tags/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 删除规则

- 如果标签仍被未删除文章引用，会拒绝删除

#### 成功响应

- 状态码：200

```json
{
  "success": true,
  "statusCode": 200,
  "message": "标签删除成功",
  "data": {
    "message": "标签删除成功"
  },
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

#### 常见失败响应

- 404：标签不存在
- 409：标签已被文章引用，无法删除

### 4.6 公开标签列表

- 方法：GET
- 路径：/api/tags
- 是否需要登录：否

#### 成功响应

- 状态码：200

返回值为标签对象数组。

## 5. 联调建议

- 创建或更新文章时，如果选择定时发布，务必同时传 status=scheduled 与 scheduledAt
- 管理端文章列表和公开文章列表都支持按 categoryId、tagId、keyword 过滤
- 公开文章详情会自动累加阅读量，前端如有埋点需求无需重复累加
- 当前公开文章接口只返回 visibility=public 的文章，private 和 password 类型文章不会出现在公开接口中
