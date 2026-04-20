import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { ObjectLiteral, Repository } from 'typeorm';
import { MediaAsset, User } from '@database/entities';
import { MEDIA_STORAGE_ROOT, MediaAssetsService, UploadedMediaFile } from './media-assets.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

const PNG_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360606060000000050001a5f645400000000049454e44ae426082',
  'hex',
);

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const matchWhere = <T extends Record<string, unknown>>(
  item: T,
  where?: Partial<T> | Array<Partial<T>>,
): boolean => {
  if (!where) {
    return true;
  }

  const conditions = Array.isArray(where) ? where : [where];

  return conditions.some(condition =>
    Object.entries(condition).every(([key, value]) => item[key] === value),
  );
};

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? `media-${items.length + 1}`,
    })),
    find: jest.fn().mockResolvedValue(items),
    findOne: jest.fn().mockImplementation(async (options: { where: Partial<T> | Array<Partial<T>> }) => {
      return items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null;
    }),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const index = entity.id ? items.findIndex(item => item.id === entity.id) : -1;
      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const saved = cloneValue({
        ...entity,
        id: entity.id ?? `media-${items.length + 1}`,
      });
      items.push(saved);
      return saved;
    }),
    delete: jest.fn().mockImplementation(async (criteria: Partial<T> | string) => {
      const normalizedCriteria =
        typeof criteria === 'string' ? ({ id: criteria } as unknown as Partial<T>) : criteria;
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
    findAndCount: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
        skip?: number;
        take?: number;
      }) => {
        const matched = items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        );
        const skip = options?.skip ?? 0;
        const take = options?.take ?? matched.length;

        return [matched.slice(skip, skip + take), matched.length];
      },
    ),
  };
};

describe('MediaAssetsService', () => {
  let service: MediaAssetsService;
  let mediaAssetRepository: RepositoryMock<MediaAsset>;
  let storageRoot: string;

  beforeEach(async () => {
    storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-media-assets-service-'));
    mediaAssetRepository = createRepositoryMock<MediaAsset>([]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MediaAssetsService,
        {
          provide: getRepositoryToken(MediaAsset),
          useValue: mediaAssetRepository,
        },
        {
          provide: MEDIA_STORAGE_ROOT,
          useValue: storageRoot,
        },
      ],
    }).compile();

    service = moduleRef.get(MediaAssetsService);
  });

  afterEach(async () => {
    await fs.rm(storageRoot, { recursive: true, force: true });
  });

  it('重复上传相同文件时应复用已有媒体记录', async () => {
    const file = {
      originalname: 'cover.png',
      mimetype: 'image/png',
      size: PNG_BUFFER.length,
      buffer: PNG_BUFFER,
    };
    const currentUser = {
      id: 'author-1',
      role: 'author',
    } as User;

    const first = await service.upload(file as UploadedMediaFile, currentUser, '封面图');
    const second = await service.upload(file as UploadedMediaFile, currentUser, '封面图');

    expect(first.id).toBe(second.id);
    expect(mediaAssetRepository.items).toHaveLength(1);
  });

  it('删除媒体时应同时删除物理文件', async () => {
    const created = await service.upload(
        {
          originalname: 'cover.png',
          mimetype: 'image/png',
          size: PNG_BUFFER.length,
          buffer: PNG_BUFFER,
        } as UploadedMediaFile,
      {
        id: 'author-1',
        role: 'author',
      } as User,
      '删除测试',
    );

    const absolutePath = path.join(storageRoot, created.fileName);
    await fs.access(absolutePath);

    await service.remove(created.id, {
      id: 'author-1',
      role: 'author',
    } as User);

    await expect(fs.access(absolutePath)).rejects.toThrow();
    expect(mediaAssetRepository.items).toHaveLength(0);
  });

  it('作者仅能查看自己的媒体列表', async () => {
    await service.upload(
      {
        originalname: 'author-file.png',
        mimetype: 'image/png',
        size: PNG_BUFFER.length,
        buffer: Buffer.concat([PNG_BUFFER, Buffer.from('01', 'hex')]),
      } as UploadedMediaFile,
      {
        id: 'author-1',
        role: 'author',
      } as User,
      '作者文件',
    );
    await service.upload(
      {
        originalname: 'admin-file.png',
        mimetype: 'image/png',
        size: PNG_BUFFER.length,
        buffer: Buffer.concat([PNG_BUFFER, Buffer.from('02', 'hex')]),
      } as UploadedMediaFile,
      {
        id: 'admin-1',
        role: 'admin',
      } as User,
      '管理员文件',
    );

    const authorList = await service.list(
      1,
      10,
      undefined,
      {
        id: 'author-1',
        role: 'author',
      } as User,
    );
    const adminList = await service.list(
      1,
      10,
      undefined,
      {
        id: 'admin-1',
        role: 'admin',
      } as User,
    );

    expect(authorList.items).toHaveLength(1);
    expect(authorList.items[0].uploadedBy).toBe('author-1');
    expect(adminList.items).toHaveLength(2);
  });

  it('作者不能修改或删除其他人的媒体资源', async () => {
    const created = await service.upload(
      {
        originalname: 'admin-file.png',
        mimetype: 'image/png',
        size: PNG_BUFFER.length,
        buffer: Buffer.concat([PNG_BUFFER, Buffer.from('03', 'hex')]),
      } as UploadedMediaFile,
      {
        id: 'admin-1',
        role: 'admin',
      } as User,
      '管理员文件',
    );

    await expect(
      service.findById(
        created.id,
        {
          id: 'author-1',
          role: 'author',
        } as User,
      ),
    ).rejects.toThrow('无权操作该媒体资源');

    await expect(
      service.update(
        created.id,
        '新的描述',
        {
          id: 'author-1',
          role: 'author',
        } as User,
      ),
    ).rejects.toThrow('无权操作该媒体资源');

    await expect(
      service.remove(
        created.id,
        {
          id: 'author-1',
          role: 'author',
        } as User,
      ),
    ).rejects.toThrow('无权操作该媒体资源');
  });

  it('文件扩展名与内容签名不一致时应拒绝上传', async () => {
    await expect(
      service.upload(
        {
          originalname: 'cover.png',
          mimetype: 'image/png',
          size: 24,
          buffer: Buffer.from('%PDF-1.4 fake file', 'utf8'),
        } as UploadedMediaFile,
        {
          id: 'author-1',
          role: 'author',
        } as User,
      ),
    ).rejects.toThrow('文件内容与声明类型不匹配');
  });
});
