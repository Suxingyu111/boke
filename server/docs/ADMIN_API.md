# 后台管理 API 文档

> 本文档覆盖需求文档「3. 后台管理」的三项功能：管理员登录、基础数据统计、系统基础设置。

## 通用说明

### 基础路径
```
http://localhost:3000/api
```

### 统一响应格式
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "message": "Success",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

### 认证方式
管理接口需在请求头携带 JWT：
```
Authorization: Bearer <accessToken>
```

---

## 一、管理员登录（已有模块）

### 1.1 管理员登录

**POST** `/api/auth/login`

**限速**：5 次 / 60 秒

**请求体**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| account | string | ✅ | 用户名或邮箱，3-255 字符 |
| password | string | ✅ | 密码，8-64 字符 |

**请求示例**
```json
{
  "account": "admin",
  "password": "Admin1234"
}
```

**响应示例**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "accessToken": "<access-token>",
    "tokenType": "Bearer",
    "expiresIn": "7d",
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "nickname": "管理员",
      "avatar": null,
      "bio": null,
      "role": "admin",
      "isActive": true,
      "lastLoginAt": "2026-04-16T12:00:00.000Z",
      "createdAt": "2026-04-14T00:00:00.000Z"
    }
  }
}
```

### 1.2 获取当前管理员信息

**GET** `/api/auth/admin/me`

**认证**：需要 JWT，角色 ≥ admin

**响应示例**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "nickname": "管理员",
    "role": "admin",
    "isActive": true,
    "lastLoginAt": "2026-04-16T12:00:00.000Z"
  }
}
```

---

## 二、基础数据统计

### 2.1 获取仪表盘统计数据

**GET** `/api/admin/dashboard/stats`

**认证**：需要 JWT，角色 ≥ admin

**响应示例**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "articleCount": 42,
    "totalViewCount": 12580,
    "totalCommentCount": 156,
    "categoryCount": 8,
    "tagCount": 25,
    "draftCount": 5,
    "publishedCount": 35,
    "pageCount": 3,
    "friendLinkCount": 12
  }
}
```

**字段说明**
| 字段 | 类型 | 说明 |
|------|------|------|
| articleCount | number | 文章总数（不含已删除） |
| totalViewCount | number | 所有文章总阅读量 |
| totalCommentCount | number | 所有文章总评论数 |
| categoryCount | number | 分类总数 |
| tagCount | number | 标签总数 |
| draftCount | number | 草稿数 |
| publishedCount | number | 已发布文章数 |
| pageCount | number | 独立页面总数 |
| friendLinkCount | number | 友情链接总数 |

### 2.2 获取最近文章

**GET** `/api/admin/dashboard/recent-articles`

**认证**：需要 JWT，角色 ≥ admin

**查询参数**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | number | 否 | 10 | 返回条数，1-50 |

**响应示例**
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "uuid",
      "title": "NestJS 最佳实践",
      "slug": "nestjs-best-practices",
      "status": "published",
      "viewCount": 320,
      "commentCount": 12,
      "publishedAt": "2026-04-15T10:00:00.000Z",
      "createdAt": "2026-04-14T08:00:00.000Z"
    }
  ]
}
```

---

## 三、系统基础设置

### 3.1 获取公开站点设置（无需认证）

**GET** `/api/settings`

**说明**：仅返回 `is_public = true` 的设置项，供前端页面渲染使用（博客标题、副标题、备案号等）。

当公开设置中存在 `social_` 前缀键或 `group = social` 的配置时，响应会额外返回 `socialLinks` 聚合字段，便于前端页脚直接渲染社交链接。

**响应示例**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "site_title": "我的博客",
    "site_subtitle": "记录技术与生活",
    "site_description": "一个专注于 Web 技术的个人博客",
    "site_icp": "京ICP备XXXXXXXX号",
    "social_github": "https://github.com/example",
    "socialLinks": {
      "github": "https://github.com/example"
    }
  }
}
```

### 3.2 获取全部设置（管理员）

**GET** `/api/admin/settings`

**认证**：需要 JWT，角色 ≥ admin

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| group | string | 否 | 按分组筛选，如 `general`、`seo`、`social` |

**响应示例**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "site_title": "我的博客",
    "site_subtitle": "记录技术与生活",
    "site_description": "一个专注于 Web 技术的个人博客",
    "site_icp": "京ICP备XXXXXXXX号",
    "admin_email": "admin@example.com",
    "comment_moderation": true
  }
}
```

