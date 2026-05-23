# Auth 接口文档

本文档基于当前后端实现整理，用于前后端联调。

## 基础信息

- 接口前缀：/api
- 认证方式：Bearer Token
- 内容类型：application/json
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
  "timestamp": "2026-04-15T15:00:00.000Z"
}
```

### 失败响应

```json
{
  "success": false,
  "statusCode": 401,
  "message": "账号或密码错误",
  "errors": "Unauthorized",
  "timestamp": "2026-04-15T15:00:00.000Z"
}
```

## 用户对象说明

认证相关接口返回的用户对象结构如下：

```json
{
  "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
  "username": "new_user",
  "email": "new-user@example.com",
  "nickname": "新用户",
  "avatar": null,
  "bio": null,
  "isActive": true,
  "role": "user",
  "lastLoginAt": "2026-04-15T15:10:00.000Z",
  "createdAt": "2026-04-15T15:00:00.000Z",
  "updatedAt": "2026-04-15T15:10:00.000Z"
}
```

字段说明：

- role 可选值：super_admin、admin、author、user
- isActive 为 false 时，用户登录后再次访问受保护接口会被拒绝
- password 不会在任何响应中返回

## 1. 用户注册

- 方法：POST
- 路径：/api/auth/register
- 是否需要登录：否
- 频率限制：每分钟最多 3 次

### 请求参数

```json
{
  "username": "new_user",
  "email": "new-user@example.com",
  "password": "SecurePass123",
  "nickname": "新用户"
}
```

### 字段校验

- username：必填，3 到 50 位，只能包含字母、数字、下划线
- email：必填，邮箱格式
- password：必填，8 到 64 位，必须同时包含字母和数字
- nickname：选填，2 到 100 位

### 成功响应

- 状态码：201

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Success",
  "data": {
    "accessToken": "jwt-token",
    "tokenType": "Bearer",
    "expiresIn": "7d",
    "user": {
      "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
      "username": "new_user",
      "email": "new-user@example.com",
      "nickname": "新用户",
      "avatar": null,
      "bio": null,
      "isActive": true,
      "role": "user",
      "lastLoginAt": null,
      "createdAt": "2026-04-15T15:00:00.000Z",
      "updatedAt": "2026-04-15T15:00:00.000Z"
    }
  },
  "timestamp": "2026-04-15T15:00:00.000Z"
}
```

### 常见失败响应

#### 注册信息重复

- 状态码：409

```json
{
  "success": false,
  "statusCode": 409,
  "message": "注册失败，请更换注册信息后重试",
  "errors": "Conflict",
  "timestamp": "2026-04-15T15:00:00.000Z"
}
```

#### 参数校验失败

- 状态码：400

```json
{
  "success": false,
  "statusCode": 400,
  "message": "密码必须包含字母和数字",
  "errors": "Bad Request",
  "timestamp": "2026-04-15T15:00:00.000Z"
}
```

## 2. 用户登录

- 方法：POST
- 路径：/api/auth/login
- 是否需要登录：否
- 频率限制：每分钟最多 5 次

### 请求参数

```json
{
  "account": "new-user@example.com",
  "password": "SecurePass123"
}
```

### 字段说明

- account：必填，可传邮箱或用户名
- password：必填，8 到 64 位

### 登录规则

- 邮箱登录按小写进行匹配，大小写不敏感
- 用户名登录按原值匹配，当前实现大小写敏感
- 登录成功后会更新 lastLoginAt

### 成功响应

- 状态码：200

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "accessToken": "jwt-token",
    "tokenType": "Bearer",
    "expiresIn": "7d",
    "user": {
      "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
      "username": "new_user",
      "email": "new-user@example.com",
      "nickname": "新用户",
      "avatar": null,
      "bio": null,
      "isActive": true,
      "role": "user",
      "lastLoginAt": "2026-04-15T15:10:00.000Z",
      "createdAt": "2026-04-15T15:00:00.000Z",
      "updatedAt": "2026-04-15T15:10:00.000Z"
    }
  },
  "timestamp": "2026-04-15T15:10:00.000Z"
}
```

### 常见失败响应

#### 账号或密码错误

- 状态码：401

```json
{
  "success": false,
  "statusCode": 401,
  "message": "账号或密码错误",
  "errors": "Unauthorized",
  "timestamp": "2026-04-15T15:10:00.000Z"
}
```

#### 账号已禁用

- 状态码：403

```json
{
  "success": false,
  "statusCode": 403,
  "message": "账号已被禁用",
  "errors": "Forbidden",
  "timestamp": "2026-04-15T15:10:00.000Z"
}
```

## 3. 获取当前登录用户

- 方法：GET
- 路径：/api/auth/me
- 是否需要登录：是
- 频率限制：每分钟最多 5 次

### 请求头

```http
Authorization: Bearer jwt-token
```

### 成功响应

- 状态码：200

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "id": "f9d3c1ef-35d2-46d8-9ef3-31e0d3e31e01",
    "username": "new_user",
    "email": "new-user@example.com",
    "nickname": "新用户",
    "avatar": null,
    "bio": null,
    "isActive": true,
    "role": "user",
    "lastLoginAt": "2026-04-15T15:10:00.000Z",
    "createdAt": "2026-04-15T15:00:00.000Z",
    "updatedAt": "2026-04-15T15:10:00.000Z"
  },
  "timestamp": "2026-04-15T15:12:00.000Z"
}
```

### 常见失败响应

#### 未登录或 token 无效

- 状态码：401

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized",
  "errors": "Unauthorized",
  "timestamp": "2026-04-15T15:12:00.000Z"
}
```

#### 用户已被禁用

- 状态码：403

```json
{
  "success": false,
  "statusCode": 403,
  "message": "账号已被禁用",
  "errors": "Forbidden",
  "timestamp": "2026-04-15T15:12:00.000Z"
}
```

## 4. 获取后台当前用户

- 方法：GET
- 路径：/api/auth/admin/me
- 是否需要登录：是
- 频率限制：每分钟最多 5 次
- 角色要求：admin 或 super_admin

### 请求头

```http
Authorization: Bearer jwt-token
```

### 成功响应

- 状态码：200
- 响应结构与 /api/auth/me 相同

### 常见失败响应

#### 角色不足

- 状态码：403

```json
{
  "success": false,
  "statusCode": 403,
  "message": "无权访问后台资源",
  "errors": "Forbidden",
  "timestamp": "2026-04-15T15:15:00.000Z"
}
```

## 前端对接建议

### 1. token 存储

- 登录或注册成功后，取 data.accessToken 作为登录态凭证
- 请求受保护接口时，在请求头中携带 Bearer Token

### 2. 推荐的状态处理

- 200 或 201：按 success 为 true 正常取 data
- 400：表单参数校验失败，直接展示 message
- 401：登录态失效，前端清空本地 token 并跳转登录页
- 403：无权限或用户已禁用，展示 message
- 409：注册信息冲突，展示 message
- 429：请求过于频繁，提示稍后重试

### 3. Axios 请求头示例

```ts
headers: {
  Authorization: `Bearer ${token}`,
}
```

## 联调示例

### 注册

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new_user",
    "email": "new-user@example.com",
    "password": "SecurePass123",
    "nickname": "新用户"
  }'
```

### 登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "account": "new-user@example.com",
    "password": "SecurePass123"
  }'
```

### 获取当前用户

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <access-token>"
```
