import { Repository } from 'typeorm';
import { Article } from '../src/database/entities';
import { SearchService } from '../src/modules/search/search.service';

describe('SearchService', () => {
  const createQueryBuilder = () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: 'db-article',
            title: '数据库文章',
            slug: 'db-article',
            excerpt: 'db excerpt',
            publishedAt: new Date('2026-04-18T00:00:00.000Z'),
          },
        ],
        1,
      ]),
    };

    return queryBuilder;
  };

  const createArticleRepository = () => {
    const queryBuilder = createQueryBuilder();

    return {
      repository: {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        find: jest.fn(),
      } as unknown as jest.Mocked<Repository<Article>>,
      queryBuilder,
    };
  };

  const createElasticsearchClient = () => ({
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    search: jest.fn(),
    bulk: jest.fn(),
    index: jest.fn(),
    delete: jest.fn(),
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('应在 ES 恢复后自动切回 ES 搜索', async () => {
    const esClient = createElasticsearchClient();
    const { repository, queryBuilder } = createArticleRepository();

    esClient.indices.exists.mockRejectedValueOnce(new Error('es down')).mockResolvedValue(true);
    esClient.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'es-article',
            _score: 8.8,
            _source: {
              id: 'es-article',
              title: 'ES 文章',
              slug: 'es-article',
              excerpt: 'es excerpt',
              content: 'es content',
              categoryId: 'category-1',
              userId: 'user-1',
              status: 'published',
              publishedAt: '2026-04-18T00:00:00.000Z',
            },
          },
        ],
        total: { value: 1 },
      },
    });

    const service = new SearchService(esClient as never, repository);

    await service.onModuleInit();
    const result = await service.searchArticles({ keyword: 'ES' });

    expect(esClient.search).toHaveBeenCalledTimes(1);
    expect(queryBuilder.getManyAndCount).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: 'es-article',
            title: 'ES 文章',
            slug: 'es-article',
            score: 8.8,
          }),
        ],
        total: 1,
      }),
    );
  });

  it('应允许在 ES 恢复后重建索引', async () => {
    const esClient = createElasticsearchClient();
    const { repository } = createArticleRepository();

    esClient.indices.exists
      .mockRejectedValueOnce(new Error('es down'))
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    esClient.bulk.mockResolvedValue({ errors: false, items: [] });
    esClient.indices.delete.mockResolvedValue({ acknowledged: true });
    esClient.indices.create.mockResolvedValue({ acknowledged: true });
    repository.find = jest.fn().mockResolvedValue([
      {
        id: 'article-1',
        title: '文章 1',
        slug: 'article-1',
        excerpt: 'excerpt',
        content: 'content',
        categoryId: 'category-1',
        userId: 'user-1',
        status: 'published',
        publishedAt: new Date('2026-04-18T00:00:00.000Z'),
      },
    ] as Article[]);

    const service = new SearchService(esClient as never, repository);

    await service.onModuleInit();
    const result = await service.rebuildIndex();

    expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.bulk).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ indexed: 1, failed: 0 });
  });

  it('当 ES 持续不可用时应在冷却窗口内快速回退', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-18T00:00:00.000Z'));

    const esClient = createElasticsearchClient();
    const { repository, queryBuilder } = createArticleRepository();

    esClient.indices.exists.mockRejectedValue(new Error('es down'));

    const service = new SearchService(esClient as never, repository);

    await service.onModuleInit();
    await service.searchArticles({ keyword: 'db' });
    await service.searchArticles({ keyword: 'db' });

    expect(esClient.indices.exists).toHaveBeenCalledTimes(2);
    expect(queryBuilder.getManyAndCount).toHaveBeenCalledTimes(2);
    expect(esClient.search).not.toHaveBeenCalled();
  });
});