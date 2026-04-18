import { access, readFile } from 'fs/promises';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import mysql, { type Connection } from 'mysql2/promise';

const SCHEMA_FILE_PATH = resolve(process.cwd(), 'sql/init/001_init_schema.sql');

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined) {
    throw new Error(`缺少必需环境变量: ${name}`);
  }

  return value;
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

async function ensureArticleVersionsCompatibility(connection: Connection): Promise<void> {
  const missingColumnDefinitions = [
    ['slug', "`slug` VARCHAR(255) NOT NULL DEFAULT '' AFTER `title`"],
    ['cover_image_url', "`cover_image_url` VARCHAR(500) DEFAULT NULL AFTER `content_html`"],
    ['category_id', "`category_id` CHAR(36) NOT NULL DEFAULT '00000000-0000-4000-8000-000000000000' AFTER `cover_image_url`"],
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
    await ensureArticleVersionsCompatibility(connection);

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
