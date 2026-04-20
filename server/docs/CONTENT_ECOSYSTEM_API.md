# 内容生态扩展接口文档

本文档覆盖博客系统"内容生态"模块的全部接口，包括：文章归档、全文搜索、草稿协作、付费内容、邮件通知/订阅。

## 基础信息

- 接口前缀：`/api`
- 内容类型：`application/json`
- 认证方式：Bearer Token（JWT）
- 统一响应格式同 [CONTENT_API.md](./CONTENT_API.md)

## 权限说明

| 模块 | 接口分类 | 最低角色 |
|------|---------|---------|
| 归档 | 公开 | 无需登录 |
| 搜索 | 公开 | 无需登录 |
| 搜索管理 | 管理端 | admin |
| 草稿协作 | 管理端 | author |
| 付费内容管理 | 管理端 | author |
| 付费内容（公开） | 部分需认证 | user（购买时） |
| 通知管理 | 管理端 | admin |
| 订阅 | 公开 | 无需登录 |

---

## 缓存与安全说明

- 公开 GET 接口 `/api/archives`、`/api/archives/articles`、`/api/search` 已启用服务端缓存
- 重复访问时响应头可能出现 `X-Cache: HIT`
- 上述接口会返回 `Cache-Control: public, max-age=...`
- 带 `Authorization` 头的请求不参与缓存
- 搜索关键字 `keyword` 最长 100 个字符

---

## 一、文章归档

### 1.1 获取归档概览

获取各年月的文章数统计。

**请求**

```
GET /api/archives
```

**权限**：无需登录

**缓存说明**：已启用短 TTL 缓存，重复访问可能返回 `X-Cache: HIT`

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    { "year": 2026, "month": 4, "count": 12 },
    { "year": 2026, "month": 3, "count": 8 },
    { "year": 2026, "month": 2, "count": 5 }
  ],
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

### 1.2 获取指定年月的文章列表

**请求**

```
GET /api/archives/articles?year=2026&month=4&pageSize=20
```

**权限**：无需登录

**缓存说明**：已启用短 TTL 缓存，重复访问可能返回 `X-Cache: HIT`

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | int | 是 | 年份（2000-2100） |
| month | int | 是 | 月份（1-12） |
| pageSize | int | 否 | 每页条数，默认 20，上限 100 |

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "uuid",
      "title": "文章标题",
      "slug": "article-slug",
      "excerpt": "摘要文本",
      "publishedAt": "2026-04-10T08:30:00.000Z"
    }
  ],
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

---

## 二、全文搜索

### 2.1 公开搜索文章

基于 Elasticsearch 全文搜索，ES 不可用时自动回退到数据库 LIKE 模糊查询。

**请求**

```
GET /api/search?keyword=NestJS&categoryId=uuid&page=1&pageSize=10
```

**权限**：无需登录

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 搜索关键词，最长 100 个字符 |
| categoryId | UUID | 否 | 按分类筛选 |
| page | int | 否 | 页码，默认 1 |
| pageSize | int | 否 | 每页条数，默认 10，上限 50 |

**搜索权重**：标题 ×3 > 摘要 ×2 > 正文 ×1

**缓存说明**：已启用短 TTL 缓存，重复访问可能返回 `X-Cache: HIT`

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "使用 <mark>NestJS</mark> 搭建博客",
        "slug": "nestjs-blog",
        "excerpt": "本文介绍如何使用...",
        "contentHighlight": "...在 <mark>NestJS</mark> 中创建模块...",
        "publishedAt": "2026-04-10T08:30:00.000Z",
        "score": 12.5
      }
    ],
    "total": 3,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  },
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

**说明**：
- `title` 和 `contentHighlight` 中的匹配文本会被 `<mark>` 标签高亮
- ES 不可用时 `score` 返回 `null`，`contentHighlight` 返回 `null`
- 仅搜索已发布（status=published）的文章

### 2.2 管理端 - 重建搜索索引

全量重建 Elasticsearch 索引，分批（每批 100 条）处理。

**请求**

```
POST /api/admin/search/rebuild-index
```

**权限**：admin 及以上，需 Bearer Token

**请求体**：无

**响应示例**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "indexed": 156,
    "failed": 0
  },
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

---

## 三、草稿协作

所有接口挂在 `/api/admin/collaboration` 下，需 author 及以上角色。

### 3.1 添加协作者

**请求**

```
POST /api/admin/collaboration/:articleId/collaborators
```

**权限**：文章作者或 admin 以上

**请求体**

