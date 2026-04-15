# 博客系统 MySQL 数据库设计

## 1. 设计目标

本文档基于需求文档中的核心必备、推荐实现和高级扩展功能，输出可直接落地到 MySQL 8.0 的数据库表结构设计。设计目标如下：

- 支撑个人博客系统 MVP 的文章、分类、标签、页面、评论、友链、后台管理与站点设置。
- 为后续二期功能预留扩展能力，例如版本历史、媒体库、操作日志、系列文章、邮件订阅、公告栏。
- 与当前 NestJS + TypeORM 项目保持一致，主键统一采用 UUID，字符集统一采用 utf8mb4。

## 2. 基础规范

### 2.1 数据库规范

- 数据库版本：MySQL 8.0+
- 存储引擎：InnoDB
- 字符集：utf8mb4
- 排序规则：utf8mb4_unicode_ci
- 主键类型：CHAR(36)
- 时间字段：优先使用 DATETIME，创建时间与更新时间统一为 created_at、updated_at
- 布尔字段：使用 TINYINT(1)
- 逻辑删除：仅对需要保留审计痕迹的表使用 deleted_at

### 2.2 命名规范

- 表名使用复数蛇形命名，例如 articles、article_tags
- 唯一标识字段统一为 id
- 外键字段格式统一为 xxx_id
- 排序字段统一为 sort_order
- 状态字段统一为 status

## 3. 分阶段建表建议

### 3.1 一期必须落地

1. users
2. categories
3. tags
4. articles
5. article_tags
6. pages
7. friend_links
8. comments
9. site_settings

### 3.2 二期推荐扩展

1. article_versions
2. media_assets
3. operation_logs
4. article_series
5. article_series_items
6. email_subscribers
7. notices

### 3.3 三期社区扩展

1. user_favorites
2. notifications

## 4. 实体关系总览

- 一个用户可以发布多篇文章。
- 一篇文章只能属于一个分类。
- 一篇文章可以绑定多个标签，标签与文章为多对多关系。
- 一篇文章可以有多条评论，评论支持父子回复。
- 页面用于“关于我”和自定义独立页面。
- 友情链接独立建表，支持审核、排序、上下线。
- 站点基础设置使用 key-value 表，便于后台灵活扩展。
- 文章版本、媒体库、操作日志为后台增强能力。

## 5. 核心表结构

### 5.1 用户表 users

用途：后台管理员登录、扩展多作者能力、后续支持普通用户注册。

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | 用户 ID，UUID |
| username | VARCHAR(50) | NOT NULL, UNIQUE | 登录名 |
| email | VARCHAR(255) | NOT NULL, UNIQUE | 邮箱 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希 |
| nickname | VARCHAR(100) | NULL | 昵称 |
| avatar_url | VARCHAR(500) | NULL | 头像地址 |
| bio | TEXT | NULL | 个人简介 |
| role | ENUM('super_admin','admin','author','user') | NOT NULL DEFAULT 'admin' | 角色 |
| status | ENUM('active','disabled') | NOT NULL DEFAULT 'active' | 用户状态 |
| last_login_at | DATETIME | NULL | 最后登录时间 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

索引设计：

- UNIQUE idx_users_username (username)
- UNIQUE idx_users_email (email)
- INDEX idx_users_role_status (role, status)

