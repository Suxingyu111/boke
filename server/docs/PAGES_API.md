# 页面管理接口文档

本文档基于当前后端实现整理，用于前后端联调，覆盖页面和友链两类接口。

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

- 管理端页面接口：需要登录，角色为 admin 及以上
- 管理端友链接口：需要登录，角色为 admin 及以上
- 公开页面接口：无需登录
- 公开友链接口：无需登录
- 友链申请接口：无需登录

## 数据结构说明

### 页面对象

```json
{
  "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
  "title": "关于我",
  "slug": "about",
  "pageType": "about",
  "content": "# 关于我\n\n这是关于页面的 Markdown 内容。",
  "contentHtml": "<h1>关于我</h1><p>这是关于页面的 HTML 内容。</p>",
  "summary": "关于本站的简介",
  "isHomeVisible": true,
  "status": "published",
  "seoTitle": "关于我 - 我的博客",
  "seoDescription": "了解博客作者的更多信息",
  "publishedAt": "2026-04-16T09:00:00.000Z",
  "createdBy": "1f7d3cef-35d2-46d8-9ef3-31e0d3e31e03",
  "updatedBy": "1f7d3cef-35d2-46d8-9ef3-31e0d3e31e03",
  "createdAt": "2026-04-16T08:00:00.000Z",
  "updatedAt": "2026-04-16T09:00:00.000Z"
}
```

字段说明：

- id：UUID 主键
- title：页面标题
- slug：页面唯一标识，用于 URL
- pageType：页面类型，可选值为 about、custom、resume、portfolio
- content：Markdown 格式正文
- contentHtml：HTML 格式正文，可为 null
- summary：页面摘要，可为 null
- isHomeVisible：是否在首页导航显示
- status：页面状态，可选值为 draft、published
- seoTitle：SEO 标题，可为 null
- seoDescription：SEO 描述，可为 null
- publishedAt：首次发布时间，首次设为 published 时自动生成，之后不会改变；未发布时为 null
- createdBy：创建者用户 ID
- updatedBy：最后更新者用户 ID，可为 null
- createdAt：创建时间
- updatedAt：更新时间

### 友链对象

```json
{
  "id": "a1b2c3d4-5678-9abc-def0-123456789abc",
  "siteName": "好朋友的博客",
  "siteUrl": "https://friend-blog.example.com",
  "logoUrl": "https://friend-blog.example.com/logo.png",
  "description": "一个有趣的技术博客",
  "contactEmail": "friend@example.com",
  "applicantName": "张三",
  "sortOrder": 0,
  "status": "approved",
  "approvedAt": "2026-04-16T09:00:00.000Z",
  "createdAt": "2026-04-16T08:00:00.000Z",
  "updatedAt": "2026-04-16T09:00:00.000Z"
}
```

字段说明：

- id：UUID 主键
- siteName：站点名称
- siteUrl：站点 URL
- logoUrl：站点 Logo URL，可为 null
- description：站点描述，可为 null
- contactEmail：联系邮箱，可为 null
- applicantName：申请人名称，可为 null
- sortOrder：排序权重，数值越小越靠前
- status：友链状态，可选值为 pending、approved、rejected、offline
- approvedAt：审核通过时间，仅 approved 状态有值
- createdAt：创建时间
- updatedAt：更新时间

## 1. 管理端页面接口

### 1.1 创建页面

- 方法：POST
- 路径：/api/admin/pages
- 是否需要登录：是
- 角色要求：admin 及以上

#### 请求头

```http
Authorization: Bearer jwt-token
```

#### 请求参数

```json
{
  "title": "关于我",
  "slug": "about",
  "pageType": "about",
  "content": "# 关于我\n\n这是关于页面的内容。",
  "contentHtml": "<h1>关于我</h1><p>这是关于页面的内容。</p>",
  "summary": "关于本站的简介",
  "isHomeVisible": true,
  "status": "published",
  "seoTitle": "关于我 - 我的博客",
  "seoDescription": "了解博客作者的更多信息"
}
```

#### 字段校验

- title：必填，1 到 255 个字符
- slug：必填，1 到 255 个字符，仅支持小写字母、数字和中划线
- content：必填，最多 200000 个字符
- pageType：选填，可选值为 about、custom、resume、portfolio，默认 custom
- contentHtml：选填，字符串
- summary：选填，最多 500 个字符
- isHomeVisible：选填，布尔值，默认 false
- status：选填，可选值为 draft、published，默认 draft
- seoTitle：选填，最多 255 个字符
- seoDescription：选填，最多 500 个字符

