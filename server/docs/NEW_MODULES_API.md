# 新增模块接口文档

本文档覆盖本次后端迭代新增的全部功能模块 API，按模块分组。

## 基础信息

- 接口前缀：`/api`
- 认证方式：Bearer Token（Header: `Authorization: Bearer <token>`）
- 内容类型：`application/json`
- 统一成功响应格式：

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {},
  "timestamp": "2026-04-15T15:00:00.000Z"
}
```

- 统一失败响应格式：

```json
{
  "success": false,
  "statusCode": 400,
  "message": "错误描述",
  "errors": "BadRequest",
  "timestamp": "2026-04-15T15:00:00.000Z"
}
```

---

## 目录

1. [SEO 优化](#1-seo-优化)
2. [备份与恢复](#2-备份与恢复)
3. [多语言支持](#3-多语言支持-i18n)
4. [用户中心](#4-用户中心)
5. [文章收藏](#5-文章收藏)
6. [站内通知](#6-站内通知)
7. [访客统计](#7-访客统计)
8. [留言板](#8-留言板)
9. [友情链接](#9-友情链接)
10. [公告栏](#10-公告栏)

---

## 1. SEO 优化

公开接口，无需认证。

### 1.1 获取站点 SEO 配置

- 方法：GET
- 路径：`/api/seo/site`
- 认证：否

**成功响应 data**

```json
{
  "siteTitle": "我的博客",
  "siteDescription": "一个关于技术的博客",
  "siteKeywords": "技术,编程,前端",
  "ogImage": "https://example.com/og.png"
}
```

### 1.2 获取文章 SEO 元数据

- 方法：GET
- 路径：`/api/seo/articles/:slug`
- 认证：否

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| slug | path | string | 是 | 文章 slug |

**成功响应 data**

```json
{
  "title": "文章标题",
  "description": "文章摘要",
  "keywords": "关键词1,关键词2",
  "ogTitle": "文章标题",
  "ogDescription": "文章摘要",
  "ogType": "article",
  "author": "作者名",
  "publishedAt": "2026-04-15T15:00:00.000Z"
}
```

### 1.3 获取页面 SEO 元数据

- 方法：GET
- 路径：`/api/seo/pages/:slug`
- 认证：否

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| slug | path | string | 是 | 页面 slug |

**成功响应 data**

```json
{
  "title": "页面标题",
  "description": "页面描述",
  "keywords": "关键词",
  "ogTitle": "页面标题",
  "ogType": "website"
}
```

### 1.4 获取 Sitemap 数据

- 方法：GET
- 路径：`/api/seo/sitemap`
- 认证：否

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| baseUrl | query | string | 否 | 站点域名，默认 `https://blog.example.com` |

**成功响应 data**

```json
{
  "urls": [
    {
      "loc": "https://blog.example.com/articles/my-post",
      "lastmod": "2026-04-15",
      "changefreq": "weekly",
      "priority": 0.8
    }
  ]
}
```

---

## 2. 备份与恢复

全部接口需要管理员权限。

### 2.1 创建数据库备份

- 方法：POST
- 路径：`/api/admin/backup`
- 认证：是（admin）

**成功响应 data**

```json
{
  "filename": "backup_20260415_150000.sql",
  "size": 1024000,
  "createdAt": "2026-04-15T15:00:00.000Z"
}
```

### 2.2 获取备份文件列表

- 方法：GET
- 路径：`/api/admin/backup`
- 认证：是（admin）

**成功响应 data**

```json
[
  {
    "filename": "backup_20260415_150000.sql",
    "size": 1024000,
    "createdAt": "2026-04-15T15:00:00.000Z"
  }
]
```

### 2.3 下载备份文件

- 方法：GET
- 路径：`/api/admin/backup/:filename/download`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| filename | path | string | 是 | 备份文件名 |

**响应**: 文件流，Content-Type: `application/sql`，Content-Disposition: `attachment`

### 2.4 恢复数据库

- 方法：POST
- 路径：`/api/admin/backup/:filename/restore`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| filename | path | string | 是 | 备份文件名 |

**成功响应 data**

```json
{
  "message": "数据库恢复成功"
}
```

### 2.5 删除备份文件

- 方法：DELETE
- 路径：`/api/admin/backup/:filename`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| filename | path | string | 是 | 备份文件名 |

