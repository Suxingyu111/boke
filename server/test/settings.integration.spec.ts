import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { SiteSetting, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { SettingsController } from '../src/modules/settings/settings.controller';
import { SettingsService } from '../src/modules/settings/settings.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

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
    find: jest.fn().mockImplementation(async (options?: { where?: Partial<T> }) => {
      if (!options?.where) {
        return items;
      }

      return items.filter(item => {
        return Object.entries(options.where ?? {}).every(([key, expectedValue]) => {
          return (item as Record<string, unknown>)[key] === expectedValue;
        });
      });
    }),
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
      const entityWithId = entity as { id?: number };
      const index = items.findIndex(item => (item as { id?: number }).id === entityWithId.id);

      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const savedEntity = cloneValue({
        ...entity,
        id: entityWithId.id ?? items.length + 1,
      });
      items.push(savedEntity);
      return savedEntity;
    }),
    remove: jest.fn().mockImplementation(async (entity: T) => {
      const index = items.findIndex(
        item => (item as { id?: number }).id === (entity as { id?: number }).id,
      );
      if (index >= 0) {
        items.splice(index, 1);
      }

      return entity;
    }),
  };
};

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
      id: request.headers['x-test-user-id'] ?? 'admin-user-id',
      username: request.headers['x-test-username'] ?? 'admin',
      email: request.headers['x-test-email'] ?? 'admin@example.com',
      password: '',
      nickname: '管理员',
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      lastLoginAt: null,
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    };

    return true;
  }
}

describe('Settings integration', () => {
  let app: INestApplication;
  let settingRepository: RepositoryMock<SiteSetting>;

  beforeAll(async () => {
    settingRepository = createRepositoryMock<SiteSetting>();

    const moduleBuilder = Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        SettingsService,
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

  it('应支持批量维护前台展示设置，并向公开接口返回结构化社交链接', async () => {
    await request(app.getHttpServer())
      .put('/api/admin/settings/batch')
      .set('x-test-role', 'admin')
      .send({
        settings: [
          {
            settingKey: 'site_title',
            settingValue: '山海博客',
            valueType: 'string',
            groupName: 'general',
            description: '站点标题',
            isPublic: true,
          },
          {
            settingKey: 'site_copyright',
            settingValue: '© 2026 山海博客',
            valueType: 'string',
            groupName: 'general',
            description: '版权信息',
            isPublic: true,
          },
          {
            settingKey: 'site_icp',
            settingValue: '京ICP备2026000001号',
            valueType: 'string',
            groupName: 'general',
            description: '备案号',
            isPublic: true,
          },
          {
            settingKey: 'social_github',
            settingValue: 'https://github.com/example',
            valueType: 'string',
            groupName: 'social',
            description: 'GitHub 主页',
            isPublic: true,
          },
          {
            settingKey: 'social_x',
            settingValue: 'https://x.com/example',
            valueType: 'string',
            groupName: 'social',
            description: 'X 主页',
            isPublic: true,
          },
        ],
      })
      .expect(200);

    const publicResponse = await request(app.getHttpServer()).get('/api/settings').expect(200);

    expect(publicResponse.body.data).toEqual(
      expect.objectContaining({
        site_title: '山海博客',
        site_copyright: '© 2026 山海博客',
        site_icp: '京ICP备2026000001号',
        socialLinks: {
          github: 'https://github.com/example',
          x: 'https://x.com/example',
        },
      }),
    );
  });

  it('应允许可选站点设置保存为空字符串', async () => {
    await request(app.getHttpServer())
      .put('/api/admin/settings/batch')
      .set('x-test-role', 'admin')
      .send({
        settings: [
          {
            settingKey: 'site_author',
            settingValue: '',
            valueType: 'string',
            groupName: 'general',
            description: '站点作者',
            isPublic: true,
          },
          {
            settingKey: 'site_keywords',
            settingValue: '',
            valueType: 'string',
            groupName: 'general',
            description: 'SEO 关键词',
            isPublic: true,
          },
          {
            settingKey: 'og_image',
            settingValue: '',
            valueType: 'string',
            groupName: 'general',
            description: '社交分享图',
            isPublic: true,
          },
        ],
      })
      .expect(200);

    const adminResponse = await request(app.getHttpServer())
      .get('/api/admin/settings')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(adminResponse.body.data).toEqual(
      expect.objectContaining({
        site_author: '',
        site_keywords: '',
        og_image: '',
      }),
    );
  });
});
