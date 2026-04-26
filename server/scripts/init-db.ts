import { access, readFile } from 'fs/promises';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { config as loadEnv } from 'dotenv';
import * as bcrypt from 'bcrypt';
import mysql, { type Connection } from 'mysql2/promise';
import { DEFAULT_USER_ROLES } from '../src/database/default-user-roles';

const SCHEMA_FILE_PATH = resolve(process.cwd(), 'sql/init/001_init_schema.sql');
const PASSWORD_SALT_ROUNDS = 10;
const SUPER_ADMIN_EMAIL_DOMAIN = 'local.admin';

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined) {
    throw new Error(`缺少必需环境变量: ${name}`);
  }

  return value;
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function escapeIdentifier(identifier: string): string {
  return identifier.replace(/`/g, '``');
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function getExistingColumns(connection: Connection, tableName: string): Promise<Set<string>> {
  const [rows] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(
    Array.isArray(rows)
      ? rows
          .map(row => (typeof row === 'object' && row !== null ? String((row as { Field?: string }).Field ?? '') : ''))
          .filter(Boolean)
      : [],
  );
}

async function getColumnMetadata(
  connection: Connection,
  tableName: string,
): Promise<Map<string, { type: string }>> {
  const [rows] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
  const result = new Map<string, { type: string }>();

  if (!Array.isArray(rows)) {
    return result;
  }

  for (const row of rows) {
    if (typeof row !== 'object' || row === null) {
      continue;
    }

    const field = String((row as { Field?: string }).Field ?? '');
    const type = String((row as { Type?: string }).Type ?? '');
    if (field) {
      result.set(field, { type });
    }
  }

  return result;
}

async function getExistingIndexes(connection: Connection, tableName: string): Promise<Set<string>> {
  const [rows] = await connection.query(`SHOW INDEX FROM \`${tableName}\``);
  return new Set(
    Array.isArray(rows)
      ? rows
          .map(row =>
            typeof row === 'object' && row !== null
              ? String((row as { Key_name?: string }).Key_name ?? '')
              : '',
          )
          .filter(Boolean)
      : [],
  );
}

async function hasForeignKey(
  connection: Connection,
  tableName: string,
  constraintName: string,
): Promise<boolean> {
  const [rows] = await connection.query(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      LIMIT 1
    `,
    [tableName, constraintName],
  );

  return Array.isArray(rows) && rows.length > 0;
}

async function ensureUserRolesCompatibility(connection: Connection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`user_roles\` (
      \`code\` VARCHAR(32) NOT NULL,
      \`name\` VARCHAR(50) NOT NULL,
      \`description\` VARCHAR(255) DEFAULT NULL,
      \`sort_order\` INT NOT NULL DEFAULT 0,
      \`is_system\` TINYINT(1) NOT NULL DEFAULT 1,
      \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`code\`),
      UNIQUE KEY \`idx_user_roles_name\` (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  for (const role of DEFAULT_USER_ROLES) {
    await connection.query(
      `
        INSERT INTO \`user_roles\` (\`code\`, \`name\`, \`description\`, \`sort_order\`, \`is_system\`)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`name\` = VALUES(\`name\`),
          \`description\` = VALUES(\`description\`),
          \`sort_order\` = VALUES(\`sort_order\`),
          \`is_system\` = VALUES(\`is_system\`)
      `,
      [role.code, role.name, role.description, role.sortOrder, role.isSystem ? 1 : 0],
    );
  }
}