---

## 3. 多语言支持 (i18n)

### 3.1 获取支持的语言列表

- 方法：GET
- 路径：`/api/i18n/locales`
- 认证：否

**成功响应 data**

```json
["zh-CN", "en-US"]
```

### 3.2 获取默认语言

- 方法：GET
- 路径：`/api/i18n/default`
- 认证：否

**成功响应 data**

```json
{
  "locale": "zh-CN"
}
```

### 3.3 获取翻译包

- 方法：GET
- 路径：`/api/i18n/translations/:locale`
- 认证：否

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| locale | path | string | 是 | 语言代码 (zh-CN / en-US) |

**成功响应 data**

```json
{
  "site.title": "我的博客",
  "site.description": "一个关于技术的博客",
  "nav.home": "首页",
  "nav.articles": "文章",
  "nav.categories": "分类",
  "nav.tags": "标签",
  "nav.about": "关于"
}
```

### 3.4 设置默认语言（管理员）

- 方法：PUT
- 路径：`/api/i18n/default`
- 认证：是（admin）

**请求参数**

```json
{
  "locale": "en-US"
}
```

---

## 4. 用户中心

全部接口需要登录。

### 4.1 获取个人资料

- 方法：GET
- 路径：`/api/users/profile`
- 认证：是（登录用户）

**成功响应 data**

```json
{
  "id": "uuid",
  "username": "user1",
  "email": "user@example.com",
  "nickname": "用户昵称",
  "avatar": "https://example.com/avatar.png",
  "bio": "个人简介",
  "role": "user",
  "lastLoginAt": "2026-04-15T15:00:00.000Z",
  "createdAt": "2026-04-15T15:00:00.000Z"
}
```

### 4.2 更新个人资料

- 方法：PUT
- 路径：`/api/users/profile`
- 认证：是（登录用户）

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 昵称，1-100 字符 |
| avatar | string | 否 | 头像 URL |
| bio | string | 否 | 个人简介，最多 500 字符 |

```json
{
  "nickname": "新昵称",
  "avatar": "https://example.com/new-avatar.png",
  "bio": "新的个人简介"
}
```

### 4.3 修改密码

- 方法：PUT
- 路径：`/api/users/password`
- 认证：是（登录用户）

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | 是 | 旧密码，6-100 字符 |
| newPassword | string | 是 | 新密码，6-100 字符 |

```json
{
  "oldPassword": "OldPass123",
  "newPassword": "NewPass456"
}
```

### 4.4 获取我的收藏文章

- 方法：GET
- 路径：`/api/users/favorites`
- 认证：是（登录用户）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| page | query | number | 否 | 页码，默认 1 |
| pageSize | query | number | 否 | 每页条数，默认 20 |

**成功响应 data**

```json
{
  "items": [
    {
      "id": "favorite-uuid",
      "articleId": "article-uuid",
      "article": {
        "id": "article-uuid",
        "title": "文章标题",
        "slug": "article-slug",
        "excerpt": "摘要"
      },
      "createdAt": "2026-04-15T15:00:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20
}
```

---

## 5. 文章收藏

全部接口需要登录。

### 5.1 收藏文章

- 方法：POST
- 路径：`/api/favorites/:articleId`
- 认证：是（登录用户）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| articleId | path | string (UUID) | 是 | 文章 ID |

### 5.2 取消收藏

- 方法：DELETE
- 路径：`/api/favorites/:articleId`
- 认证：是（登录用户）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| articleId | path | string (UUID) | 是 | 文章 ID |

### 5.3 检查是否已收藏

- 方法：GET
- 路径：`/api/favorites/:articleId/check`
- 认证：是（登录用户）

**成功响应 data**

```json
{
  "isFavorited": true
}
```

### 5.4 批量检查收藏状态

- 方法：POST
- 路径：`/api/favorites/batch-check`
- 认证：是（登录用户）

**请求参数**

```json
{
  "articleIds": ["uuid1", "uuid2", "uuid3"]
}
```

**成功响应 data**

```json
{
  "uuid1": true,
  "uuid2": false,
  "uuid3": true
}
```

---

## 6. 站内通知

### 6.1 获取我的通知列表