#### 成功响应

- 状态码：201

返回值为"页面对象"。

#### 常见失败响应

- 400：参数校验失败
- 409：页面 slug 已存在
- 409：关于我页面已存在（pageType 为 about 时，系统中仅允许存在一个 about 类型的页面）

#### 行为说明

- pageType 为 about 时，全系统只能存在一个 about 类型的页面
- slug 全局唯一
- 当 status 为 published 且是首次发布时，publishedAt 会被自动设为当前时间

### 1.2 管理端页面列表

- 方法：GET
- 路径：/api/admin/pages
- 是否需要登录：是
- 角色要求：admin 及以上

#### 成功响应

- 状态码：200

返回值为页面对象数组，按 updatedAt 降序、createdAt 降序排序。

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": [
    {
      "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
      "title": "关于我",
      "slug": "about",
      "pageType": "about",
      "content": "# 关于我",
      "contentHtml": null,
      "summary": "关于本站的简介",
      "isHomeVisible": true,
      "status": "published",
      "seoTitle": null,
      "seoDescription": null,
      "publishedAt": "2026-04-16T09:00:00.000Z",
      "createdBy": "1f7d3cef-35d2-46d8-9ef3-31e0d3e31e03",
      "updatedBy": "1f7d3cef-35d2-46d8-9ef3-31e0d3e31e03",
      "createdAt": "2026-04-16T08:00:00.000Z",
      "updatedAt": "2026-04-16T09:00:00.000Z"
    }
  ],
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

### 1.3 管理端页面详情

- 方法：GET
- 路径：/api/admin/pages/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 成功响应

- 状态码：200

返回值为"页面对象"。

#### 常见失败响应

- 404：页面不存在

### 1.4 更新页面

- 方法：PATCH
- 路径：/api/admin/pages/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 请求参数

请求体字段与创建页面一致，全部为选填。

#### 成功响应

- 状态码：200

返回值为"页面对象"。

#### 常见失败响应

- 404：页面不存在
- 409：页面 slug 已存在
- 409：关于我页面已存在

#### 行为说明

- 修改 slug 时，会检查新 slug 是否与其他页面冲突
- 修改 pageType 为 about 时，会检查系统中是否已存在其他 about 页面
- 首次将 status 从 draft 更改为 published 时，publishedAt 会自动设为当前时间
- 后续将 status 改回 draft 再改为 published，publishedAt 保持首次发布时间不变

### 1.5 删除页面

- 方法：DELETE
- 路径：/api/admin/pages/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 行为说明

- 当前实现为硬删除，删除后不可恢复

#### 成功响应

- 状态码：200

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "页面删除成功"
  },
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

#### 常见失败响应

- 404：页面不存在

## 2. 公开页面接口

### 2.1 获取关于页面

- 方法：GET
- 路径：/api/pages/about
- 是否需要登录：否

#### 返回规则

- 仅返回 pageType 为 about 且 status 为 published 的页面
- 如果没有已发布的关于页面，返回 404

#### 成功响应

- 状态码：200

返回值为"页面对象"。

#### 常见失败响应

- 404：页面不存在

### 2.2 按 slug 获取页面

- 方法：GET
- 路径：/api/pages/:slug
- 是否需要登录：否

#### 返回规则

- 仅返回 status 为 published 的页面
- 如果页面不存在或未发布，返回 404

#### 成功响应

- 状态码：200

返回值为"页面对象"。

#### 常见失败响应

- 404：页面不存在

## 3. 管理端友链接口

### 3.1 创建友链

- 方法：POST
- 路径：/api/admin/friend-links
- 是否需要登录：是
- 角色要求：admin 及以上

#### 请求头

```http
Authorization: Bearer jwt-token
```

#### 请求参数

```json
{
  "siteName": "好朋友的博客",
  "siteUrl": "https://friend-blog.example.com",
  "logoUrl": "https://friend-blog.example.com/logo.png",
  "description": "一个有趣的技术博客",
  "contactEmail": "friend@example.com",
  "applicantName": "张三",
  "sortOrder": 0,
  "status": "approved"
}
```

#### 字段校验

- siteName：必填，1 到 100 个字符
- siteUrl：必填，合法 URL，最多 255 个字符
- logoUrl：选填，合法 URL，最多 500 个字符
- description：选填，最多 255 个字符
- contactEmail：选填，邮箱格式，最多 255 个字符
- applicantName：选填，1 到 100 个字符
- sortOrder：选填，整数，最小为 0，默认 0
- status：选填，可选值为 pending、approved、rejected、offline，默认 approved