async function ensureUsersCompatibility(connection: Connection): Promise<void> {
  const existingColumns = await getExistingColumns(connection, 'users');
  const alterFragments: string[] = [];

  if (!existingColumns.has('phone')) {
    alterFragments.push('ADD COLUMN `phone` VARCHAR(20) DEFAULT NULL AFTER `email`');
  }

  if (!existingColumns.has('registration_type')) {
    alterFragments.push(
      "ADD COLUMN `registration_type` ENUM('email', 'phone', 'oauth') NOT NULL DEFAULT 'email' AFTER `nickname`",
    );
  }

  if (!existingColumns.has('email_verified_at')) {
    alterFragments.push(
      'ADD COLUMN `email_verified_at` DATETIME DEFAULT NULL AFTER `registration_type`',
    );
  }

  if (!existingColumns.has('phone_verified_at')) {
    alterFragments.push(
      'ADD COLUMN `phone_verified_at` DATETIME DEFAULT NULL AFTER `email_verified_at`',
    );
  }

  if (!existingColumns.has('oauth_provider')) {
    alterFragments.push(
      "ADD COLUMN `oauth_provider` ENUM('github', 'google') DEFAULT NULL AFTER `bio`",
    );
  }

  if (!existingColumns.has('oauth_provider_id')) {
    alterFragments.push(
      'ADD COLUMN `oauth_provider_id` VARCHAR(120) DEFAULT NULL AFTER `oauth_provider`',
    );
  }

  if (!existingColumns.has('password_changed_at')) {
    alterFragments.push(
      'ADD COLUMN `password_changed_at` DATETIME DEFAULT NULL AFTER `last_login_at`',
    );
  }

  if (alterFragments.length > 0) {
    await connection.query(`ALTER TABLE \`users\` ${alterFragments.join(', ')}`);
  }

  const columnMetadata = await getColumnMetadata(connection, 'users');
  const roleColumnType = columnMetadata.get('role')?.type.toLowerCase() ?? '';
  if (roleColumnType !== 'varchar(32)') {
    await connection.query(
      "ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(32) NOT NULL DEFAULT 'user'",
    );
  }

  const existingIndexes = await getExistingIndexes(connection, 'users');
  if (!existingIndexes.has('idx_users_role')) {
    await connection.query('ALTER TABLE `users` ADD INDEX `idx_users_role` (`role`)');
  }

  if (!existingIndexes.has('idx_users_phone')) {
    await connection.query('ALTER TABLE `users` ADD UNIQUE INDEX `idx_users_phone` (`phone`)');
  }

  if (!existingIndexes.has('idx_users_nickname')) {
    await connection.query('ALTER TABLE `users` ADD UNIQUE INDEX `idx_users_nickname` (`nickname`)');
  }

  if (!existingIndexes.has('idx_users_role_status')) {
    await connection.query('ALTER TABLE `users` ADD INDEX `idx_users_role_status` (`role`, `status`)');
  }

  if (!existingIndexes.has('idx_users_registration_type_status')) {
    await connection.query(
      'ALTER TABLE `users` ADD INDEX `idx_users_registration_type_status` (`registration_type`, `status`)',
    );
  }

  if (!existingIndexes.has('idx_users_oauth_provider')) {
    await connection.query(
      'ALTER TABLE `users` ADD UNIQUE INDEX `idx_users_oauth_provider` (`oauth_provider`, `oauth_provider_id`)',
    );
  }

  if (!(await hasForeignKey(connection, 'users', 'fk_users_role'))) {
    await connection.query(
      'ALTER TABLE `users` ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role`) REFERENCES `user_roles` (`code`)',
    );
  }
}

async function ensureArticleVersionsCompatibility(connection: Connection): Promise<void> {
  const missingColumnDefinitions = [
    ['slug', "`slug` VARCHAR(255) NOT NULL DEFAULT '' AFTER `title`"],
    ['cover_image_url', "`cover_image_url` VARCHAR(500) DEFAULT NULL AFTER `content_html`"],
    ['category_id', "`category_id` VARCHAR(36) NOT NULL DEFAULT '00000000-0000-4000-8000-000000000000' AFTER `cover_image_url`"],
    [
      'status',
      "`status` ENUM('draft', 'scheduled', 'published', 'archived') NOT NULL DEFAULT 'draft' AFTER `category_id`",
    ],
    [
      'visibility',
      "`visibility` ENUM('public', 'private', 'password') NOT NULL DEFAULT 'public' AFTER `status`",
    ],
    ['allow_comment', '`allow_comment` TINYINT(1) NOT NULL DEFAULT 1 AFTER `visibility`'],
    ['is_top', '`is_top` TINYINT(1) NOT NULL DEFAULT 0 AFTER `allow_comment`'],
    ['sort_order', '`sort_order` INT NOT NULL DEFAULT 0 AFTER `is_top`'],
    ['seo_title', '`seo_title` VARCHAR(255) DEFAULT NULL AFTER `sort_order`'],
    ['seo_description', '`seo_description` VARCHAR(500) DEFAULT NULL AFTER `seo_title`'],
    ['seo_keywords', '`seo_keywords` VARCHAR(255) DEFAULT NULL AFTER `seo_description`'],
    ['scheduled_at', '`scheduled_at` DATETIME DEFAULT NULL AFTER `seo_keywords`'],
    ['published_at', '`published_at` DATETIME DEFAULT NULL AFTER `scheduled_at`'],
    ['deleted_at', '`deleted_at` DATETIME DEFAULT NULL AFTER `published_at`'],
    ['tag_ids', '`tag_ids` JSON DEFAULT NULL AFTER `deleted_at`'],
  ] as const;

  const existingColumns = await getExistingColumns(connection, 'article_versions');
  const alterFragments = missingColumnDefinitions
    .filter(([columnName]) => !existingColumns.has(columnName))
    .map(([, definition]) => `ADD COLUMN ${definition}`);

  if (alterFragments.length === 0) {
    return;
  }

  await connection.query(`ALTER TABLE \`article_versions\` ${alterFragments.join(', ')}`);
}

