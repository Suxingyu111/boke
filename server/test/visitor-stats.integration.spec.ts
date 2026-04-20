import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { User, VisitorLog } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { AdminVisitorStatsController } from '../src/modules/visitor-stats/admin-visitor-stats.controller';
import { PublicVisitorStatsController } from '../src/modules/visitor-stats/public-visitor-stats.controller';
import { VisitorStatsService } from '../src/modules/visitor-stats/visitor-stats.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => structuredClone(value);

class VisitorLogQueryBuilderMock {
  private readonly source: VisitorLog[];
  private selects: Array<{ expression: string; alias?: string }> = [];
  private params: Record<string, unknown> = {};
  private limitValue?: number;

  constructor(items: VisitorLog[]) {
    this.source = items.map(item => cloneValue(item));
  }

  select(expression: string, alias?: string): this {
    this.selects = [{ expression, alias }];
    return this;
  }

  addSelect(expression: string, alias?: string): this {
    this.selects.push({ expression, alias });
    return this;
  }

  where(_query: string, params?: Record<string, unknown>): this {
    this.params = { ...this.params, ...(params ?? {}) };
    return this;
  }

  groupBy(): this {
    return this;
  }

  orderBy(): this {
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  async getRawOne(): Promise<Record<string, string | number> | null> {
    if (this.selects.some(select => select.alias === 'count')) {
      const today = String(this.params.today ?? '');
      const uniqueIps = new Set(
        this.source.filter(item => item.visitDate === today).map(item => item.ip),
      );
      return { count: uniqueIps.size };
    }

    if (this.selects.some(select => select.alias === 'avgStayDuration')) {
      const today = String(this.params.today ?? '');
      const todayItems = this.source.filter(item => item.visitDate === today);
      const avg =
        todayItems.length === 0
          ? 0
          : todayItems.reduce((sum, item) => sum + item.stayDuration, 0) / todayItems.length;
      return { avgStayDuration: avg };
    }

    return null;
  }

  async getRawMany(): Promise<Array<Record<string, string | number | null>>> {
    if (this.selects.some(select => select.alias === 'date')) {
      const startDate = String(this.params.startDate ?? '');
      const endDate = String(this.params.endDate ?? '');
      const groups = new Map<string, { totalVisits: number; uniqueVisitors: Set<string> }>();

      this.source
        .filter(item => item.visitDate >= startDate && item.visitDate <= endDate)
        .forEach(item => {
          const current = groups.get(item.visitDate) ?? {
            totalVisits: 0,
            uniqueVisitors: new Set<string>(),
          };
          current.totalVisits += 1;
          current.uniqueVisitors.add(item.ip);
          groups.set(item.visitDate, current);
        });

      return [...groups.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, value]) => ({
          date,
          totalVisits: value.totalVisits,
          uniqueVisitors: value.uniqueVisitors.size,
        }));
    }

    if (this.selects.some(select => select.alias === 'path')) {
      const since = String(this.params.since ?? '');
      const groups = new Map<string, { visits: number; uniqueVisitors: Set<string> }>();

      this.source
        .filter(item => item.visitDate >= since)
        .forEach(item => {
          const current = groups.get(item.path) ?? {
            visits: 0,
            uniqueVisitors: new Set<string>(),
          };
          current.visits += 1;
          current.uniqueVisitors.add(item.ip);
          groups.set(item.path, current);
        });

      return [...groups.entries()]
        .sort(([, left], [, right]) => right.visits - left.visits)
        .slice(0, this.limitValue)
        .map(([path, value]) => ({
          path,
          visits: value.visits,
          uniqueVisitors: value.uniqueVisitors.size,
        }));
    }

    if (this.selects.some(select => select.alias === 'referer')) {
      const since = String(this.params.since ?? '');
      const groups = new Map<string, number>();

      this.source
        .filter(item => item.visitDate >= since && item.referer)
        .forEach(item => {
          groups.set(item.referer!, (groups.get(item.referer!) ?? 0) + 1);
        });

      return [...groups.entries()]
        .sort(([, left], [, right]) => right - left)
        .slice(0, this.limitValue ?? 20)
        .map(([referer, count]) => ({
          referer,
          count,
        }));
    }

    if (this.selects.some(select => select.alias === 'name')) {
      const since = String(this.params.since ?? '');
      const fieldExpression = this.selects.find(select => select.alias === 'name')?.expression ?? '';
      const field = fieldExpression.replace('v.', '');
      const groups = new Map<string, number>();

      this.source
        .filter(item => item.visitDate >= since)
        .forEach(item => {
          const value = item[field as keyof VisitorLog];
          if (typeof value === 'string' && value) {
            groups.set(value, (groups.get(value) ?? 0) + 1);
          }
        });

      return [...groups.entries()]
        .sort(([, left], [, right]) => right - left)
        .slice(0, this.limitValue ?? 10)
        .map(([name, count]) => ({
          name,
          count,
        }));
    }

    return [];
  }
}

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? `visitor-${items.length + 1}`,
    })),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const index = entity.id ? items.findIndex(item => item.id === entity.id) : -1;
      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const saved = cloneValue({
        ...entity,
        id: entity.id ?? `visitor-${items.length + 1}`,
        createdAt: (entity as T & { createdAt?: Date }).createdAt ?? new Date(),
      });
      items.push(saved);
      return saved;
    }),
    count: jest.fn().mockImplementation(async (options?: { where?: Partial<T> }) => {
      if (!options?.where) {
        return items.length;
      }

      return items.filter(item =>
        Object.entries(options.where ?? {}).every(([key, value]) => item[key as keyof T] === value),
      ).length;
    }),
    createQueryBuilder: jest.fn().mockImplementation(() => {
      return new VisitorLogQueryBuilderMock(items as unknown as VisitorLog[]);
    }),
  };
};