#### 成功响应

- 状态码：201

返回值为"友链对象"。

#### 行为说明

- 管理员创建友链时默认 status 为 approved
- 当 status 为 approved 时，approvedAt 会自动设为当前时间

### 3.2 管理端友链列表

- 方法：GET
- 路径：/api/admin/friend-links
- 是否需要登录：是
- 角色要求：admin 及以上

#### 成功响应

- 状态码：200

返回值为友链对象数组，按 sortOrder 升序、siteName 升序排序。

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": [
    {
      "id": "a1b2c3d4-5678-9abc-def0-123456789abc",
      "siteName": "好朋友的博客",
      "siteUrl": "https://friend-blog.example.com",
      "logoUrl": "https://friend-blog.example.com/logo.png",
      "description": "一个有趣的技术博客",
      "contactEmail": "friend@example.com",
      "applicantName": "张三",
      "sortOrder": 0,
      "status": "approved",
      "approvedAt": "2026-04-16T09:00:00.000Z",
      "createdAt": "2026-04-16T08:00:00.000Z",
      "updatedAt": "2026-04-16T09:00:00.000Z"
    }
  ],
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

#### 行为说明

- 返回所有状态的友链（包括 pending、approved、rejected、offline）

### 3.3 管理端友链详情

- 方法：GET
- 路径：/api/admin/friend-links/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 成功响应

- 状态码：200

返回值为"友链对象"。

#### 常见失败响应

- 404：友链不存在

### 3.4 更新友链

- 方法：PATCH
- 路径：/api/admin/friend-links/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 请求参数

请求体字段与创建友链一致，全部为选填。

#### 成功响应

- 状态码：200

返回值为"友链对象"。

#### 常见失败响应

- 404：友链不存在

#### 行为说明

- 将 status 更新为 approved 时，approvedAt 会自动设为当前时间（如果之前没有值）
- 后续将 status 改为其他状态再改回 approved，approvedAt 保持首次审批时间不变

### 3.5 删除友链

- 方法：DELETE
- 路径：/api/admin/friend-links/:id
- 是否需要登录：是
- 角色要求：admin 及以上

#### 行为说明

- 当前实现为硬删除，删除后不可恢复

#### 成功响应

- 状态码：200

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "message": "友链删除成功"
  },
  "timestamp": "2026-04-16T09:00:00.000Z"
}
```

#### 常见失败响应

- 404：友链不存在

## 4. 公开友链接口

### 4.1 公开友链列表

- 方法：GET
- 路径：/api/friend-links
- 是否需要登录：否

#### 返回规则

- 仅返回 status 为 approved 的友链
- 按 sortOrder 升序、siteName 升序排序

#### 成功响应

- 状态码：200

返回值为友链对象数组。

### 4.2 友链申请

- 方法：POST
- 路径：/api/friend-links/applications
- 是否需要登录：否

#### 请求参数

```json
{
  "siteName": "我的博客",
  "siteUrl": "https://my-blog.example.com",
  "description": "一个专注前端开发的博客",
  "contactEmail": "me@example.com",
  "applicantName": "李四"
}
```

#### 字段校验

- siteName：必填，1 到 100 个字符
- siteUrl：必填，合法 URL，最多 255 个字符
- description：选填，最多 255 个字符
- contactEmail：选填，邮箱格式，最多 255 个字符
- applicantName：选填，1 到 100 个字符

#### 成功响应

- 状态码：201

返回值为"友链对象"。

#### 行为说明

- 访客申请友链时，status 固定为 pending，需要管理员审批
- logoUrl 和 sortOrder 由管理员后续补充
- 申请成功后管理员可在管理端友链列表中看到 pending 状态的友链

## 5. 联调建议

- 关于页面全系统只允许一个，创建第二个 about 类型页面会返回 409
- slug 全局唯一，与 pageType 无关，所有页面共享同一 slug 命名空间
- 友链申请接口创建的友链状态为 pending，管理员需要通过更新接口将 status 改为 approved 才会在公开列表中展示
- 公开页面接口只返回 status 为 published 的页面，draft 状态的页面在公开接口中不可见
- publishedAt 记录的是首次发布时间，页面在 draft 和 published 之间反复切换时不会更新该字段
- approvedAt 记录的是首次审批通过时间，友链在不同状态之间切换时不会更新该字段