async function ensureFriendLinksCompatibility(connection: Connection): Promise<void> {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS \`friend_links\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`site_name\` VARCHAR(100) NOT NULL,
      \`site_url\` VARCHAR(255) NOT NULL,
      \`logo_url\` VARCHAR(500) DEFAULT NULL,
      \`description\` VARCHAR(255) DEFAULT NULL,
      \`contact_email\` VARCHAR(255) DEFAULT NULL,
      \`applicant_name\` VARCHAR(100) DEFAULT NULL,
      \`sort_order\` INT NOT NULL DEFAULT 0,
      \`status\` ENUM('pending','approved','rejected','offline') NOT NULL DEFAULT 'pending',
      \`approved_at\` DATETIME DEFAULT NULL,
      \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureConfiguredSuperAdmin(connection: Connection): Promise<void> {
  const username = getOptionalEnv('SUPER_ADMIN_USERNAME') || getOptionalEnv('ADMIN_USERNAME');
  const password = getOptionalEnv('SUPER_ADMIN_PASSWORD') || getOptionalEnv('ADMIN_PASSWORD');
  const email = resolveSuperAdminEmail(username, getOptionalEnv('SUPER_ADMIN_EMAIL'));
  const nickname = getOptionalEnv('SUPER_ADMIN_NICKNAME') || '系统超管';

  if (!username || !password) {
    console.log('未配置超级管理员账号，跳过超管初始化。');
    return;
  }

  const [rows] = await connection.query(
    `
      SELECT id
      FROM users
      WHERE username = ?
        OR (? IS NOT NULL AND email = ?)
      ORDER BY username = ? DESC
      LIMIT 1
    `,
    [username, email, email, username],
  );

  const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  const now = new Date();
  const nowSql = now.toISOString().slice(0, 19).replace('T', ' ');
  const emailVerifiedAt = nowSql;

  if (Array.isArray(rows) && rows.length > 0) {
    const row = rows[0] as { id?: string };
    await connection.query(
      `
        UPDATE users
        SET username = ?,
            email = ?,
            nickname = ?,
            password_hash = ?,
            registration_type = 'email',
            email_verified_at = ?,
            role = 'super_admin',
            status = 'active',
            password_changed_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [username, email, nickname, hashedPassword, emailVerifiedAt, nowSql, row.id],
    );
    console.log(`超级管理员已同步：${username}`);
    return;
  }

  await connection.query(
    `
      INSERT INTO users (
        id,
        username,
        email,
        phone,
        password_hash,
        nickname,
        registration_type,
        email_verified_at,
        phone_verified_at,
        avatar_url,
        bio,
        oauth_provider,
        oauth_provider_id,
        role,
        status,
        last_login_at,
        password_changed_at
      ) VALUES (?, ?, ?, NULL, ?, ?, 'email', ?, NULL, NULL, NULL, NULL, NULL, 'super_admin', 'active', NULL, ?)
    `,
    [randomUUID(), username, email, hashedPassword, nickname, emailVerifiedAt, nowSql],
  );
  console.log(`超级管理员已创建：${username}`);
}

function resolveSuperAdminEmail(username: string | undefined, email: string | undefined): string {
  const normalizedEmail = email?.trim().toLowerCase();

  if (normalizedEmail) {
    return normalizedEmail;
  }

  const safeLocalPart =
    username
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'super-admin';

  return `${safeLocalPart}@${SUPER_ADMIN_EMAIL_DOMAIN}`;
}

async function bootstrap(): Promise<void> {
  loadEnv({ path: resolve(process.cwd(), '.env') });

  const host = getRequiredEnv('DB_HOST');
  const port = Number(process.env.DB_PORT ?? '3306');
  const user = getRequiredEnv('DB_USERNAME');
  const password = getRequiredEnv('DB_PASSWORD');
  const database = getRequiredEnv('DB_DATABASE');
  await access(SCHEMA_FILE_PATH);
  const schemaSql = await readFile(SCHEMA_FILE_PATH, 'utf8');
  const statements = splitSqlStatements(schemaSql);
  const safeDatabaseName = escapeIdentifier(database);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT 必须是 1 到 65535 之间的有效数字');
  }

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${safeDatabaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.query(`USE \`${safeDatabaseName}\``);
    for (const statement of statements) {
      await connection.query(statement);
    }
    await ensureUserRolesCompatibility(connection);
    await ensureUsersCompatibility(connection);
    await ensureArticleVersionsCompatibility(connection);
    await ensureFriendLinksCompatibility(connection);
    await ensureConfiguredSuperAdmin(connection);

    const [rows] = await connection.query('SHOW TABLES');
    const tableCount = Array.isArray(rows) ? rows.length : 0;

    console.log(`数据库初始化完成，共检测到 ${tableCount} 张表。`);
  } finally {
    await connection.end();
  }
}

bootstrap().catch((error: unknown) => {
  console.error('数据库初始化失败。');

  if (error instanceof Error) {
    console.error(error.message);

    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(error);
  }

  process.exit(1);
});
