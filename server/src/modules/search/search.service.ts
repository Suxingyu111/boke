import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '@elastic/elasticsearch';
import { Article } from '@database/entities';
import { ELASTICSEARCH_CLIENT } from './elasticsearch.provider';
import { SearchArticlesDto } from './dto/search-articles.dto';

const INDEX_NAME = 'blog_articles';
const ES_RECOVERY_COOLDOWN_MS = 10000;
interface EsArticleDoc {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  categoryId: string;
  userId: string;
  status: string;
  publishedAt: string | null;
  tags?: string[];
}

interface SearchHit {
  _id: string;
  _source: EsArticleDoc;
  _score: number;
  highlight?: Record<string, string[]>;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private esAvailable = false;
  private nextRecoveryAttemptAt = 0;
  private recoveryPromise?: Promise<boolean>;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT)
    private readonly esClient: Client,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  async onModuleInit() {
    const available = await this.ensureElasticsearchAvailable(true);

    if (!available) {
      this.logger.warn('Elasticsearch 不可用，搜索将回退到数据库模糊查询');
    }
  }

  private async ensureElasticsearchAvailable(force = false): Promise<boolean> {
    if (this.esAvailable && !force) {
      return true;
    }

    if (this.recoveryPromise) {
      return this.recoveryPromise;
    }

    if (!force && Date.now() < this.nextRecoveryAttemptAt) {
      return false;
    }

    this.recoveryPromise = this.connectElasticsearch(force).finally(() => {
      this.recoveryPromise = undefined;
    });

    return this.recoveryPromise;
  }

  private async connectElasticsearch(force = false): Promise<boolean> {
    try {
      await this.ensureIndex();

      if (!this.esAvailable) {
        this.logger.log('Elasticsearch 索引就绪');
      }

      this.esAvailable = true;
      this.nextRecoveryAttemptAt = 0;
      return true;
    } catch (error) {
      this.markElasticsearchUnavailable(
        `Elasticsearch 初始化失败: ${(error as Error).message}`,
        force ? 0 : ES_RECOVERY_COOLDOWN_MS,
      );
      return false;
    }
  }

  private markElasticsearchUnavailable(message: string, retryAfterMs = ES_RECOVERY_COOLDOWN_MS) {
    this.esAvailable = false;
    this.nextRecoveryAttemptAt = retryAfterMs > 0 ? Date.now() + retryAfterMs : 0;
    this.logger.warn(message);
  }

  /** 创建或确认索引映射 */
  private async ensureIndex(): Promise<void> {
    const exists = await this.esClient.indices.exists({ index: INDEX_NAME });
    if (exists) return;

    await this.esClient.indices.create({
      index: INDEX_NAME,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            blog_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: ['lowercase', 'stop'],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'blog_analyzer' },
          slug: { type: 'keyword' },
          excerpt: { type: 'text', analyzer: 'blog_analyzer' },
          content: { type: 'text', analyzer: 'blog_analyzer' },
          categoryId: { type: 'keyword' },
          userId: { type: 'keyword' },
          status: { type: 'keyword' },
          publishedAt: { type: 'date' },
          tags: { type: 'keyword' },
        },
      },
    });
  }

  /** 全文搜索文章 */
  async searchArticles(dto: SearchArticlesDto) {
    // ES 不可用时回退到数据库
    if (!(await this.ensureElasticsearchAvailable())) {
      return this.fallbackDatabaseSearch(dto);
    }

    try {
      return await this.esSearch(dto);
    } catch (err) {
      this.markElasticsearchUnavailable(`ES 搜索失败，回退数据库: ${(err as Error).message}`);
      return this.fallbackDatabaseSearch(dto);
    }
  }

  private async esSearch(dto: SearchArticlesDto) {
    const { keyword, categoryId, page = 1, pageSize = 10 } = dto;
    const from = (page - 1) * pageSize;

    const must: object[] = [{ term: { status: 'published' } }];

    if (keyword) {
      must.push({
        multi_match: {
          query: keyword,
          fields: ['title^3', 'excerpt^2', 'content'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    if (categoryId) {
      must.push({ term: { categoryId } });
    }

    const result = await this.esClient.search<EsArticleDoc>({
      index: INDEX_NAME,
      from,
      size: pageSize,
      query: { bool: { must } },
      highlight: {
        pre_tags: ['<mark>'],
        post_tags: ['</mark>'],
        fields: {
          title: { number_of_fragments: 0 },
          content: { fragment_size: 200, number_of_fragments: 1 },
        },
      },
      sort: keyword
        ? [{ _score: { order: 'desc' as const } }, { publishedAt: { order: 'desc' as const } }]
        : [{ publishedAt: { order: 'desc' as const } }],
    });

    const hits = (result.hits.hits as SearchHit[]) || [];
    const total =
      typeof result.hits.total === 'number' ? result.hits.total : (result.hits.total?.value ?? 0);

    return {
      items: hits.map(hit => ({
        id: hit._source.id,
        title: hit.highlight?.title?.[0] ?? hit._source.title,
        slug: hit._source.slug,
        excerpt: hit._source.excerpt,
        contentHighlight: hit.highlight?.content?.[0] ?? null,
        publishedAt: hit._source.publishedAt,
        score: hit._score,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 数据库回退搜索 */
  private async fallbackDatabaseSearch(dto: SearchArticlesDto) {
    const { keyword, categoryId, page = 1, pageSize = 10 } = dto;

    const qb = this.articleRepository
      .createQueryBuilder('article')
      .select([
        'article.id',
        'article.title',
        'article.slug',
        'article.excerpt',
        'article.publishedAt',
      ])
      .where('article.status = :status', { status: 'published' })
      .andWhere('article.deleted_at IS NULL');

    if (keyword) {
      qb.andWhere(
        '(article.title LIKE :kw OR article.content_markdown LIKE :kw OR article.summary LIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    if (categoryId) {
      qb.andWhere('article.category_id = :categoryId', { categoryId });
    }

    const [items, total] = await qb
      .orderBy('article.published_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: items.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        contentHighlight: null,
        publishedAt: a.publishedAt,
        score: null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 索引单篇文章到 ES */
  async indexArticle(article: Article, tagNames?: string[]): Promise<void> {
    if (!(await this.ensureElasticsearchAvailable())) return;

    try {
      await this.esClient.index({
        index: INDEX_NAME,
        id: article.id,
        document: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          categoryId: article.categoryId,
          userId: article.userId,
          status: article.status,
          publishedAt: article.publishedAt?.toISOString() ?? null,
          tags: tagNames ?? [],
        },
      });
    } catch (err) {
      this.markElasticsearchUnavailable(`索引文章失败 [${article.id}]: ${(err as Error).message}`);
    }
  }

  /** 从 ES 删除文章 */
  async removeArticle(articleId: string): Promise<void> {
    if (!(await this.ensureElasticsearchAvailable())) return;

    try {
      await this.esClient.delete({ index: INDEX_NAME, id: articleId });
    } catch (err) {
      this.markElasticsearchUnavailable(`删除索引失败 [${articleId}]: ${(err as Error).message}`);
    }
  }

  /** 全量重建索引（后台管理用） */
  async rebuildIndex(): Promise<{ indexed: number; failed: number }> {
    if (!(await this.ensureElasticsearchAvailable())) {
      throw new Error('Elasticsearch 不可用，无法重建索引');
    }

    // 删除旧索引并重建
    const exists = await this.esClient.indices.exists({ index: INDEX_NAME });
    if (exists) {
      await this.esClient.indices.delete({ index: INDEX_NAME });
    }
    await this.ensureIndex();

    const articles = await this.articleRepository.find({
      where: { status: 'published' },
    });

    let indexed = 0;
    let failed = 0;

    // 分批索引，每批 100 条
    const batchSize = 100;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);
      const operations = batch.flatMap(article => [
        { index: { _index: INDEX_NAME, _id: article.id } },
        {
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          content: article.content,
          categoryId: article.categoryId,
          userId: article.userId,
          status: article.status,
          publishedAt: article.publishedAt?.toISOString() ?? null,
          tags: [],
        },
      ]);

      const bulkResult = await this.esClient.bulk({ operations });
      if (bulkResult.errors) {
        const failedItems = bulkResult.items.filter(
          (item: { index?: { error?: unknown } }) => item.index?.error,
        );
        failed += failedItems.length;
        indexed += batch.length - failedItems.length;
      } else {
        indexed += batch.length;
      }
    }

    return { indexed, failed };
  }
}
