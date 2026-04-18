import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { Article, ArticleTag, Tag } from '@database/entities';
import { TagsService } from '../src/modules/tags/tags.service';

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
    Object.entries(condition).every(([key, value]) => item[key] === value),
  );
};

const createRepositoryMock = <T extends ObjectLiteral & { id?: string }>(
  seed: T[] = [],
): RepositoryMock<T> => {
  const items = seed.map(item => cloneValue(item));
  let autoId = items.length;

  return {
    items,
    create: jest.fn().mockImplementation((payload: Partial<T>) => ({
      ...payload,
      id: payload.id ?? `auto-${++autoId}`,
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
        id: entity.id ?? `auto-${++autoId}`,
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

describe('TagsService', () => {
  let service: TagsService;
  let tagRepository: RepositoryMock<Tag>;
  let articleTagRepository: RepositoryMock<ArticleTag>;
  let articleRepository: RepositoryMock<Article>;

  const NOW = new Date('2026-04-17T00:00:00.000Z');

  const seedTags: Tag[] = [
    {
      id: 'tag-1',
      name: 'TypeScript',
      slug: 'typescript',
      articleCount: 5,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'tag-2',
      name: 'NestJS',
      slug: 'nestjs',
      articleCount: 3,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'tag-3',
      name: 'Angular',
      slug: 'angular',
      articleCount: 3,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  const seedArticle: Article = {
    id: 'article-1',
    title: '测试文章',
    slug: 'test-article',
    excerpt: null,
    content: '# content',
    contentHtml: null,
    coverImage: null,
    categoryId: 'category-1',
    category: null as unknown as Article['category'],
    status: 'published',
    visibility: 'public',
    allowComment: true,
    isTop: false,
    sortOrder: 0,
    viewCount: 0,
    likes: 0,
    commentCount: 0,
    seoTitle: null,
    seoDescription: null,
    seoKeywords: null,
    userId: 'author-1',
    author: null as unknown as Article['author'],
    scheduledAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    publishedAt: NOW,
    deletedAt: null,
  };

  beforeEach(async () => {
    tagRepository = createRepositoryMock<Tag>(seedTags);
    articleTagRepository = createRepositoryMock<ArticleTag>([]);
    articleRepository = createRepositoryMock<Article>([seedArticle]);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: tagRepository,
        },
        {
          provide: getRepositoryToken(ArticleTag),
          useValue: articleTagRepository,
        },
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
      ],
    }).compile();

    service = moduleRef.get(TagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a tag with valid data', async () => {
      const result = await service.create({ name: 'React', slug: 'react' });

      expect(result).toEqual(
        expect.objectContaining({ name: 'React', slug: 'react' }),
      );
      expect(tagRepository.create).toHaveBeenCalledWith({ name: 'React', slug: 'react' });
      expect(tagRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug already exists', async () => {
      await expect(
        service.create({ name: 'Duplicate', slug: 'typescript' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all tags sorted by articleCount DESC then name', async () => {
      const result = await service.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('tag-1');
      // Angular and NestJS both have articleCount 3; 'Angular' < 'NestJS' in zh-CN
      expect(result[1].id).toBe('tag-3');
      expect(result[2].id).toBe('tag-2');
    });
  });

  describe('findById', () => {
    it('should return tag by ID', async () => {
      const result = await service.findById('tag-1');

      expect(result).toEqual(expect.objectContaining({ id: 'tag-1', name: 'TypeScript' }));
    });

    it('should throw NotFoundException for non-existent tag', async () => {
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update tag fields', async () => {
      const result = await service.update('tag-2', { name: 'Nest.js', slug: 'nest-js' });

      expect(result).toEqual(expect.objectContaining({ name: 'Nest.js', slug: 'nest-js' }));
      expect(tagRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug conflicts', async () => {
      await expect(
        service.update('tag-2', { slug: 'typescript' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete tag with no articles', async () => {
      const result = await service.remove('tag-1');

      expect(result).toEqual({ message: '标签删除成功' });
      expect(tagRepository.remove).toHaveBeenCalled();
      expect(tagRepository.items.find(t => t.id === 'tag-1')).toBeUndefined();
    });

    it('should throw ConflictException when tag has active articles', async () => {
      // Seed an article-tag relation linking tag-2 to the active article
      articleTagRepository.items.push({
        articleId: 'article-1',
        tagId: 'tag-2',
        article: null as unknown as ArticleTag['article'],
        tag: null as unknown as ArticleTag['tag'],
        createdAt: NOW,
      });

      await expect(service.remove('tag-2')).rejects.toThrow(ConflictException);
    });
  });
});
