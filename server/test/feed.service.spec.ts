import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Article } from '../src/database/entities';
import { FeedService } from '../src/modules/feed/feed.service';

type QueryBuilderMock = {
  leftJoinAndSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  limit: jest.Mock;
  getMany: jest.Mock;
};

const createQueryBuilderMock = (articles: Article[]): QueryBuilderMock => {
  const mock: QueryBuilderMock = {
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    limit: jest.fn(),
    getMany: jest.fn().mockResolvedValue(articles),
  };

  mock.leftJoinAndSelect.mockReturnValue(mock);
  mock.where.mockReturnValue(mock);
  mock.andWhere.mockReturnValue(mock);
  mock.orderBy.mockReturnValue(mock);
  mock.addOrderBy.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  return mock;
};

describe('FeedService', () => {
  const createService = (articles: Article[]) => {
    const queryBuilder = createQueryBuilderMock(articles);
    const articleRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<Article>;

    const configService = {
      get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
        if (key === 'app.name') {
          return '测试博客';
        }
        if (key === 'app.desc') {
          return '测试博客描述';
        }
        return fallback;
      }),
    } as unknown as ConfigService;

    return {
      service: new FeedService(articleRepository, configService),
      queryBuilder,
    };
  };

  it('应生成包含最新 20 篇文章的 RSS', async () => {
    const articles = Array.from({ length: 20 }).map((_, index) => {
      const date = new Date(`2026-04-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`);
      return {
        slug: `article-${index + 1}`,
        title: `文章 ${index + 1}`,
        excerpt: `摘要 ${index + 1}`,
        createdAt: date,
        publishedAt: date,
      } as Article;
    });
    const { service, queryBuilder } = createService(articles);

    const xml = await service.getRssFeed('https://example.com/');

    expect(queryBuilder.limit).toHaveBeenCalledWith(20);
    expect((xml.match(/<item>/g) || []).length).toBe(20);
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('<title>测试博客</title>');
    expect(xml).toContain('https://example.com/articles/article-1');
  });

  it('应生成 Atom 订阅并包含 self link', async () => {
    const articles = [
      {
        slug: 'hello-world',
        title: 'Hello Atom',
        excerpt: 'atom 摘要',
        createdAt: new Date('2026-04-01T08:00:00.000Z'),
        publishedAt: new Date('2026-04-01T08:00:00.000Z'),
        author: {
          nickname: '作者A',
          username: 'author_a',
        },
      } as unknown as Article,
    ];
    const { service } = createService(articles);

    const xml = await service.getAtomFeed('https://example.com');

    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(xml).toContain('rel="self" type="application/atom+xml"');
    expect(xml).toContain('<name>作者A</name>');
    expect(xml).toContain('https://example.com/articles/hello-world');
  });
});
