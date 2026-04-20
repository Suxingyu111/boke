import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { SiteSetting, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { I18nController } from '../src/modules/i18n/i18n.controller';
import { I18nService } from '../src/modules/i18n/i18n.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createRepositoryMock = <T extends ObjectLiteral>(seed: T[] = []): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: (payload as { id?: number }).id ?? items.length + 1,
    })),
    findOne: jest.fn().mockImplementation(async (options: { where: Partial<T> }) => {
      return (
        items.find(item => {
          return Object.entries(options.where).every(([key, expectedValue]) => {
            return (item as Record<string, unknown>)[key] === expectedValue;
          });
        }) ?? null
      );
    }),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const entityWithId = entity as T & { id?: number; createdAt?: Date; updatedAt?: Date };
      const now = new Date('2026-04-20T14:00:00.000Z');
      const index = items.findIndex(item => (item as { id?: number }).id === entityWithId.id);

      if (index >= 0) {
        const updatedEntity = cloneValue({
          ...items[index],
          ...entityWithId,
          updatedAt: entityWithId.updatedAt ?? now,
        });
        items[index] = updatedEntity;
        return updatedEntity;
      }

      const savedEntity = cloneValue({
        ...entityWithId,
        id: entityWithId.id ?? items.length + 1,
        createdAt: entityWithId.createdAt ?? now,
        updatedAt: entityWithId.updatedAt ?? now,
      });
      items.push(savedEntity);
      return savedEntity;
    }),
  };
};

const now = new Date('2026-04-20T10:00:00.000Z');

const makeSetting = (overrides: Partial<SiteSetting> = {}): SiteSetting => ({
  id: 1,
  settingKey: 'default_locale',
  settingValue: 'en-US',
  valueType: 'string',
  groupName: 'i18n',
  description: '站点默认语言',
  isPublic: true,
  createdAt: now,
  updatedAt: now,
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
      phone: null,
      password: '',
      nickname: '管理员',
      registrationType: 'email',
      emailVerifiedAt: new Date('2026-04-18T00:00:00.000Z'),
      phoneVerifiedAt: null,
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      oauthProvider: null,
      oauthProviderId: null,
      lastLoginAt: null,
      passwordChangedAt: new Date('2026-04-18T00:00:00.000Z'),
      createdAt: now,
      updatedAt: now,
    };

    return true;
  }
}

describe('I18n integration', () => {
  let app: INestApplication;
  let settingRepository: RepositoryMock<SiteSetting>;

  beforeAll(async () => {
    settingRepository = createRepositoryMock<SiteSetting>([
      makeSetting(),
      makeSetting({
        id: 2,
        settingKey: 'i18n_en-US',
        settingValue: {
          'site.home': 'Homepage',
          'common.save': 'Store',
        },
        valueType: 'json',
        groupName: 'i18n',
        description: '英文翻译覆盖',
      }),
    ]);

    const moduleBuilder = Test.createTestingModule({
      controllers: [I18nController],
      providers: [
        I18nService,
        RolesGuard,
        {
          provide: getRepositoryToken(SiteSetting),
          useValue: settingRepository,
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

  it('应返回支持语言、默认语言和合并后的翻译包', async () => {
    const localesResponse = await request(app.getHttpServer())
      .get('/api/i18n/locales')
      .expect(200);

    expect(localesResponse.body.data).toEqual([
      { code: 'zh-CN', name: '中文' },
      { code: 'en-US', name: 'English' },
    ]);

    const defaultResponse = await request(app.getHttpServer())
      .get('/api/i18n/default')
      .expect(200);

    expect(defaultResponse.body.data).toBe('en-US');

    const translationsResponse = await request(app.getHttpServer())
      .get('/api/i18n/translations/en-US')
      .expect(200);

    expect(translationsResponse.body.data).toEqual(
      expect.objectContaining({
        'site.home': 'Homepage',
        'common.save': 'Store',
        'site.search': 'Search',
      }),
    );
  });

  it('应允许管理员修改默认语言，并在非法语言时返回错误', async () => {
    const updateResponse = await request(app.getHttpServer())
      .put('/api/i18n/default')
      .set('x-test-role', 'admin')
      .send({ locale: 'zh-CN' })
      .expect(200);

    expect(updateResponse.body.data).toEqual({ locale: 'zh-CN' });

    const defaultResponse = await request(app.getHttpServer())
      .get('/api/i18n/default')
      .expect(200);

    expect(defaultResponse.body.data).toBe('zh-CN');
    expect(
      settingRepository.items.find(item => item.settingKey === 'default_locale')?.settingValue,
    ).toBe('zh-CN');

    await request(app.getHttpServer())
      .put('/api/i18n/default')
      .set('x-test-role', 'admin')
      .send({ locale: 'fr-FR' })
      .expect(404);
  });

  it('应拒绝普通用户修改默认语言，并在缺失配置时回退到中文', async () => {
    await request(app.getHttpServer())
      .put('/api/i18n/default')
      .set('x-test-role', 'user')
      .send({ locale: 'en-US' })
      .expect(403);

    settingRepository.items = settingRepository.items.filter(
      item => item.settingKey !== 'default_locale',
    );

    const response = await request(app.getHttpServer()).get('/api/i18n/default').expect(200);

    expect(response.body.data).toBe('zh-CN');
  });
});