```sql
CREATE TABLE users (
  id CHAR(36) NOT NULL,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100) DEFAULT NULL,
  avatar_url VARCHAR(500) DEFAULT NULL,
  bio TEXT,
  role ENUM('super_admin', 'admin', 'author', 'user') NOT NULL DEFAULT 'admin',
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  last_login_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_users_username (username),
  UNIQUE KEY idx_users_email (email),
  KEY idx_users_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.2 分类表 categories

用途：文章单分类归属、前台分类页展示。

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | 分类 ID |
| name | VARCHAR(100) | NOT NULL | 分类名称 |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | URL 别名 |
| description | TEXT | NULL | 分类描述 |
| color | VARCHAR(20) | NOT NULL DEFAULT '#000000' | 分类色值 |
| sort_order | INT | NOT NULL DEFAULT 0 | 排序值 |
| article_count | INT | NOT NULL DEFAULT 0 | 文章数量缓存 |
| is_visible | TINYINT(1) | NOT NULL DEFAULT 1 | 是否显示 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

索引设计：

- UNIQUE idx_categories_slug (slug)
- INDEX idx_categories_visible_sort (is_visible, sort_order)

```sql
CREATE TABLE categories (
  id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20) NOT NULL DEFAULT '#000000',
  sort_order INT NOT NULL DEFAULT 0,
  article_count INT NOT NULL DEFAULT 0,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_categories_slug (slug),
  KEY idx_categories_visible_sort (is_visible, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.3 标签表 tags

用途：文章标签与标签云。

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | 标签 ID |
| name | VARCHAR(50) | NOT NULL | 标签名称 |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | URL 别名 |
| article_count | INT | NOT NULL DEFAULT 0 | 文章数量缓存 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

索引设计：

- UNIQUE idx_tags_slug (slug)

```sql
CREATE TABLE tags (
  id CHAR(36) NOT NULL,
  name VARCHAR(50) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  article_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_tags_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.4 文章表 articles

用途：支撑文章发布、草稿、定时发布、摘要、封面、置顶、SEO 与阅读统计。

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | 文章 ID |
| title | VARCHAR(255) | NOT NULL | 标题 |
| slug | VARCHAR(255) | NOT NULL, UNIQUE | URL 别名 |
| summary | TEXT | NULL | 摘要 |
| content_markdown | LONGTEXT | NOT NULL | Markdown 正文 |
| content_html | LONGTEXT | NULL | 渲染后的 HTML，可做缓存 |
| cover_image_url | VARCHAR(500) | NULL | 封面图 |
| category_id | CHAR(36) | NOT NULL, FK | 所属分类 |
| author_id | CHAR(36) | NOT NULL, FK | 作者 |
| status | ENUM('draft','scheduled','published','archived') | NOT NULL DEFAULT 'draft' | 文章状态 |
| visibility | ENUM('public','private','password') | NOT NULL DEFAULT 'public' | 可见性 |
| allow_comment | TINYINT(1) | NOT NULL DEFAULT 1 | 是否允许评论 |
| is_top | TINYINT(1) | NOT NULL DEFAULT 0 | 是否置顶 |
| sort_order | INT | NOT NULL DEFAULT 0 | 首页排序补充字段 |
| view_count | INT | NOT NULL DEFAULT 0 | 阅读量 |
| like_count | INT | NOT NULL DEFAULT 0 | 点赞数 |
| comment_count | INT | NOT NULL DEFAULT 0 | 评论数缓存 |
| seo_title | VARCHAR(255) | NULL | SEO 标题 |
| seo_description | VARCHAR(500) | NULL | SEO 描述 |
| seo_keywords | VARCHAR(255) | NULL | SEO 关键词 |
| scheduled_at | DATETIME | NULL | 定时发布时间 |
| published_at | DATETIME | NULL | 实际发布时间 |
| deleted_at | DATETIME | NULL | 逻辑删除时间 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

索引设计：

- UNIQUE idx_articles_slug (slug)
- INDEX idx_articles_category_status (category_id, status)
- INDEX idx_articles_author_status (author_id, status)
- INDEX idx_articles_publish_sort (is_top, published_at)
- INDEX idx_articles_scheduled_at (scheduled_at)
- FULLTEXT idx_articles_search (title, summary, content_markdown)

```sql
CREATE TABLE articles (
  id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  summary TEXT,
  content_markdown LONGTEXT NOT NULL,
  content_html LONGTEXT,
  cover_image_url VARCHAR(500) DEFAULT NULL,
  category_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  status ENUM('draft', 'scheduled', 'published', 'archived') NOT NULL DEFAULT 'draft',
  visibility ENUM('public', 'private', 'password') NOT NULL DEFAULT 'public',
  allow_comment TINYINT(1) NOT NULL DEFAULT 1,
  is_top TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  view_count INT NOT NULL DEFAULT 0,
  like_count INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  seo_title VARCHAR(255) DEFAULT NULL,
  seo_description VARCHAR(500) DEFAULT NULL,
  seo_keywords VARCHAR(255) DEFAULT NULL,
  scheduled_at DATETIME DEFAULT NULL,
  published_at DATETIME DEFAULT NULL,
  deleted_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_articles_slug (slug),
  KEY idx_articles_category_status (category_id, status),
  KEY idx_articles_author_status (author_id, status),
  KEY idx_articles_publish_sort (is_top, published_at),
  KEY idx_articles_scheduled_at (scheduled_at),
  CONSTRAINT fk_articles_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT fk_articles_author FOREIGN KEY (author_id) REFERENCES users (id),
  FULLTEXT KEY idx_articles_search (title, summary, content_markdown)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.5 文章标签关联表 article_tags

用途：实现文章与标签多对多关系。

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| article_id | CHAR(36) | PK, FK | 文章 ID |
| tag_id | CHAR(36) | PK, FK | 标签 ID |
| created_at | DATETIME | NOT NULL | 创建时间 |

索引设计：

- PRIMARY KEY (article_id, tag_id)
- INDEX idx_article_tags_tag_id (tag_id)

```sql
CREATE TABLE article_tags (
  article_id CHAR(36) NOT NULL,
  tag_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (article_id, tag_id),
  KEY idx_article_tags_tag_id (tag_id),
  CONSTRAINT fk_article_tags_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
  CONSTRAINT fk_article_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.6 页面表 pages

用途：关于我页面、独立自定义页面、作品集页面等。

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | 页面 ID |
| title | VARCHAR(255) | NOT NULL | 页面标题 |
| slug | VARCHAR(255) | NOT NULL, UNIQUE | 页面别名 |
| page_type | ENUM('about','custom','resume','portfolio') | NOT NULL DEFAULT 'custom' | 页面类型 |
| content_markdown | LONGTEXT | NOT NULL | 页面正文 |
| content_html | LONGTEXT | NULL | 页面 HTML 缓存 |
| summary | VARCHAR(500) | NULL | 页面简介 |
| is_home_visible | TINYINT(1) | NOT NULL DEFAULT 0 | 是否在导航显示 |
| status | ENUM('draft','published') | NOT NULL DEFAULT 'draft' | 页面状态 |
| seo_title | VARCHAR(255) | NULL | SEO 标题 |
| seo_description | VARCHAR(500) | NULL | SEO 描述 |
| published_at | DATETIME | NULL | 发布时间 |
| created_by | CHAR(36) | NOT NULL, FK | 创建人 |
| updated_by | CHAR(36) | NULL, FK | 更新人 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

索引设计：

- UNIQUE idx_pages_slug (slug)
- INDEX idx_pages_type_status (page_type, status)
- INDEX idx_pages_nav_status (is_home_visible, status)

```sql
CREATE TABLE pages (
  id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  page_type ENUM('about', 'custom', 'resume', 'portfolio') NOT NULL DEFAULT 'custom',
  content_markdown LONGTEXT NOT NULL,
  content_html LONGTEXT,
  summary VARCHAR(500) DEFAULT NULL,
  is_home_visible TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  seo_title VARCHAR(255) DEFAULT NULL,
  seo_description VARCHAR(500) DEFAULT NULL,
  published_at DATETIME DEFAULT NULL,
  created_by CHAR(36) NOT NULL,
  updated_by CHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_pages_slug (slug),
  KEY idx_pages_type_status (page_type, status),
  KEY idx_pages_nav_status (is_home_visible, status),
  CONSTRAINT fk_pages_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_pages_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.7 友情链接表 friend_links

用途：友情链接展示、友链申请、审核与排序。

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | 友链 ID |
| site_name | VARCHAR(100) | NOT NULL | 网站名称 |
| site_url | VARCHAR(255) | NOT NULL | 网站地址 |
| logo_url | VARCHAR(500) | NULL | Logo |
| description | VARCHAR(255) | NULL | 站点描述 |
| contact_email | VARCHAR(255) | NULL | 联系邮箱 |
| applicant_name | VARCHAR(100) | NULL | 申请人 |
| sort_order | INT | NOT NULL DEFAULT 0 | 排序 |
| status | ENUM('pending','approved','rejected','offline') | NOT NULL DEFAULT 'approved' | 审核状态 |
| approved_at | DATETIME | NULL | 审核时间 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

索引设计：

- INDEX idx_friend_links_status_sort (status, sort_order)

```sql
CREATE TABLE friend_links (
  id CHAR(36) NOT NULL,
  site_name VARCHAR(100) NOT NULL,
  site_url VARCHAR(255) NOT NULL,
  logo_url VARCHAR(500) DEFAULT NULL,
  description VARCHAR(255) DEFAULT NULL,
  contact_email VARCHAR(255) DEFAULT NULL,
  applicant_name VARCHAR(100) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'rejected', 'offline') NOT NULL DEFAULT 'approved',
  approved_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_friend_links_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.8 评论表 comments

用途：游客评论、登录评论、评论回复、评论审核。

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | CHAR(36) | PK | 评论 ID |
| article_id | CHAR(36) | NOT NULL, FK | 所属文章 |
| parent_id | CHAR(36) | NULL, FK | 父评论 ID |
| user_id | CHAR(36) | NULL, FK | 登录用户 ID |
| author_name | VARCHAR(100) | NOT NULL | 评论者名称 |
| author_email | VARCHAR(255) | NOT NULL | 评论者邮箱 |
| author_website | VARCHAR(255) | NULL | 评论者网站 |
| content | TEXT | NOT NULL | 评论内容 |
| ip_address | VARCHAR(45) | NULL | IP 地址 |
| user_agent | VARCHAR(500) | NULL | UA 信息 |
| like_count | INT | NOT NULL DEFAULT 0 | 点赞数 |
| status | ENUM('pending','approved','spam','rejected') | NOT NULL DEFAULT 'pending' | 审核状态 |
| replied_at | DATETIME | NULL | 管理员回复时间 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |
| deleted_at | DATETIME | NULL | 逻辑删除时间 |

索引设计：

- INDEX idx_comments_article_status_created (article_id, status, created_at)
- INDEX idx_comments_parent_id (parent_id)
- INDEX idx_comments_user_id (user_id)
- INDEX idx_comments_author_email (author_email)

```sql
CREATE TABLE comments (
  id CHAR(36) NOT NULL,
  article_id CHAR(36) NOT NULL,
  parent_id CHAR(36) DEFAULT NULL,
  user_id CHAR(36) DEFAULT NULL,
  author_name VARCHAR(100) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  author_website VARCHAR(255) DEFAULT NULL,
  content TEXT NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  like_count INT NOT NULL DEFAULT 0,
  status ENUM('pending', 'approved', 'spam', 'rejected') NOT NULL DEFAULT 'pending',
  replied_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_comments_article_status_created (article_id, status, created_at),
  KEY idx_comments_parent_id (parent_id),
  KEY idx_comments_user_id (user_id),
  KEY idx_comments_author_email (author_email),
  CONSTRAINT fk_comments_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5.9 站点设置表 site_settings

用途：博客标题、副标题、站点描述、备案信息、社交链接、主题开关等。

| 字段名 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 自增主键 |
| setting_key | VARCHAR(100) | NOT NULL, UNIQUE | 配置键 |
| setting_value | JSON | NOT NULL | 配置值 |
| value_type | ENUM('string','number','boolean','json') | NOT NULL DEFAULT 'string' | 值类型 |
| group_name | VARCHAR(50) | NOT NULL DEFAULT 'general' | 配置分组 |
| description | VARCHAR(255) | NULL | 配置说明 |
| is_public | TINYINT(1) | NOT NULL DEFAULT 0 | 是否前台可读 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

推荐初始化键：

- blog_title
- blog_subtitle
- site_description
- site_keywords
- icp_number
- footer_copyright
- social_links
- comment_audit_required
- theme_mode

```sql
CREATE TABLE site_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSON NOT NULL,
  value_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
  group_name VARCHAR(50) NOT NULL DEFAULT 'general',
  description VARCHAR(255) DEFAULT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_site_settings_key (setting_key),
  KEY idx_site_settings_group (group_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 6. 增强扩展表结构

### 6.1 文章版本表 article_versions

用途：保存文章版本历史，支持回滚。

关键字段：

- article_id：所属文章
- version_no：版本号，从 1 递增
- title、summary、content_markdown、content_html：版本快照
- operator_id：操作人
- change_note：变更说明

```sql
CREATE TABLE article_versions (
  id CHAR(36) NOT NULL,
  article_id CHAR(36) NOT NULL,
  version_no INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  content_markdown LONGTEXT NOT NULL,
  content_html LONGTEXT,
  operator_id CHAR(36) DEFAULT NULL,
  change_note VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_article_versions_article_version (article_id, version_no),
  KEY idx_article_versions_operator (operator_id),
  CONSTRAINT fk_article_versions_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
  CONSTRAINT fk_article_versions_operator FOREIGN KEY (operator_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6.2 媒体资源表 media_assets

用途：图片上传、媒体库、资源复用。

```sql
CREATE TABLE media_assets (
  id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_ext VARCHAR(20) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  width INT DEFAULT NULL,
  height INT DEFAULT NULL,
  alt_text VARCHAR(255) DEFAULT NULL,
  storage_disk VARCHAR(50) NOT NULL DEFAULT 'local',
  hash_value VARCHAR(64) DEFAULT NULL,
  uploaded_by CHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_media_assets_hash (hash_value),
  KEY idx_media_assets_uploaded_by (uploaded_by),
  KEY idx_media_assets_mime_type (mime_type),
  CONSTRAINT fk_media_assets_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6.3 操作日志表 operation_logs

用途：记录管理员重要操作，满足审计与问题追踪。

```sql
CREATE TABLE operation_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  operator_id CHAR(36) DEFAULT NULL,
  module_name VARCHAR(50) NOT NULL,
  action_name VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) DEFAULT NULL,
  target_id VARCHAR(50) DEFAULT NULL,
  request_method VARCHAR(10) DEFAULT NULL,
  request_path VARCHAR(255) DEFAULT NULL,
  request_payload JSON DEFAULT NULL,
  response_code INT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_operation_logs_operator (operator_id),
  KEY idx_operation_logs_module_action (module_name, action_name),
  KEY idx_operation_logs_created_at (created_at),
  CONSTRAINT fk_operation_logs_operator FOREIGN KEY (operator_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6.4 系列文章表 article_series 与关联表 article_series_items

用途：多篇文章组成系列并控制展示顺序。

```sql
CREATE TABLE article_series (
  id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,
  cover_image_url VARCHAR(500) DEFAULT NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  created_by CHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_article_series_slug (slug),
  CONSTRAINT fk_article_series_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE article_series_items (
  series_id CHAR(36) NOT NULL,
  article_id CHAR(36) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (series_id, article_id),
  UNIQUE KEY uk_series_order (series_id, sort_order),
  CONSTRAINT fk_article_series_items_series FOREIGN KEY (series_id) REFERENCES article_series (id) ON DELETE CASCADE,
  CONSTRAINT fk_article_series_items_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6.5 邮件订阅表 email_subscribers

用途：邮件订阅新文章。

```sql
CREATE TABLE email_subscribers (
  id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  nickname VARCHAR(100) DEFAULT NULL,
  status ENUM('pending', 'subscribed', 'unsubscribed') NOT NULL DEFAULT 'pending',
  subscribe_token VARCHAR(100) DEFAULT NULL,
  subscribed_at DATETIME DEFAULT NULL,
  unsubscribed_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_email_subscribers_email (email),
  KEY idx_email_subscribers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 6.6 公告表 notices

用途：站点公告栏。

```sql
CREATE TABLE notices (
  id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  status ENUM('draft', 'published', 'offline') NOT NULL DEFAULT 'draft',
  sort_order INT NOT NULL DEFAULT 0,
  starts_at DATETIME DEFAULT NULL,
  ends_at DATETIME DEFAULT NULL,
  created_by CHAR(36) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notices_status_time (status, starts_at, ends_at),
  CONSTRAINT fk_notices_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 7. 社区扩展表结构

### 7.1 收藏表 user_favorites

用途：支持注册用户收藏文章。

```sql
CREATE TABLE user_favorites (
  user_id CHAR(36) NOT NULL,
  article_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, article_id),
  KEY idx_user_favorites_article (article_id),
  CONSTRAINT fk_user_favorites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_favorites_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7.2 通知表 notifications

用途：评论回复通知、点赞通知、系统通知。

```sql
CREATE TABLE notifications (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  type ENUM('comment_reply', 'article_like', 'system') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content VARCHAR(1000) NOT NULL,
  related_type VARCHAR(50) DEFAULT NULL,
  related_id CHAR(36) DEFAULT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_read (user_id, is_read),
  KEY idx_notifications_created_at (created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 8. 与当前项目实体的差异说明

当前项目已存在 users、articles、categories、tags 四个基础实体，但若要满足需求文档，还需要补齐以下差异：

1. articles 表需新增 category_id，满足“单篇文章归属一个分类”。
2. articles 表建议补充 scheduled_at、allow_comment、is_top、seo 字段，覆盖定时发布、评论控制、置顶和 SEO。
3. tags 与 articles 之间需要新增 article_tags 多对多关联表。
4. 页面管理、友情链接、评论管理、站点设置目前尚无实体，需要新增 pages、friend_links、comments、site_settings。
5. 后台增强功能对应的 article_versions、media_assets、operation_logs 可在二期迁移中落地。

## 9. 推荐迁移顺序

1. 创建 users、categories、tags
2. 创建 articles
3. 创建 article_tags
4. 创建 pages、friend_links
5. 创建 comments
6. 创建 site_settings 并初始化默认配置
7. 二期按需创建 article_versions、media_assets、operation_logs

## 10. 默认初始化数据建议

### 10.1 默认管理员

- username：admin
- role：super_admin
- status：active

### 10.2 默认站点设置

- blog_title：个人博客
- blog_subtitle：记录技术与生活
- site_description：一个基于 NestJS + MySQL 的个人博客系统
- comment_audit_required：true
- theme_mode：system

### 10.3 默认分类

- 技术
- 生活
- 随笔

## 11. 总结

这套表结构覆盖了需求文档中的核心博客能力，并为后续增强功能保留了清晰的扩展路径。若后续要继续落地到代码层，建议下一步按本文档顺序补充 TypeORM 实体与 migration 文件，而不是直接使用 synchronize 自动建表。