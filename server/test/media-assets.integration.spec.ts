import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { ObjectLiteral, Repository } from 'typeorm';
import { MediaAsset, User } from '../src/database/entities';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AdminMediaAssetsController } from '../src/modules/media-assets/admin-media-assets.controller';
import { PublicMediaAssetsController } from '../src/modules/media-assets/public-media-assets.controller';
import { MediaAssetsService, MEDIA_STORAGE_ROOT } from '../src/modules/media-assets/media-assets.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createMockUuid = (index: number): string =>
  `30000000-0000-4000-8000-${index.toString().padStart(12, '0')}`;

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

const applyOrder = <T extends Record<string, unknown>>(
  items: T[],
  order?: Partial<Record<string, 'ASC' | 'DESC'>>,
): T[] => {
  if (!order) {
    return items;
  }

  const [orderField, orderDirection] = Object.entries(order)[0] as [string, 'ASC' | 'DESC'];

  return [...items].sort((left, right) => {
    const leftValue = left[orderField] as string | number | Date | null;
    const rightValue = right[orderField] as string | number | Date | null;

    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue === null || leftValue === undefined) {
      return 1;
    }

    if (rightValue === null || rightValue === undefined) {
      return -1;
    }

    const leftComparable = leftValue instanceof Date ? leftValue.getTime() : leftValue;
    const rightComparable = rightValue instanceof Date ? rightValue.getTime() : rightValue;

    if (leftComparable < rightComparable) {
      return orderDirection === 'ASC' ? -1 : 1;
    }

    return orderDirection === 'ASC' ? 1 : -1;
  });
};

const createRepositoryMock = <T extends ObjectLiteral>(seed: T[] = []): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: (payload as { id?: string }).id ?? createMockUuid(items.length + 1),
    })),
    find: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<string, 'ASC' | 'DESC'>>;
      }) => {
        const matched = items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        );

        return applyOrder(matched, options?.order);
      },
    ),
    findAndCount: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        order?: Partial<Record<string, 'ASC' | 'DESC'>>;
        skip?: number;
        take?: number;
      }) => {
        const matched = applyOrder(
          items.filter(item => matchWhere(item as Record<string, unknown>, options?.where)),
          options?.order,
        );
        const skip = options?.skip ?? 0;
        const take = options?.take ?? matched.length;

        return [matched.slice(skip, skip + take), matched.length];
      },
    ),
    findOne: jest.fn().mockImplementation(async (options: { where: Partial<T> | Array<Partial<T>> }) => {
      return items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null;
    }),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const entityWithId = entity as { id?: string };
      const index = entityWithId.id
        ? items.findIndex(item => (item as { id?: string }).id === entityWithId.id)
        : -1;

      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const savedEntity = cloneValue({
        ...entity,
        id: entityWithId.id ?? createMockUuid(items.length + 1),
      });
      items.push(savedEntity);
      return savedEntity;
    }),
    delete: jest.fn().mockImplementation(async (criteria: Partial<T> | string) => {
      const normalizedCriteria =
        typeof criteria === 'string'
          ? ({ id: criteria } as unknown as Partial<T>)
          : criteria;

      const targets = items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => matchWhere(item as Record<string, unknown>, normalizedCriteria));

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
      id: request.headers['x-test-user-id'] ?? 'author-1',
      username: request.headers['x-test-username'] ?? 'author',
      email: request.headers['x-test-email'] ?? 'author@example.com',
      phone: null,
      password: '',
      nickname: '作者',
      registrationType: 'email',
      emailVerifiedAt: new Date('2026-04-18T00:00:00.000Z'),
      phoneVerifiedAt: null,
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      lastLoginAt: null,
      passwordChangedAt: new Date('2026-04-18T00:00:00.000Z'),
      createdAt: new Date('2026-04-18T00:00:00.000Z'),
      updatedAt: new Date('2026-04-18T00:00:00.000Z'),
    };

    return true;
  }
}

describe('MediaAssets integration', () => {
  let app: INestApplication;
  let mediaAssetRepository: RepositoryMock<MediaAsset>;
  let storageRoot: string;

  beforeAll(async () => {
    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-media-assets-'));
    mediaAssetRepository = createRepositoryMock<MediaAsset>();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminMediaAssetsController, PublicMediaAssetsController],
      providers: [
        MediaAssetsService,
        RolesGuard,
        {
          provide: getRepositoryToken(MediaAsset),
          useValue: mediaAssetRepository,
        },
        {
          provide: MEDIA_STORAGE_ROOT,
          useValue: storageRoot,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new MockJwtAuthGuard())
      .compile();

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
    await fs.rm(storageRoot, { recursive: true, force: true });
  });

  it('应支持媒体文件上传、列表、详情、更新备注、删除和公开访问', async () => {
    const pngBuffer = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360606060000000050001a5f645400000000049454e44ae426082',
      'hex',
    );

    const uploadResponse = await request(app.getHttpServer())
      .post('/api/admin/media-assets/upload')
      .set('x-test-role', 'author')
      .attach('file', pngBuffer, {
        filename: 'cover.png',
        contentType: 'image/png',
      })
      .field('altText', '封面图')
      .expect(201);

    expect(uploadResponse.body.data).toEqual(
      expect.objectContaining({
        originalName: 'cover.png',
        mimeType: 'image/png',
        altText: '封面图',
      }),
    );

    const assetId = uploadResponse.body.data.id as string;
    const fileName = uploadResponse.body.data.fileName as string;

    const listResponse = await request(app.getHttpServer())
      .get('/api/admin/media-assets?page=1&pageSize=10')
      .set('x-test-role', 'author')
      .expect(200);

    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.meta.total).toBe(1);

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/admin/media-assets/${assetId}`)
      .set('x-test-role', 'author')
      .expect(200);

    expect(detailResponse.body.data).toEqual(
      expect.objectContaining({
        id: assetId,
        fileName,
      }),
    );

    await request(app.getHttpServer())
      .patch(`/api/admin/media-assets/${assetId}`)
      .set('x-test-role', 'author')
      .send({ altText: '新封面图' })
      .expect(200);

    const fileResponse = await request(app.getHttpServer())
      .get(`/api/media-assets/files/${fileName}`)
      .expect(200);

    expect(fileResponse.headers['content-type']).toContain('image/png');
    expect(fileResponse.body).toBeInstanceOf(Buffer);

    await request(app.getHttpServer())
      .delete(`/api/admin/media-assets/${assetId}`)
      .set('x-test-role', 'author')
      .expect(200);

    expect(mediaAssetRepository.items).toHaveLength(0);
  });
});