### 3.3 获取单个设置项（管理员）

**GET** `/api/admin/settings/:key`

**认证**：需要 JWT，角色 ≥ admin

**路径参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| key | string | 设置项的 key |

**响应示例**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": 1,
    "settingKey": "site_title",
    "settingValue": "我的博客",
    "valueType": "string",
    "groupName": "general",
    "description": "站点标题",
    "isPublic": true,
    "createdAt": "2026-04-14T00:00:00.000Z",
    "updatedAt": "2026-04-16T12:00:00.000Z"
  }
}
```

### 3.4 新增或更新单个设置项（管理员）

**PUT** `/api/admin/settings`

**认证**：需要 JWT，角色 ≥ admin

**请求体**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| settingKey | string | ✅ | 设置项 key，最长 100 字符 |
| settingValue | any | ✅ | 设置项的值 |
| valueType | string | 否 | 值类型：`string` / `number` / `boolean` / `json`，默认 `string` |
| groupName | string | 否 | 分组名，最长 50 字符，默认 `general` |
| description | string | 否 | 描述，最长 255 字符 |
| isPublic | boolean | 否 | 是否公开给前端，默认 `false` |

**请求示例**
```json
{
  "settingKey": "site_title",
  "settingValue": "我的博客",
  "valueType": "string",
  "groupName": "general",
  "description": "站点标题",
  "isPublic": true
}
```

**响应**：返回完整的设置项对象（同 3.3）。

### 3.5 批量新增或更新设置项（管理员）

**PUT** `/api/admin/settings/batch`

**认证**：需要 JWT，角色 ≥ admin

**请求体**
```json
{
  "settings": [
    {
      "settingKey": "site_title",
      "settingValue": "我的博客",
      "valueType": "string",
      "groupName": "general",
      "isPublic": true
    },
    {
      "settingKey": "site_subtitle",
      "settingValue": "记录技术与生活",
      "valueType": "string",
      "groupName": "general",
      "isPublic": true
    },
    {
      "settingKey": "site_description",
      "settingValue": "一个专注于 Web 技术的个人博客",
      "valueType": "string",
      "groupName": "general",
      "isPublic": true
    },
    {
      "settingKey": "site_icp",
      "settingValue": "京ICP备XXXXXXXX号",
      "valueType": "string",
      "groupName": "general",
      "isPublic": true
    }
  ]
}
```

**响应示例**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "site_title": "我的博客",
    "site_subtitle": "记录技术与生活",
    "site_description": "一个专注于 Web 技术的个人博客",
    "site_icp": "京ICP备XXXXXXXX号"
  }
}
```

### 3.6 删除设置项（管理员）

**DELETE** `/api/admin/settings/:key`

**认证**：需要 JWT，角色 ≥ admin

**路径参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| key | string | 设置项的 key |

**响应示例**
```json
{
  "success": true,
  "statusCode": 200,
  "data": null,
  "message": "Success"
}
```

---

## 错误响应

### 401 未认证
```json
{
  "success": false,
  "statusCode": 401,
  "message": "未登录或登录已过期",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

### 403 无权限
```json
{
  "success": false,
  "statusCode": 403,
  "message": "无权访问后台资源",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

### 404 设置项不存在
```json
{
  "success": false,
  "statusCode": 404,
  "message": "设置项 \"xxx\" 不存在",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

### 429 请求过于频繁
```json
{
  "success": false,
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "timestamp": "2026-04-16T12:00:00.000Z"
}
```

---

## 常用设置 Key 建议

| settingKey | 说明 | valueType | groupName | isPublic |
|------------|------|-----------|-----------|----------|
| site_title | 博客标题 | string | general | true |
| site_subtitle | 博客副标题 | string | general | true |
| site_description | 站点描述 | string | general | true |
| site_icp | 备案信息 | string | general | true |
| site_logo | 站点 Logo URL | string | general | true |
| site_favicon | Favicon URL | string | general | true |
| admin_email | 管理员邮箱 | string | general | false |
| comment_moderation | 评论需审核 | boolean | comment | false |
| footer_links | 页脚链接 | json | general | true |
