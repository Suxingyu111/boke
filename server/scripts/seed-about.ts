import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import mysql from 'mysql2/promise';

loadEnv({ path: resolve(process.cwd(), '.env') });

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined) throw new Error(`缺少必需环境变量: ${name}`);
  return value;
}

const TECH_STACK = [
  'Vue 3', 'TypeScript', 'Node.js', 'NestJS',
  'MySQL', 'Redis', 'Docker', 'Vite',
];

const TIMELINE = [
  { year: '2019', title: '开始写作', desc: '第一篇技术文章上线，记录学习与思考的起点。' },
  { year: '2021', title: '全栈转型', desc: '从前端扩展到后端，探索独立产品的可能性。' },
  { year: '2023', title: '产品思维', desc: '深入研究产品设计，理解用户体验方法论。' },
  { year: 'Now →', title: '持续探索', desc: '写作 · 开发 · 产品，三线并行实验中。' },
];

const SETTINGS = [
  {
    settingKey: 'about_tech_stack',
    settingValue: TECH_STACK,
    valueType: 'json',
    groupName: 'about',
    description: '关于页技术栈标签列表',
    isPublic: true,
  },
  {
    settingKey: 'about_timeline',
    settingValue: TIMELINE,
    valueType: 'json',
    groupName: 'about',
    description: '关于页成长轨迹时间线',
    isPublic: true,
  },
  {
    settingKey: 'about_contact_email',
    settingValue: 'hello@example.com',
    valueType: 'string',
    groupName: 'about',
    description: '关于页联系邮箱',
    isPublic: true,
  },
  {
    settingKey: 'about_github_url',
    settingValue: 'https://github.com',
    valueType: 'string',
    groupName: 'about',
    description: '关于页 GitHub 链接',
    isPublic: true,
  },
];

async function main() {
  const connection = await mysql.createConnection({
    host: getRequiredEnv('DB_HOST'),
    port: Number(process.env['DB_PORT'] ?? 3306),
    user: getRequiredEnv('DB_USERNAME'),
    password: getRequiredEnv('DB_PASSWORD'),
    database: getRequiredEnv('DB_DATABASE'),
  });

  console.log('✅ 数据库连接成功，开始写入关于页设置...');

  for (const s of SETTINGS) {
    await connection.execute(
      `INSERT INTO site_settings (setting_key, setting_value, value_type, group_name, description, is_public)
       VALUES (?, CAST(? AS JSON), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         setting_value = VALUES(setting_value),
         value_type    = VALUES(value_type),
         group_name    = VALUES(group_name),
         description   = VALUES(description),
         is_public     = VALUES(is_public)`,
      [
        s.settingKey,
        JSON.stringify(s.settingValue),
        s.valueType,
        s.groupName,
        s.description,
        s.isPublic ? 1 : 0,
      ],
    );
    console.log(`  ↳ ${s.settingKey} 已写入`);
  }

  await connection.end();
  console.log('🎉 关于页数据种子完成');
}

main().catch((err) => {
  console.error('❌ 种子脚本失败:', err);
  process.exit(1);
});