- 方法：GET
- 路径：`/api/notifications`
- 认证：是（登录用户）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| page | query | number | 否 | 页码，默认 1 |
| pageSize | query | number | 否 | 每页条数，默认 20 |
| unreadOnly | query | boolean | 否 | 仅未读，默认 false |

**成功响应 data**

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "system",
      "title": "系统通知",
      "content": "欢迎来到博客！",
      "relatedId": null,
      "relatedType": null,
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-04-15T15:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

通知类型枚举：`comment_reply`、`like`、`system`、`announcement`、`favorite`

### 6.2 获取未读通知数量

- 方法：GET
- 路径：`/api/notifications/unread-count`
- 认证：是（登录用户）

**成功响应 data**

```json
{
  "count": 3
}
```

### 6.3 标记通知为已读

- 方法：PUT
- 路径：`/api/notifications/:id/read`
- 认证：是（登录用户）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| id | path | string (UUID) | 是 | 通知 ID |

### 6.4 全部标记为已读

- 方法：PUT
- 路径：`/api/notifications/read-all`
- 认证：是（登录用户）

### 6.5 删除通知

- 方法：DELETE
- 路径：`/api/notifications/:id`
- 认证：是（登录用户）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| id | path | string (UUID) | 是 | 通知 ID |

### 6.6 广播系统通知（管理员）

- 方法：POST
- 路径：`/api/admin/notifications/broadcast`
- 认证：是（admin）

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 通知标题，最多 255 字符 |
| content | string | 是 | 通知内容 |
| userIds | string[] | 是 | 目标用户 ID 数组 |

```json
{
  "title": "系统维护通知",
  "content": "系统将于今晚 22:00 进行维护",
  "userIds": ["user-uuid-1", "user-uuid-2"]
}
```

---

## 7. 访客统计

### 7.1 记录页面访问

- 方法：POST
- 路径：`/api/stats/visit`
- 认证：否
- IP 和 UserAgent 从请求头自动提取

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| path | string | 是 | 访问路径，最多 500 字符 |
| referer | string | 否 | 来源 URL |
| stayDuration | number | 否 | 停留时长（秒），≥ 0 |

```json
{
  "path": "/articles/my-post",
  "referer": "https://google.com",
  "stayDuration": 120
}
```

### 7.2 今日统计（管理员）

- 方法：GET
- 路径：`/api/admin/stats/today`
- 认证：是（admin）

**成功响应 data**

```json
{
  "totalVisits": 256,
  "uniqueVisitors": 180,
  "avgStayDuration": 95
}
```

### 7.3 日期范围统计（管理员）

- 方法：GET
- 路径：`/api/admin/stats/range`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| startDate | query | string | 是 | 开始日期 (YYYY-MM-DD) |
| endDate | query | string | 是 | 结束日期 (YYYY-MM-DD) |

**成功响应 data**

```json
[
  { "date": "2026-04-14", "totalVisits": 200, "uniqueVisitors": 150 },
  { "date": "2026-04-15", "totalVisits": 256, "uniqueVisitors": 180 }
]
```

### 7.4 热门页面（管理员）

- 方法：GET
- 路径：`/api/admin/stats/top-pages`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| limit | query | number | 否 | 返回条数，默认 20 |
| days | query | number | 否 | 统计天数，默认 30 |

**成功响应 data**

```json
[
  { "path": "/articles/my-post", "visits": 120 },
  { "path": "/", "visits": 98 }
]
```

### 7.5 来源统计（管理员）

- 方法：GET
- 路径：`/api/admin/stats/referers`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| days | query | number | 否 | 统计天数，默认 30 |

**成功响应 data**

```json
[
  { "referer": "https://google.com", "visits": 80 },
  { "referer": "direct", "visits": 60 }
]
```

### 7.6 设备统计（管理员）

- 方法：GET
- 路径：`/api/admin/stats/devices`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| days | query | number | 否 | 统计天数，默认 30 |

**成功响应 data**

```json
{
  "devices": [
    { "name": "Desktop", "count": 500 },
    { "name": "Mobile", "count": 300 }
  ],
  "browsers": [
    { "name": "Chrome", "count": 600 },
    { "name": "Safari", "count": 200 }
  ],
  "os": [
    { "name": "Windows", "count": 400 },
    { "name": "macOS", "count": 300 }
  ]
}
```