const now = new Date('2026-04-20T12:30:00.000Z');
const today = new Date().toISOString().slice(0, 10);

const makeVisitorLog = (overrides: Partial<VisitorLog> = {}): VisitorLog => ({
  id: 'visitor-1',
  ip: '203.0.113.1',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0',
  referer: 'https://github.com',
  path: '/articles/seo',
  visitDate: today,
  stayDuration: 42,
  country: null,
  city: null,
  device: 'Desktop',
  browser: 'Chrome',
  os: 'Windows',
  createdAt: now,
  ...overrides,
});

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: User;
    }>();

    const role = request.headers['x-test-role'];
    if (!role) {
      return false;
    }

    request.user = {
      id: request.headers['x-test-user-id'] ?? 'admin-1',
      username: request.headers['x-test-username'] ?? 'admin',
      email: request.headers['x-test-email'] ?? 'admin@example.com',
      password: '',
      nickname: '管理员',
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      oauthProvider: null,
      oauthProviderId: null,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    return true;
  }
}

describe('Visitor stats integration', () => {
  let app: INestApplication;
  let visitorLogRepository: RepositoryMock<VisitorLog>;

  beforeAll(async () => {
    visitorLogRepository = createRepositoryMock<VisitorLog>([
      makeVisitorLog({
        id: 'visitor-1',
        ip: '203.0.113.1',
        path: '/articles/seo',
        referer: 'https://github.com',
        stayDuration: 30,
      }),
      makeVisitorLog({
        id: 'visitor-2',
        ip: '203.0.113.2',
        path: '/articles/seo',
        referer: 'https://google.com',
        stayDuration: 90,
      }),
      makeVisitorLog({
        id: 'visitor-3',
        ip: '203.0.113.1',
        path: '/archives',
        referer: null,
        stayDuration: 60,
        device: 'Mobile',
        browser: 'Safari',
        os: 'iOS',
      }),
      makeVisitorLog({
        id: 'visitor-4',
        ip: '203.0.113.9',
        path: '/articles/old',
        referer: 'https://news.ycombinator.com',
        stayDuration: 15,
        visitDate: '2026-04-01',
      }),
    ]);

    const moduleBuilder = Test.createTestingModule({
      controllers: [PublicVisitorStatsController, AdminVisitorStatsController],
      providers: [
        VisitorStatsService,
        RolesGuard,
        {
          provide: getRepositoryToken(VisitorLog),
          useValue: visitorLogRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new MockJwtAuthGuard());

    const moduleRef: TestingModule = await moduleBuilder.compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('应记录公开访问日志，并解析真实 IP 与设备信息', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/stats/visit')
      .set('x-forwarded-for', '198.51.100.15, 10.0.0.1')
      .set(
        'user-agent',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Safari',
      )
      .send({
        path: '/articles/new-post',
        referer: 'https://example.com',
        stayDuration: 25,
      })
      .expect(201);

    expect(response.body.data).toEqual({ recorded: true });

    const created = visitorLogRepository.items.find(item => item.path === '/articles/new-post');
    expect(created).toEqual(
      expect.objectContaining({
        ip: '198.51.100.15',
        referer: 'https://example.com',
        stayDuration: 25,
        device: 'Mobile',
        browser: 'Safari',
        os: 'iOS',
      }),
    );
  });

  it('应返回管理员统计摘要、热门页面、来源和设备数据', async () => {
    const todayResponse = await request(app.getHttpServer())
      .get('/api/admin/stats/today')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(todayResponse.body.data).toEqual({
      totalVisits: 4,
      uniqueVisitors: 3,
      avgStayDuration: 51,
    });

    const rangeResponse = await request(app.getHttpServer())
      .get(`/api/admin/stats/range?startDate=2026-04-01&endDate=${today}`)
      .set('x-test-role', 'admin')
      .expect(200);

    expect(rangeResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: today,
          totalVisits: 4,
          uniqueVisitors: 3,
        }),
      ]),
    );

    const topPagesResponse = await request(app.getHttpServer())
      .get('/api/admin/stats/top-pages?limit=1&days=30')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(topPagesResponse.body.data).toEqual([
      {
        path: '/articles/seo',
        visits: 2,
        uniqueVisitors: 2,
      },
    ]);

    const referersResponse = await request(app.getHttpServer())
      .get('/api/admin/stats/referers?days=30')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(referersResponse.body.data).toEqual(
      expect.arrayContaining([
        { referer: 'https://github.com', visits: 1 },
        { referer: 'https://google.com', visits: 1 },
      ]),
    );

    const devicesResponse = await request(app.getHttpServer())
      .get('/api/admin/stats/devices?days=30')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(devicesResponse.body.data).toEqual({
      devices: expect.arrayContaining([
        { name: 'Desktop', count: 3 },
        { name: 'Mobile', count: 2 },
      ]),
      browsers: expect.arrayContaining([
        { name: 'Chrome', count: 3 },
        { name: 'Safari', count: 2 },
      ]),
      os: expect.arrayContaining([
        { name: 'Windows', count: 3 },
        { name: 'iOS', count: 2 },
      ]),
    });
  });

  it('应拒绝普通用户访问后台统计接口，并对非法数值参数返回 400', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/stats/today')
      .set('x-test-role', 'user')
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/admin/stats/top-pages?limit=abc&days=30')
      .set('x-test-role', 'admin')
      .expect(400);
  });
});
