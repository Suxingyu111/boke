import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import mysql from 'mysql2/promise';

type AnnouncementStatus = 'draft' | 'published' | 'archived';
type GuestbookStatus = 'pending' | 'approved' | 'rejected';

type AnnouncementSeed = {
  id: string;
  title: string;
  content: string;
  status: AnnouncementStatus;
  isPinned: boolean;
  publishedAt: string | null;
  createdBy: string;
};

type GuestbookSeed = {
  id: string;
  nickname: string;
  email: string | null;
  website: string | null;
  avatarUrl: string | null;
  content: string;
  parentId: string | null;
  ip: string | null;
  status: GuestbookStatus;
  isAdminReply: boolean;
  createdAt: string;
};

type ArticleSeriesSeed = {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  status: 'draft' | 'published';
  createdBy: string;
  itemArticleIds: string[];
};

type VisitorLogSeed = {
  id: string;
  ip: string;
  userAgent: string;
  referer: string | null;
  path: string;
  visitDate: string;
  stayDuration: number;
  device: string;
  browser: string;
  os: string;
  createdAt: string;
};

const ADMIN_ID = '00000000-0000-4000-8000-000000000001';

const announcements: AnnouncementSeed[] = [
  {
    id: '71000000-0000-4000-8000-000000000001',
    title: '演示站内容已初始化，欢迎联调前后端页面',
    content:
      '站点已填充首页、分类、搜索、归档、留言板和关于页所需的演示内容。你现在可以直接联调公开页和管理后台，不必再手工造数据。',
    status: 'published',
    isPinned: true,
    publishedAt: '2026-04-25 10:00:00',
    createdBy: ADMIN_ID,
  },
  {
    id: '71000000-0000-4000-8000-000000000002',
    title: '全文搜索已接入 Elasticsearch',
    content:
      '搜索接口已同步到 Elasticsearch，搜索结果会返回相关度和命中高亮，更适合前端展示搜索体验。',
    status: 'published',
    isPinned: false,
    publishedAt: '2026-04-24 09:30:00',
    createdBy: ADMIN_ID,
  },
  {
    id: '71000000-0000-4000-8000-000000000003',
    title: '留言板与公告模块演示数据已启用',
    content:
      '为了便于展示社区氛围，留言板中预置了若干真实感较强的留言与管理员回复，公告区也同步补齐了常见站点通知。',
    status: 'published',
    isPinned: false,
    publishedAt: '2026-04-23 20:15:00',
    createdBy: ADMIN_ID,
  },
  {
    id: '71000000-0000-4000-8000-000000000004',
    title: '下一步计划：继续完善专题页与后台看板',
    content:
      '接下来会围绕系列文章、访客统计和站点设置继续打磨展示数据，让公开站点和后台管理都有更完整的演示效果。',
    status: 'draft',
    isPinned: false,
    publishedAt: null,
    createdBy: ADMIN_ID,
  },
];