---

## 8. 留言板

### 8.1 获取留言列表

- 方法：GET
- 路径：`/api/guestbook`
- 认证：否
- 仅返回已审核通过的留言

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| page | query | number | 否 | 页码，默认 1 |
| pageSize | query | number | 否 | 每页条数，默认 20 |

**成功响应 data**

```json
{
  "items": [
    {
      "id": "uuid",
      "nickname": "访客A",
      "website": "https://example.com",
      "avatarUrl": null,
      "content": "很棒的博客！",
      "parentId": null,
      "isAdminReply": false,
      "createdAt": "2026-04-15T15:00:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

### 8.2 提交留言

- 方法：POST
- 路径：`/api/guestbook`
- 认证：否
- 频率限制：每分钟最多 5 次
- 自动 XSS 清洗

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 是 | 昵称，1-100 字符 |
| email | string | 否 | 邮箱 |
| website | string | 否 | 网站 URL |
| content | string | 是 | 留言内容，1-2000 字符 |
| parentId | string (UUID) | 否 | 回复的留言 ID |

```json
{
  "nickname": "访客B",
  "email": "visitor@example.com",
  "content": "第一次来，留个言！",
  "parentId": null
}
```

留言提交后状态为 `pending`（待审核），需管理员审核通过后前端可见。

### 8.3 获取全部留言（管理员）

- 方法：GET
- 路径：`/api/admin/guestbook`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| page | query | number | 否 | 页码，默认 1 |
| pageSize | query | number | 否 | 每页条数，默认 20 |
| status | query | string | 否 | 筛选状态：pending / approved / rejected |

### 8.4 审核留言（管理员）

- 方法：PUT
- 路径：`/api/admin/guestbook/:id/status`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| id | path | string (UUID) | 是 | 留言 ID |

**请求参数**

```json
{
  "status": "approved"
}
```

status 可选值：`approved`、`rejected`

### 8.5 管理员回复留言

- 方法：POST
- 路径：`/api/admin/guestbook/:id/reply`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| id | path | string (UUID) | 是 | 留言 ID |

**请求参数**

```json
{
  "content": "感谢留言！"
}
```

### 8.6 删除留言（管理员）

- 方法：DELETE
- 路径：`/api/admin/guestbook/:id`
- 认证：是（admin）

---

## 9. 友情链接

### 9.1 获取友链列表

- 方法：GET
- 路径：`/api/friend-links`
- 认证：否
- 仅返回已审核通过的友链，按 sortOrder 排序

**成功响应 data**

```json
[
  {
    "id": "uuid",
    "siteName": "示例站点",
    "siteUrl": "https://example.com",
    "logoUrl": "https://example.com/logo.png",
    "description": "一个技术博客"
  }
]
```

### 9.2 申请友链

- 方法：POST
- 路径：`/api/friend-links/apply`
- 认证：否
- 频率限制：每分钟最多 3 次
- 自动 XSS 清洗

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| siteName | string | 是 | 站点名称，1-100 字符 |
| siteUrl | string | 是 | 站点 URL |
| logoUrl | string | 否 | Logo URL |
| description | string | 否 | 站点描述，最多 255 字符 |
| contactEmail | string | 否 | 联系邮箱 |
| applicantName | string | 否 | 申请人姓名 |

```json
{
  "siteName": "我的博客",
  "siteUrl": "https://myblog.com",
  "logoUrl": "https://myblog.com/logo.png",
  "description": "专注前端开发",
  "contactEmail": "admin@myblog.com"
}
```

申请后状态为 `pending`（待审核），需管理员审核。

### 9.3 获取全部友链（管理员）

- 方法：GET
- 路径：`/api/admin/friend-links`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| status | query | string | 否 | 筛选状态：pending / approved / rejected / offline |

### 9.4 审核友链（管理员）

- 方法：PUT
- 路径：`/api/admin/friend-links/:id/review`
- 认证：是（admin）

**请求参数**

```json
{
  "status": "approved"
}
```

status 可选值：`approved`、`rejected`

### 9.5 更新友链信息（管理员）

- 方法：PUT
- 路径：`/api/admin/friend-links/:id`
- 认证：是（admin）

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| siteName | string | 否 | 站点名称 |
| siteUrl | string | 否 | 站点 URL |
| logoUrl | string | 否 | Logo URL |
| description | string | 否 | 描述 |
| contactEmail | string | 否 | 联系邮箱 |
| sortOrder | number | 否 | 排序权重 |
| status | string | 否 | 状态：pending / approved / rejected / offline |

### 9.6 删除友链（管理员）

- 方法：DELETE
- 路径：`/api/admin/friend-links/:id`
- 认证：是（admin）

---

## 10. 公告栏

### 10.1 获取公告列表

- 方法：GET
- 路径：`/api/announcements`
- 认证：否
- 仅返回已发布的公告，按发布时间倒序

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| page | query | number | 否 | 页码，默认 1 |
| pageSize | query | number | 否 | 每页条数，默认 10 |

**成功响应 data**

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "系统维护通知",
      "content": "系统将于今晚维护...",
      "isPinned": true,
      "publishedAt": "2026-04-15T15:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 10
}
```

