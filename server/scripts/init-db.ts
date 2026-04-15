import { access, readFile } from 'fs/promises';
import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import mysql from 'mysql2/promise';

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