const guestbookMessages: GuestbookSeed[] = [
  {
    id: '72000000-0000-4000-8000-000000000001',
    nickname: '阿哲',
    email: 'azhe@example.com',
    website: null,
    avatarUrl: null,
    content: '首页的内容氛围已经很完整了，尤其是热门轮播和最近更新这两块，拿来做演示非常顺手。',
    parentId: null,
    ip: '10.20.30.1',
    status: 'approved',
    isAdminReply: false,
    createdAt: '2026-04-22 09:12:00',
  },
  {
    id: '72000000-0000-4000-8000-000000000002',
    nickname: 'Nora',
    email: 'nora.reader@example.com',
    website: 'https://example.com/nora',
    avatarUrl: null,
    content: '搜索页带高亮和相关度分数这一点很好，前端能明显看出 ES 和数据库回退的差别。',
    parentId: null,
    ip: '10.20.30.2',
    status: 'approved',
    isAdminReply: false,
    createdAt: '2026-04-22 10:20:00',
  },
  {
    id: '72000000-0000-4000-8000-000000000003',
    nickname: '博主',
    email: null,
    website: null,
    avatarUrl: null,
    content: '这一轮演示数据会优先保证首页、搜索和文章详情页都有可感知的内容差异，后面再继续补后台维度。',
    parentId: '72000000-0000-4000-8000-000000000002',
    ip: null,
    status: 'approved',
    isAdminReply: true,
    createdAt: '2026-04-22 12:05:00',
  },
  {
    id: '72000000-0000-4000-8000-000000000004',
    nickname: '晨光',
    email: 'chenguang@example.com',
    website: null,
    avatarUrl: null,
    content: '分类页如果文章再多一点，会更容易看出筛选和聚合后的阅读路径。',
    parentId: null,
    ip: '10.20.30.4',
    status: 'approved',
    isAdminReply: false,
    createdAt: '2026-04-21 19:48:00',
  },
  {
    id: '72000000-0000-4000-8000-000000000005',
    nickname: '小满',
    email: 'xiaoman@example.com',
    website: null,
    avatarUrl: null,
    content: '关于页的技术栈和时间线很适合当个人站模板，视觉上也比一段纯文字更有层次。',
    parentId: null,
    ip: '10.20.30.5',
    status: 'approved',
    isAdminReply: false,
    createdAt: '2026-04-21 08:30:00',
  },
  {
    id: '72000000-0000-4000-8000-000000000006',
    nickname: '远山',
    email: 'yuanshan@example.com',
    website: null,
    avatarUrl: null,
    content: '建议后面给归档页也补一些更分散的月份数据，这样时间轴会更有内容感。',
    parentId: null,
    ip: '10.20.30.6',
    status: 'approved',
    isAdminReply: false,
    createdAt: '2026-04-20 21:15:00',
  },
  {
    id: '72000000-0000-4000-8000-000000000007',
    nickname: '博主',
    email: null,
    website: null,
    avatarUrl: null,
    content: '已经把一部分批量文章纳入初始化流程了，后面会继续把归档月份分布拉得更自然一些。',
    parentId: '72000000-0000-4000-8000-000000000006',
    ip: null,
    status: 'approved',
    isAdminReply: true,
    createdAt: '2026-04-20 22:00:00',
  },
  {
    id: '72000000-0000-4000-8000-000000000008',
    nickname: 'Kai',
    email: 'kai@example.com',
    website: null,
    avatarUrl: null,
    content: '留言板这种温和一点的交流区很适合博客项目，比直接塞一堆评论更有生活感。',
    parentId: null,
    ip: '10.20.30.8',
    status: 'approved',
    isAdminReply: false,
    createdAt: '2026-04-19 18:42:00',
  },
  {
    id: '72000000-0000-4000-8000-000000000009',
    nickname: '待审核用户',
    email: 'pending@example.com',
    website: null,
    avatarUrl: null,
    content: '这条留言保留为待审核状态，用于后台联调审核流。',
    parentId: null,
    ip: '10.20.30.9',
    status: 'pending',
    isAdminReply: false,
    createdAt: '2026-04-25 16:18:00',
  },
];

const articleSeriesList: ArticleSeriesSeed[] = [
  {
    id: '73000000-0000-4000-8000-000000000001',
    name: '博客前台体验优化',
    slug: 'blog-frontend-experience',
    description: '围绕首页、搜索、交互状态和内容呈现方式，持续优化博客前台体验。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    createdBy: ADMIN_ID,
    itemArticleIds: [
      '40000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000006',
    ],
  },
  {
    id: '73000000-0000-4000-8000-000000000002',
    name: '内容后台与搜索建设',
    slug: 'content-admin-and-search',
    description: '把内容管理、权限边界、搜索质量和索引同步串成一条后台建设主线。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    createdBy: ADMIN_ID,
    itemArticleIds: [
      '40000000-0000-4000-8000-000000000003',
      '40000000-0000-4000-8000-000000000007',
      '40000000-0000-4000-8000-000000000009',
    ],
  },
  {
    id: '73000000-0000-4000-8000-000000000003',
    name: '写作与协作工作流',
    slug: 'writing-and-collaboration-flow',
    description: '从写作节奏、草稿管理到异步协作，把创作者工作流做成可复用的系列内容。',
    coverImageUrl:
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=80',
    status: 'published',
    createdBy: ADMIN_ID,
    itemArticleIds: [
      '40000000-0000-4000-8000-000000000005',
      '40000000-0000-4000-8000-000000000008',
      '40000000-0000-4000-8000-000000000011',
    ],
  },
];