### 10.2 获取置顶公告

- 方法：GET
- 路径：`/api/announcements/pinned`
- 认证：否

**成功响应 data**: 最新一条置顶公告对象，无则返回 `null`

### 10.3 获取全部公告（管理员）

- 方法：GET
- 路径：`/api/admin/announcements`
- 认证：是（admin）

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| page | query | number | 否 | 页码，默认 1 |
| pageSize | query | number | 否 | 每页条数，默认 20 |

### 10.4 创建公告（管理员）

- 方法：POST
- 路径：`/api/admin/announcements`
- 认证：是（admin）

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 标题，1-255 字符 |
| content | string | 是 | 内容 |
| status | string | 否 | 状态：draft / published，默认 draft |
| isPinned | boolean | 否 | 是否置顶，默认 false |

```json
{
  "title": "新功能上线",
  "content": "博客新增收藏和通知功能！",
  "status": "published",
  "isPinned": true
}
```

### 10.5 更新公告（管理员）

- 方法：PUT
- 路径：`/api/admin/announcements/:id`
- 认证：是（admin）

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 标题 |
| content | string | 否 | 内容 |
| status | string | 否 | 状态：draft / published / archived |
| isPinned | boolean | 否 | 是否置顶 |

### 10.6 删除公告（管理员）

- 方法：DELETE
- 路径：`/api/admin/announcements/:id`
- 认证：是（admin）

---

## 数据库实体汇总

本次新增 5 个实体：

| 实体 | 表名 | 字段数 | 核心索引 |
|------|------|--------|---------|
| Favorite | favorites | 4 | (user_id, article_id) UNIQUE |
| VisitorLog | visitor_logs | 13 | visit_date, (ip, visit_date), path |
| Guestbook | guestbook | 11 | (status, created_at) |
| Announcement | announcements | 9 | (status, is_pinned, published_at) |
| UserNotification | user_notifications | 10 | (user_id, is_read, created_at), type |

## 安全措施

- **Helmet**: 全局启用，设置安全 HTTP 头
- **速率限制**: ThrottlerGuard 全局启用 (默认 120次/分钟)，敏感接口自定义限流
- **XSS 防护**: 留言板和友链申请使用 SanitizePipe 清洗输入
- **输入验证**: ValidationPipe 全局启用 (whitelist + forbidNonWhitelisted + transform)
- **SQL 注入": TypeORM 参数化查询
- **CORS**: 基于配置的白名单
- **JWT 认证**: Passport + JWT Strategy
- **角色鉴权**: RolesGuard 基于权重的角色比较

## 端点统计

| 分类 | 公开接口 | 登录接口 | 管理员接口 | 合计 |
|------|---------|---------|-----------|------|
| SEO | 4 | 0 | 0 | 4 |
| 备份 | 0 | 0 | 5 | 5 |
| i18n | 3 | 0 | 1 | 4 |
| 用户中心 | 0 | 4 | 0 | 4 |
| 收藏 | 0 | 4 | 0 | 4 |
| 通知 | 0 | 5 | 1 | 6 |
| 访客统计 | 1 | 0 | 5 | 6 |
| 留言板 | 2 | 0 | 4 | 6 |
| 友链 | 2 | 0 | 4 | 6 |
| 公告 | 2 | 0 | 4 | 6 |
| **合计** | **14** | **13** | **24** | **51** |
