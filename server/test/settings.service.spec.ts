import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FindOperator, ObjectLiteral, Repository } from 'typeorm';
import { SiteSetting } from '@database/entities';
import { SettingsService } from '../src/modules/settings/settings.service';

type RepositoryMock<T extends ObjectLiteral> = Partial<Repository<T>> & {
  items: T[];
};

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
    Object.entries(condition).every(([key, value]) => {
      if (value instanceof FindOperator) {
        const arr = (value as FindOperator<unknown>).value as unknown[];
        return arr.includes(item[key]);
      }
      return item[key] === value;
    }),
  );
};

const createRepositoryMock = <T extends ObjectLiteral & { id?: number }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));
  let nextId = items.length + 1;

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? nextId++,
    })),
    find: jest.fn().mockImplementation(
      async (options?: {
        where?: Partial<T> | Array<Partial<T>>;
      }) => {
        return items.filter(item =>
          matchWhere(item as Record<string, unknown>, options?.where),
        );
      },
    ),
    findOne: jest.fn().mockImplementation(
      async (options: { where: Partial<T> | Array<Partial<T>> }) => {
        return (
          items.find(item => matchWhere(item as Record<string, unknown>, options.where)) ?? null
        );
      },
    ),
    save: jest.fn().mockImplementation(async (entity: T) => {
      const index = entity.id ? items.findIndex(item => item.id === entity.id) : -1;
      if (index >= 0) {
        items[index] = cloneValue(entity);
        return items[index];
      }

      const saved = cloneValue({
        ...entity,
        id: entity.id ?? nextId++,
      });
      items.push(saved);
      return saved;
    }),
    remove: jest.fn().mockImplementation(async (entity: T) => {
      const index = items.findIndex(item => item.id === entity.id);
      if (index >= 0) {
        items.splice(index, 1);
      }
      return entity;
    }),
  };
};

const makeSetting = (overrides: Partial<SiteSetting>): SiteSetting =>
  ({
    id: 1,
    settingKey: 'site_title',
    settingValue: 'My Blog',
    valueType: 'string' as const,
    groupName: 'general',
    description: null,
    isPublic: false,
    createdAt: new Date('2026-04-17T00:00:00.000Z'),
    updatedAt: new Date('2026-04-17T00:00:00.000Z'),
    ...overrides,
  }) as SiteSetting;

describe('SettingsService', () => {
  let service: SettingsService;
  let settingRepository: RepositoryMock<SiteSetting>;

  beforeEach(async () => {
    settingRepository = createRepositoryMock<SiteSetting>([
      makeSetting({ id: 1, settingKey: 'site_title', settingValue: 'My Blog', isPublic: true, groupName: 'general' }),
      makeSetting({ id: 2, settingKey: 'site_description', settingValue: 'A dev blog', isPublic: true, groupName: 'general' }),
      makeSetting({ id: 3, settingKey: 'social_github', settingValue: 'https://github.com/test', isPublic: true, groupName: 'social' }),
      makeSetting({ id: 4, settingKey: 'social_twitter', settingValue: 'https://twitter.com/test', isPublic: true, groupName: 'social' }),
      makeSetting({ id: 5, settingKey: 'smtp_host', settingValue: 'smtp.example.com', isPublic: false, groupName: 'email' }),
    ]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getRepositoryToken(SiteSetting),
          useValue: settingRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findPublicSettings', () => {
    it('should return only public settings as key-value map', async () => {
      const result = await service.findPublicSettings();

      expect(result.site_title).toBe('My Blog');
      expect(result.site_description).toBe('A dev blog');
      expect(result.smtp_host).toBeUndefined();
    });

    it('should aggregate social link settings', async () => {
      const result = await service.findPublicSettings();

      expect(result.socialLinks).toEqual({
        github: 'https://github.com/test',
        twitter: 'https://twitter.com/test',
      });
    });
  });

  describe('findAllSettings', () => {
    it('should return all settings as key-value map', async () => {
      const result = await service.findAllSettings();

      expect(Object.keys(result)).toHaveLength(5);
      expect(result.site_title).toBe('My Blog');
      expect(result.smtp_host).toBe('smtp.example.com');
    });

    it('should filter by groupName when provided', async () => {
      const result = await service.findAllSettings('email');

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.smtp_host).toBe('smtp.example.com');
    });
  });

  describe('findByKey', () => {
    it('should return single setting', async () => {
      const result = await service.findByKey('site_title');

      expect(result.settingKey).toBe('site_title');
      expect(result.settingValue).toBe('My Blog');
    });

    it('should throw NotFoundException for non-existent key', async () => {
      await expect(service.findByKey('nonexistent_key')).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsert', () => {
    it('should create new setting', async () => {
      const result = await service.upsert({
        settingKey: 'new_key',
        settingValue: 'new_value',
        valueType: 'string',
        groupName: 'general',
        isPublic: true,
      });

      expect(result.settingKey).toBe('new_key');
      expect(result.settingValue).toBe('new_value');
      expect(settingRepository.items).toHaveLength(6);
    });

    it('should update existing setting', async () => {
      const result = await service.upsert({
        settingKey: 'site_title',
        settingValue: 'Updated Title',
      });

      expect(result.settingValue).toBe('Updated Title');
      expect(settingRepository.items).toHaveLength(5);
    });
  });

  describe('batchUpsert', () => {
    it('should create/update multiple settings', async () => {
      const result = await service.batchUpsert([
        { settingKey: 'site_title', settingValue: 'Batch Updated' },
        { settingKey: 'batch_new', settingValue: 'brand new' },
      ]);

      expect(result.site_title).toBe('Batch Updated');
      expect(result.batch_new).toBe('brand new');
      expect(settingRepository.items).toHaveLength(6);
    });
  });

  describe('remove', () => {
    it('should delete a setting by key', async () => {
      await service.remove('smtp_host');

      expect(settingRepository.items).toHaveLength(4);
      expect(
        settingRepository.items.find(s => s.settingKey === 'smtp_host'),
      ).toBeUndefined();
    });
  });
});