const visitorLogs: VisitorLogSeed[] = [
  {
    id: '74000000-0000-4000-8000-000000000001',
    ip: '172.16.0.11',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
    referer: 'https://www.google.com/',
    path: '/',
    visitDate: '2026-04-20',
    stayDuration: 86,
    device: 'Desktop',
    browser: 'Chrome',
    os: 'macOS',
    createdAt: '2026-04-20 08:20:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000002',
    ip: '172.16.0.12',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1',
    referer: 'https://weibo.com/',
    path: '/articles/make-homepage-first-screen-work',
    visitDate: '2026-04-20',
    stayDuration: 143,
    device: 'Mobile',
    browser: 'Safari',
    os: 'iOS',
    createdAt: '2026-04-20 09:15:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000003',
    ip: '172.16.0.13',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
    referer: 'https://github.com/',
    path: '/search?q=Vue',
    visitDate: '2026-04-21',
    stayDuration: 64,
    device: 'Desktop',
    browser: 'Chrome',
    os: 'Windows',
    createdAt: '2026-04-21 11:45:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000004',
    ip: '172.16.0.14',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36',
    referer: 'https://news.ycombinator.com/',
    path: '/categories',
    visitDate: '2026-04-21',
    stayDuration: 58,
    device: 'Mobile',
    browser: 'Chrome',
    os: 'Android',
    createdAt: '2026-04-21 13:08:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000005',
    ip: '172.16.0.15',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 Firefox/124.0',
    referer: 'https://css-tricks.com/',
    path: '/archives?year=2026&month=4',
    visitDate: '2026-04-22',
    stayDuration: 101,
    device: 'Desktop',
    browser: 'Firefox',
    os: 'macOS',
    createdAt: '2026-04-22 10:32:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000006',
    ip: '172.16.0.16',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
    referer: 'https://www.google.com/',
    path: '/guestbook',
    visitDate: '2026-04-22',
    stayDuration: 120,
    device: 'Desktop',
    browser: 'Chrome',
    os: 'macOS',
    createdAt: '2026-04-22 17:20:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000007',
    ip: '172.16.0.17',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/123.0.0.0 Safari/537.36',
    referer: 'https://www.google.com/',
    path: '/about',
    visitDate: '2026-04-23',
    stayDuration: 77,
    device: 'Desktop',
    browser: 'Edge',
    os: 'Windows',
    createdAt: '2026-04-23 09:44:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000008',
    ip: '172.16.0.18',
    userAgent:
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36',
    referer: 'https://www.baidu.com/',
    path: '/articles/vue-list-loading-filter-empty-state',
    visitDate: '2026-04-23',
    stayDuration: 167,
    device: 'Mobile',
    browser: 'Chrome',
    os: 'Android',
    createdAt: '2026-04-23 15:14:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000009',
    ip: '172.16.0.19',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
    referer: 'https://github.com/',
    path: '/search?q=NestJS',
    visitDate: '2026-04-24',
    stayDuration: 94,
    device: 'Desktop',
    browser: 'Chrome',
    os: 'macOS',
    createdAt: '2026-04-24 10:01:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000010',
    ip: '172.16.0.20',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1',
    referer: 'https://x.com/',
    path: '/',
    visitDate: '2026-04-24',
    stayDuration: 52,
    device: 'Mobile',
    browser: 'Safari',
    os: 'iOS',
    createdAt: '2026-04-24 21:30:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000011',
    ip: '172.16.0.21',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
    referer: 'https://www.google.com/',
    path: '/articles/blog-search-page-long-tail-value',
    visitDate: '2026-04-25',
    stayDuration: 111,
    device: 'Desktop',
    browser: 'Chrome',
    os: 'macOS',
    createdAt: '2026-04-25 08:28:00',
  },
  {
    id: '74000000-0000-4000-8000-000000000012',
    ip: '172.16.0.22',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Firefox/124.0',
    referer: 'https://www.google.com/',
    path: '/guestbook',
    visitDate: '2026-04-25',
    stayDuration: 130,
    device: 'Desktop',
    browser: 'Firefox',
    os: 'Windows',
    createdAt: '2026-04-25 11:36:00',
  },
];

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少必需环境变量: ${name}`);
  }
  return value;
}

async function upsertAnnouncement(
  connection: mysql.Connection,
  item: AnnouncementSeed,
) {
  await connection.execute(
    `INSERT INTO announcements (id, title, content, status, is_pinned, published_at, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       content = VALUES(content),
       status = VALUES(status),
       is_pinned = VALUES(is_pinned),
       published_at = VALUES(published_at),
       created_by = VALUES(created_by),
       updated_at = CURRENT_TIMESTAMP`,
    [
      item.id,
      item.title,
      item.content,
      item.status,
      item.isPinned ? 1 : 0,
      item.publishedAt,
      item.createdBy,
      item.publishedAt,
    ],
  );
}

async function seedAnnouncements(connection: mysql.Connection, adminId: string) {
  for (const item of announcements) {
    await upsertAnnouncement(connection, {
      ...item,
      createdBy: item.createdBy === ADMIN_ID ? adminId : item.createdBy,
    });
  }
}

async function seedGuestbook(connection: mysql.Connection) {
  const guestbookIds = guestbookMessages.map(item => item.id);
  await connection.query(
    `DELETE FROM guestbook WHERE id IN (${guestbookIds.map(() => '?').join(',')})`,
    guestbookIds,
  );

  for (const item of guestbookMessages) {
    await connection.execute(
      `INSERT INTO guestbook (id, nickname, email, website, avatar_url, content, parent_id, ip, status, is_admin_reply, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.nickname,
        item.email,
        item.website,
        item.avatarUrl,
        item.content,
        item.parentId,
        item.ip,
        item.status,
        item.isAdminReply ? 1 : 0,
        item.createdAt,
      ],
    );
  }
}