```json
{
  "userId": "uuid-of-collaborator",
  "permission": "editor"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | UUID | 是 | 被邀请用户 ID |
| permission | enum | 是 | `editor`（可编辑）或 `viewer`（只读） |

**响应示例**

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "uuid",
    "articleId": "uuid",
    "userId": "uuid",
    "permission": "editor",
    "invitedBy": "uuid",
    "createdAt": "2026-04-16T10:00:00.000Z"
  },
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

### 3.2 移除协作者

**请求**

```
DELETE /api/admin/collaboration/:articleId/collaborators/:collaboratorId
```

**权限**：文章作者或 admin 以上

**路径参数**

| 参数 | 说明 |
|------|------|
| articleId | 文章 ID |
| collaboratorId | 协作记录 ID |

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": { "deleted": true },
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

### 3.3 获取协作者列表

**请求**

```
GET /api/admin/collaboration/:articleId/collaborators
```

**权限**：文章参与者（作者/协作者）

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "permission": "editor",
      "invitedBy": "uuid",
      "createdAt": "2026-04-16T10:00:00.000Z",
      "user": {
        "id": "uuid",
        "username": "collaborator1",
        "nickname": "协作者A",
        "avatar": "https://..."
      }
    }
  ],
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

### 3.4 协作编辑草稿

协作者（editor 权限）可编辑草稿内容，系统自动记录变更日志。

**请求**

```
PATCH /api/admin/collaboration/:articleId/draft
```

**权限**：文章的 editor 协作者

**请求体**

```json
{
  "title": "修改后的标题",
  "content": "修改后的 Markdown 内容",
  "contentHtml": "<p>修改后的 HTML</p>",
  "excerpt": "修改后的摘要"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 文章标题，最长 255 |
| content | string | 否 | Markdown 正文 |
| contentHtml | string | 否 | HTML 正文 |
| excerpt | string | 否 | 摘要，最长 500 |

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "article-uuid",
    "title": "修改后的标题",
    "updatedAt": "2026-04-16T10:05:00.000Z"
  },
  "message": "Success",
  "timestamp": "2026-04-16T10:05:00.000Z"
}
```

### 3.5 获取编辑历史

查看草稿的所有协作编辑记录。

**请求**

```
GET /api/admin/collaboration/:articleId/history
```

**权限**：文章参与者（作者/协作者）

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "uuid",
      "articleId": "uuid",
      "userId": "uuid",
      "fieldChanged": "title",
      "oldValue": "旧标题",
      "newValue": "新标题",
      "summary": "修改了标题",
      "createdAt": "2026-04-16T10:05:00.000Z",
      "user": {
        "id": "uuid",
        "username": "collaborator1",
        "nickname": "协作者A"
      }
    }
  ],
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

---

## 四、付费内容

### 管理端接口

#### 4.1 设置文章为付费

**请求**

```
PUT /api/admin/paid-content/:articleId
```

**权限**：author 及以上（仅文章作者或 admin）

**请求体**

```json
{
  "price": 9.99,
  "previewPercent": 30,
  "isActive": true,
  "description": "本文为付费文章，支付后可查看完整内容"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| price | number | 是 | 价格（0.01 ~ 99999.99，最多两位小数） |
| previewPercent | int | 否 | 免费预览比例（0-100），默认 30 |
| isActive | boolean | 否 | 是否生效 |
| description | string | 否 | 付费说明 |

**响应**：返回付费配置对象

#### 4.2 移除付费设置

**请求**

```
DELETE /api/admin/paid-content/:articleId
```

**权限**：author 及以上（仅文章作者或 admin）

**响应**：返回 `{ deleted: true }`

#### 4.3 查看文章购买记录

**请求**

```
GET /api/admin/paid-content/:articleId/purchases
```

**权限**：admin 及以上

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "uuid",
      "articleId": "uuid",
      "userId": "uuid",
      "paidAmount": 9.99,
      "paymentMethod": "wechat",
      "transactionId": "tx_123456",
      "purchasedAt": "2026-04-16T10:00:00.000Z"
    }
  ],
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

### 公开端接口

#### 4.4 获取付费信息

**请求**

```
GET /api/paid-content/:articleId/info
```

**权限**：无需登录

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "isPaid": true,
    "price": 9.99,
    "previewPercent": 30,
    "description": "付费后可查看完整内容"
  },
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

#### 4.5 获取文章内容（自动截断）

未购买的付费文章，内容会按 previewPercent 比例截断。

**请求**

```
GET /api/paid-content/:articleId/content
```

**权限**：无需登录（未登录/未购买返回截断内容）

**响应示例**（未购买时）

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "content": "截断后的正文...",
    "isTruncated": true,
    "previewPercent": 30
  },
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

**说明**：文章作者始终看到完整内容

#### 4.6 购买文章

**请求**

```
POST /api/paid-content/purchase
```

**权限**：需登录（user 及以上）

**请求体**

