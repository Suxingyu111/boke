import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { FriendLink, Page, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { SanitizePipe } from '../src/common/pipes/sanitize.pipe';
import { AdminPagesController } from '../src/modules/pages/admin-pages.controller';
import { PublicPagesController } from '../src/modules/pages/public-pages.controller';
import { PagesService } from '../src/modules/pages/pages.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createMockUuid = (index: number): string =>
  `10000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;

const matchWhere = <T extends Record<string, unknown>>(
  item: T,
  where?: Partial<T> | Array<Partial<T>>,
): boolean => {
  if (!where) {
    return true;
  }

  const conditions = Array.isArray(where) ? where : [where];

  return conditions.some(condition =>
    Object.entries(condition).every(([key, expectedValue]) => item[key] === expectedValue),
  );
};

const createRepositoryMock = <T extends ObjectLiteral>(seed: T[] = []): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: (payload as { id?: string }).id ?? createMockUuid(items.length + 1),
    })),
    find: jest
      .fn()
      .mockImplementation(async (options?: { where?: Partial<T> | Array<Partial<T>> }) => {
        return items.filter(item => matchWhere(item as Record<string, unknown>, options?.where));
      }),
    findOne: jest
      .fn()
      .mockImplementation(async (options: { where: Partial<T> | Array<Partial<T>> }) => {
        return (
          items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null
        );
      }),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const index = items.findIndex(
        item => (item as { id?: string }).id === (entity as { id?: string }).id,
      );

      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const savedEntity = cloneValue({
        ...entity,
        id: (entity as { id?: string }).id ?? createMockUuid(items.length + 1),
      });
      items.push(savedEntity);
      return savedEntity;
    }),
    remove: jest.fn().mockImplementation(async (entity: T) => {
      const index = items.findIndex(
        item => (item as { id?: string }).id === (entity as { id?: string }).id,
      );
      if (index >= 0) {
        items.splice(index, 1);
      }

      return entity;
    }),
    delete: jest.fn().mockImplementation(async (criteria: Partial<T>) => {
      const targets = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => matchWhere(item as Record<string, unknown>, criteria));

      targets
        .map(target => target.index)
        .sort((left, right) => right - left)
        .forEach(index => {
          items.splice(index, 1);
        });

      return { affected: targets.length, raw: {} };
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
      lastLoginAt: null,
      passwordChangedAt: new Date('2026-04-18T00:00:00.000Z'),
      createdAt: new Date('2026-04-16T00:00:00.000Z'),
      updatedAt: new Date('2026-04-16T00:00:00.000Z'),
    };

    return true;
  }
}

describe('Pages integration', () => {
  let app: INestApplication;
  let pageRepository: RepositoryMock<Page>;
  let friendLinkRepository: RepositoryMock<FriendLink>;

  beforeAll(async () => {
    pageRepository = createRepositoryMock<Page>();
    friendLinkRepository = createRepositoryMock<FriendLink>();

    const moduleBuilder = Test.createTestingModule({
      controllers: [AdminPagesController, PublicPagesController],
      providers: [
        PagesService,
        RolesGuard,
        {
          provide: getRepositoryToken(Page),
          useValue: pageRepository,
        },
        {
          provide: getRepositoryToken(FriendLink),
          useValue: friendLinkRepository,
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
      new SanitizePipe(),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('应支持关于我页面和自定义页面的创建、发布与公开访问', async () => {
    const aboutResponse = await request(app.getHttpServer())
      .post('/api/admin/pages')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-1')
      .send({
        title: '关于我',
        slug: 'about',
        pageType: 'about',
        content: '个人简介和联系方式',
        summary: '后端工程师 / 写作者',
        status: 'published',
        isHomeVisible: true,
        seoTitle: '关于我',
        seoDescription: '个人简介',
      })
      .expect(201);

    const customResponse = await request(app.getHttpServer())
      .post('/api/admin/pages')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-1')
      .send({
        title: '项目介绍',
        slug: 'project-intro',
        pageType: 'custom',
        content: '这里是项目介绍内容',
        status: 'draft',
      })
      .expect(201);

    expect(aboutResponse.body.data).toEqual(
      expect.objectContaining({
        slug: 'about',
        pageType: 'about',
        status: 'published',
      }),
    );
    expect(customResponse.body.data).toEqual(
      expect.objectContaining({
        slug: 'project-intro',
        status: 'draft',
      }),
    );

    const adminListResponse = await request(app.getHttpServer())
      .get('/api/admin/pages')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(adminListResponse.body.data).toHaveLength(2);

    await request(app.getHttpServer()).get('/api/pages/project-intro').expect(404);

    await request(app.getHttpServer())
      .patch(`/api/admin/pages/${customResponse.body.data.id}`)
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-2')
      .send({
        status: 'published',
        summary: '项目合集',
        seoTitle: '项目介绍页',
        seoDescription: '项目介绍 SEO 描述',
      })
      .expect(200);

    const aboutPublicResponse = await request(app.getHttpServer())
      .get('/api/pages/about')
      .expect(200);

    expect(aboutPublicResponse.body.data).toEqual(
      expect.objectContaining({
        slug: 'about',
        pageType: 'about',
      }),
    );

    const customPublicResponse = await request(app.getHttpServer())
      .get('/api/pages/project-intro')
      .expect(200);

    expect(customPublicResponse.body.data).toEqual(
      expect.objectContaining({
        slug: 'project-intro',
        status: 'published',
        summary: '项目合集',
      }),
    );
  });

  it('创建页面时应净化 contentHtml 中的危险标签与属性', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/admin/pages')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-richtext-1')
      .send({
        title: '富文本页面',
        slug: 'richtext-page',
        pageType: 'custom',
        content: '页面正文',
        contentHtml:
          '<p onclick="alert(1)">段落</p><img src="https://example.com/image.png" onerror="alert(1)"><script>alert(1)</script>',
        status: 'published',
      })
      .expect(201);

    expect(response.body.data.contentHtml).toContain('<p>段落</p>');
    expect(response.body.data.contentHtml).toContain('src="https://example.com/image.png"');
    expect(response.body.data.contentHtml).not.toContain('onerror');
    expect(response.body.data.contentHtml).not.toContain('<script');
  });

  it('应校验关于页唯一和 slug 唯一，并支持页面删除', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/pages')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-1')
      .send({
        title: '作品集',
        slug: 'portfolio',
        pageType: 'portfolio',
        content: '作品集内容',
        status: 'published',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/admin/pages')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-1')
      .send({
        title: '第二个关于我',
        slug: 'about-second',
        pageType: 'about',
        content: '重复 about',
        status: 'published',
      })
      .expect(409);

    const duplicateSlugResponse = await request(app.getHttpServer())
      .post('/api/admin/pages')
      .set('x-test-role', 'admin')
      .set('x-test-user-id', 'admin-1')
      .send({
        title: '重复 slug 页面',
        slug: 'portfolio',
        pageType: 'custom',
        content: '重复 slug',
      })
      .expect(409);

    expect(duplicateSlugResponse.body.message).toBe('页面 slug 已存在');

    const targetPage = pageRepository.items.find(item => item.slug === 'portfolio');
    expect(targetPage).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/api/admin/pages/${targetPage?.id}`)
      .set('x-test-role', 'admin')
      .expect(200);

    await request(app.getHttpServer()).get('/api/pages/portfolio').expect(404);
  });

  it('应支持友链申请、审核与公开展示', async () => {
    const applicationResponse = await request(app.getHttpServer())
      .post('/api/friend-links/applications')
      .send({
        siteName: '申请中的博客',
        siteUrl: 'https://pending.example.com',
        description: '等待审核',
        contactEmail: 'pending@example.com',
        applicantName: '待审核作者',
      })
      .expect(201);

    const approvedResponse = await request(app.getHttpServer())
      .post('/api/admin/friend-links')
      .set('x-test-role', 'admin')
      .send({
        siteName: '已上线博客',
        siteUrl: 'https://approved.example.com',
        description: '已经通过审核',
        sortOrder: 20,
        status: 'approved',
      })
      .expect(201);

    const publicBeforeApprove = await request(app.getHttpServer())
      .get('/api/friend-links')
      .expect(200);

    expect(publicBeforeApprove.body.data).toHaveLength(1);
    expect(publicBeforeApprove.body.data[0]).toEqual(
      expect.objectContaining({
        siteName: '已上线博客',
      }),
    );

    await request(app.getHttpServer())
      .patch(`/api/admin/friend-links/${applicationResponse.body.data.id}`)
      .set('x-test-role', 'admin')
      .send({
        status: 'approved',
        sortOrder: 1,
      })
      .expect(200);

    const adminListResponse = await request(app.getHttpServer())
      .get('/api/admin/friend-links')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(adminListResponse.body.data).toHaveLength(2);

    const publicAfterApprove = await request(app.getHttpServer())
      .get('/api/friend-links')
      .expect(200);

    expect(publicAfterApprove.body.data).toHaveLength(2);
    expect(publicAfterApprove.body.data.map((item: { siteName: string }) => item.siteName)).toEqual(
      ['申请中的博客', '已上线博客'],
    );

    await request(app.getHttpServer())
      .delete(`/api/admin/friend-links/${approvedResponse.body.data.id}`)
      .set('x-test-role', 'admin')
      .expect(200);

    const finalPublicList = await request(app.getHttpServer()).get('/api/friend-links').expect(200);

    expect(finalPublicList.body.data).toHaveLength(1);
    expect(finalPublicList.body.data[0].siteName).toBe('申请中的博客');
  });
});