async function seedArticleSeries(connection: mysql.Connection, adminId: string) {
  for (const series of articleSeriesList) {
    await connection.execute(
      `INSERT INTO article_series (id, name, slug, description, cover_image_url, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         slug = VALUES(slug),
         description = VALUES(description),
         cover_image_url = VALUES(cover_image_url),
         status = VALUES(status),
         created_by = VALUES(created_by),
         updated_at = CURRENT_TIMESTAMP`,
      [
        series.id,
        series.name,
        series.slug,
        series.description,
        series.coverImageUrl,
        series.status,
        series.createdBy === ADMIN_ID ? adminId : series.createdBy,
      ],
    );

    await connection.execute('DELETE FROM article_series_items WHERE series_id = ?', [series.id]);
    for (let index = 0; index < series.itemArticleIds.length; index += 1) {
      await connection.execute(
        `INSERT INTO article_series_items (series_id, article_id, sort_order, created_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [series.id, series.itemArticleIds[index], index + 1],
      );
    }
  }
}

async function seedVisitorLogs(connection: mysql.Connection) {
  const visitorIds = visitorLogs.map(item => item.id);
  await connection.query(
    `DELETE FROM visitor_logs WHERE id IN (${visitorIds.map(() => '?').join(',')})`,
    visitorIds,
  );

  for (const item of visitorLogs) {
    await connection.execute(
      `INSERT INTO visitor_logs (id, ip, user_agent, referer, path, visit_date, stay_duration, device, browser, os, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.ip,
        item.userAgent,
        item.referer,
        item.path,
        item.visitDate,
        item.stayDuration,
        item.device,
        item.browser,
        item.os,
        item.createdAt,
      ],
    );
  }
}

async function printSummary(connection: mysql.Connection) {
  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    `SELECT
      (SELECT COUNT(*) FROM announcements WHERE status = 'published') AS publishedAnnouncements,
      (SELECT COUNT(*) FROM guestbook WHERE status = 'approved') AS approvedGuestbookMessages,
      (SELECT COUNT(*) FROM article_series WHERE status = 'published') AS publishedSeries,
      (SELECT COUNT(*) FROM visitor_logs) AS visitorLogs`,
  );

  console.log('展示数据填充完成：', rows[0]);
}

async function bootstrap() {
  loadEnv({ path: resolve(process.cwd(), '.env') });
  const connection = await mysql.createConnection({
    host: getRequiredEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? '3306'),
    user: getRequiredEnv('DB_USERNAME'),
    password: getRequiredEnv('DB_PASSWORD'),
    database: getRequiredEnv('DB_DATABASE'),
    charset: 'utf8mb4',
  });

  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      ['admin'],
    );
    const adminId = rows[0] ? String(rows[0].id) : '';
    if (!adminId) {
      throw new Error('缺少管理员用户，无法写入展示数据');
    }
    await seedAnnouncements(connection, adminId);
    await seedGuestbook(connection);
    await seedArticleSeries(connection, adminId);
    await seedVisitorLogs(connection);
    await connection.commit();
    await printSummary(connection);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

bootstrap().catch((error: unknown) => {
  console.error('展示数据填充失败。');
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