```json
{
  "articleId": "uuid",
  "paymentMethod": "wechat",
  "transactionId": "tx_123456"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| articleId | UUID | 是 | 文章 ID |
| paymentMethod | string | 否 | 支付方式，最长 50 |
| transactionId | string | 否 | 交易流水号，最长 200 |

**响应**：返回购买记录对象

**错误场景**：
- 非付费文章：400
- 已购买：409

#### 4.7 检查是否已购买

**请求**

```
GET /api/paid-content/:articleId/check
```

**权限**：需登录

**响应示例**

```json
{
  "success": true,
  "statusCode": 200,
  "data": { "purchased": true },
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

#### 4.8 获取我的购买列表

**请求**

```
GET /api/paid-content/my-purchases
```

**权限**：需登录

**响应**：返回当前用户的所有购买记录数组

---

## 五、通知与订阅

### 公开端 - 邮件订阅

#### 5.1 订阅

**请求**

```
POST /api/subscriptions
```

**权限**：无需登录

**请求体**

```json
{
  "email": "reader@example.com",
  "name": "读者小明"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 有效邮箱地址 |
| name | string | 否 | 订阅者名称，最长 100 |

**响应示例**

```json
{
  "success": true,
  "statusCode": 201,
  "data": { "message": "订阅成功，请查收确认邮件" },
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

#### 5.2 确认订阅

**请求**

```
GET /api/subscriptions/confirm/:token
```

**权限**：无需登录

**路径参数**

| 参数 | 说明 |
|------|------|
| token | 确认令牌（邮件链接中附带） |

**响应**：`{ confirmed: true }`

#### 5.3 取消订阅

**请求**

```
GET /api/subscriptions/unsubscribe/:token
```

**权限**：无需登录

**路径参数**

| 参数 | 说明 |
|------|------|
| token | 退订令牌（每封邮件底部的退订链接） |

**响应**：`{ unsubscribed: true }`

### 管理端 - 通知管理

#### 5.4 发送自定义通知邮件

**请求**

```
POST /api/admin/notifications/send
```

**权限**：admin 及以上

**请求体**

```json
{
  "toEmail": "user@example.com",
  "subject": "系统通知",
  "body": "<h1>通知标题</h1><p>通知内容...</p>",
  "type": "system"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| toEmail | string | 是 | 收件人邮箱 |
| subject | string | 是 | 邮件主题，最长 255 |
| body | string | 是 | HTML 邮件正文 |
| type | enum | 否 | `comment` / `subscription` / `system`，默认 system |

**响应**：返回通知记录对象

#### 5.5 通知订阅者新文章

向所有已确认的活跃订阅者发送新文章通知邮件。

**请求**

```
POST /api/admin/notifications/notify-subscribers
```

**权限**：admin 及以上

**请求体**

```json
{
  "articleTitle": "新文章标题",
  "articleSlug": "new-article-slug"
}
```

**响应示例**

```json
{
  "success": true,
  "statusCode": 201,
  "data": { "sent": 42, "failed": 0 },
  "message": "Success",
  "timestamp": "2026-04-16T10:00:00.000Z"
}
```

#### 5.6 重试发送失败的邮件

重试状态为 `failed` 且重试次数 < 3 的通知。

**请求**

```
POST /api/admin/notifications/retry-failed
```

**权限**：admin 及以上

**响应**：返回重试结果统计

#### 5.7 获取通知记录列表

**请求**

```
GET /api/admin/notifications?page=1&pageSize=20
```

**权限**：admin 及以上

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| pageSize | int | 否 | 每页条数，默认 20 |

**响应**：分页返回通知记录，含 `items`、`total`、`page`、`pageSize`

#### 5.8 获取订阅者列表

**请求**

```
GET /api/admin/notifications/subscribers?page=1&pageSize=20
```

**权限**：admin 及以上

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认 1 |
| pageSize | int | 否 | 每页条数，默认 20 |

**响应**：分页返回订阅者列表

#### 5.9 删除订阅者

**请求**

```
DELETE /api/admin/notifications/subscribers/:id
```

**权限**：admin 及以上

**路径参数**

| 参数 | 说明 |
|------|------|
| id | 订阅者记录 ID |

**响应**：`{ deleted: true }`

---

## 六、环境变量配置

以下新增环境变量均为**可选**，未配置时对应功能以降级模式运行。

```env
# Elasticsearch（可选，未配置则搜索回退到数据库 LIKE 查询）
ES_NODE=http://localhost:9200
ES_USERNAME=
ES_PASSWORD=

# SMTP 邮件（可选，未配置则通知模块跳过邮件发送）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your_smtp_password
SMTP_FROM=Blog System <noreply@example.com>
```

---

## 七、数据库新增实体

| 实体 | 表名 | 说明 |
|------|------|------|
| DraftCollaborator | draft_collaborators | 草稿协作者（文章-用户多对多） |
| DraftEditLog | draft_edit_logs | 协作编辑日志 |
| PaidContent | paid_contents | 文章付费配置 |
| ArticlePurchase | article_purchases | 文章购买记录 |
| EmailSubscriber | email_subscribers | 邮件订阅用户 |
| EmailNotification | email_notifications | 邮件通知队列/日志 |
