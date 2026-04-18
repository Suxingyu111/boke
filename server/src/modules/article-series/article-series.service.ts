import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleSeries, ArticleSeriesItem, User } from '@database/entities';
import { CreateArticleSeriesDto } from './dto/create-article-series.dto';
import { SeriesItemDto } from './dto/series-item.dto';
import { UpdateArticleSeriesDto } from './dto/update-article-series.dto';

const ARTICLE_SERIES_NOT_FOUND_MESSAGE = '文章系列不存在';
const ARTICLE_SERIES_SLUG_EXISTS_MESSAGE = '文章系列 slug 已存在';
const ARTICLE_NOT_FOUND_MESSAGE = '文章不存在';
const ARTICLE_SERIES_PERMISSION_DENIED_MESSAGE = '无权操作该文章系列';

@Injectable()
export class ArticleSeriesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(ArticleSeries)
    private readonly articleSeriesRepository: Repository<ArticleSeries>,
    @InjectRepository(ArticleSeriesItem)
    private readonly articleSeriesItemRepository: Repository<ArticleSeriesItem>,
  ) {}

  async create(dto: CreateArticleSeriesDto, currentUser: User) {
    await this.ensureSeriesSlugUnique(dto.slug);

    const series = this.articleSeriesRepository.create({
      name: dto.name.trim(),
      slug: dto.slug.trim(),
      description: dto.description?.trim() ?? null,
      coverImageUrl: dto.coverImageUrl?.trim() ?? null,
      status: dto.status ?? 'draft',
      createdBy: currentUser.id,
    });

    const savedSeries = await this.articleSeriesRepository.save(series);
    await this.replaceItems(savedSeries.id, dto.items ?? [], currentUser);
    return this.buildAdminDetail(savedSeries);
  }

  async findAdminList(page = 1, pageSize = 10, currentUser: User) {
    const where = ['admin', 'super_admin'].includes(currentUser.role)
      ? undefined
      : { createdBy: currentUser.id };
    const [items, total] = await this.articleSeriesRepository.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const enrichedItems = await Promise.all(items.map(item => this.buildAdminDetail(item)));

    return {
      items: enrichedItems,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async findAdminDetail(id: string, currentUser: User) {
    const series = await this.findManagedSeries(id, currentUser);
    return this.buildAdminDetail(series);
  }

  async update(id: string, dto: UpdateArticleSeriesDto, currentUser: User) {
    const series = await this.findManagedSeries(id, currentUser);

    if (dto.slug && dto.slug.trim() !== series.slug) {
      await this.ensureSeriesSlugUnique(dto.slug, series.id);
    }

    const savedSeries = await this.articleSeriesRepository.save({
      ...series,
      name: dto.name?.trim() ?? series.name,
      slug: dto.slug?.trim() ?? series.slug,
      description: dto.description !== undefined ? (dto.description?.trim() ?? null) : series.description,
      coverImageUrl:
        dto.coverImageUrl !== undefined ? (dto.coverImageUrl?.trim() ?? null) : series.coverImageUrl,
      status: dto.status ?? series.status,
      updatedAt: new Date(),
    });

    if (dto.items) {
      await this.replaceItems(savedSeries.id, dto.items, currentUser);
    }

    return this.buildAdminDetail(savedSeries);
  }

  async remove(id: string, currentUser: User) {
    const series = await this.findManagedSeries(id, currentUser);
    await this.articleSeriesItemRepository.delete({ seriesId: series.id });
    await this.articleSeriesRepository.delete(series.id);
    return { message: '文章系列删除成功' };
  }

  async findPublicList() {
    const seriesList = await this.articleSeriesRepository.find({
      where: { status: 'published' },
      order: { updatedAt: 'DESC' },
    });

    return seriesList.map(series => ({
      id: series.id,
      name: series.name,
      slug: series.slug,
      description: series.description,
      coverImageUrl: series.coverImageUrl,
      createdAt: series.createdAt,
      updatedAt: series.updatedAt,
    }));
  }

  async findPublicDetail(slug: string) {
    const series = await this.articleSeriesRepository.findOne({
      where: { slug, status: 'published' },
    });
    if (!series) {
      throw new NotFoundException(ARTICLE_SERIES_NOT_FOUND_MESSAGE);
    }

    const items = await this.findSeriesItems(series.id);
    const articles = await this.articleRepository.find();
    const visibleArticles = items
      .map(item => ({
        item,
        article: articles.find(article => article.id === item.articleId) ?? null,
      }))
      .filter(
        candidate =>
          candidate.article &&
          candidate.article.status === 'published' &&
          candidate.article.visibility === 'public' &&
          candidate.article.deletedAt === null,
      )
      .map(candidate => ({
        id: candidate.article!.id,
        title: candidate.article!.title,
        slug: candidate.article!.slug,
        excerpt: candidate.article!.excerpt,
        coverImage: candidate.article!.coverImage,
        publishedAt: candidate.article!.publishedAt,
        sortOrder: candidate.item.sortOrder,
      }));

    return {
      id: series.id,
      name: series.name,
      slug: series.slug,
      description: series.description,
      coverImageUrl: series.coverImageUrl,
      items: visibleArticles,
      createdAt: series.createdAt,
      updatedAt: series.updatedAt,
    };
  }

  private async buildAdminDetail(series: ArticleSeries) {
    const items = await this.findSeriesItems(series.id);

    return {
      ...series,
      items,
    };
  }

  private async replaceItems(seriesId: string, items: SeriesItemDto[], currentUser: User) {
    this.ensureUniqueSortOrder(items);
    await this.ensureArticlesManageable(items.map(item => item.articleId), currentUser);
    await this.articleSeriesItemRepository.delete({ seriesId });

    for (const item of items) {
      await this.articleSeriesItemRepository.save(
        this.articleSeriesItemRepository.create({
          seriesId,
          articleId: item.articleId,
          sortOrder: item.sortOrder,
        }),
      );
    }
  }

  private ensureUniqueSortOrder(items: SeriesItemDto[]) {
    const uniqueOrders = new Set(items.map(item => item.sortOrder));
    if (uniqueOrders.size !== items.length) {
      throw new ConflictException('系列文章排序不能重复');
    }
  }

  private async ensureArticlesManageable(articleIds: string[], currentUser: User) {
    const uniqueArticleIds = [...new Set(articleIds)];
    if (uniqueArticleIds.length === 0) {
      return;
    }

    const articles = await Promise.all(
      uniqueArticleIds.map(articleId => this.articleRepository.findOne({ where: { id: articleId } })),
    );

    for (const article of articles) {
      if (!article) {
        throw new NotFoundException(ARTICLE_NOT_FOUND_MESSAGE);
      }

      const canManageAll = ['admin', 'super_admin'].includes(currentUser.role);
      if (!canManageAll && article.userId !== currentUser.id) {
        throw new ForbiddenException(ARTICLE_SERIES_PERMISSION_DENIED_MESSAGE);
      }
    }
  }

  private async findManagedSeries(id: string, currentUser: User): Promise<ArticleSeries> {
    const series = await this.articleSeriesRepository.findOne({ where: { id } });
    if (!series) {
      throw new NotFoundException(ARTICLE_SERIES_NOT_FOUND_MESSAGE);
    }

    const canManageAll = ['admin', 'super_admin'].includes(currentUser.role);
    if (!canManageAll && series.createdBy !== currentUser.id) {
      throw new ForbiddenException(ARTICLE_SERIES_PERMISSION_DENIED_MESSAGE);
    }

    return series;
  }

  private async ensureSeriesSlugUnique(slug: string, currentId?: string) {
    const series = await this.articleSeriesRepository.findOne({ where: { slug: slug.trim() } });
    if (series && series.id !== currentId) {
      throw new ConflictException(ARTICLE_SERIES_SLUG_EXISTS_MESSAGE);
    }
  }

  private async findSeriesItems(seriesId: string) {
    const items = await this.articleSeriesItemRepository.find({
      where: { seriesId },
      order: { sortOrder: 'ASC' },
    });

    return items;
  }
}