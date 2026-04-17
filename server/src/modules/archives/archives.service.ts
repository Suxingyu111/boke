import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '@database/entities';

export interface ArchiveMonth {
  year: number;
  month: number;
  count: number;
}

export interface ArchiveArticle {
  id: string;
  title: string;
  slug: string;
  publishedAt: Date;
  coverImage: string | null;
  excerpt: string | null;
}

export interface ArchiveGroup {
  year: number;
  month: number;
  articles: ArchiveArticle[];
}

@Injectable()
export class ArchivesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  /** 获取归档统计：每个年月有多少篇已发布文章 */
  async getArchiveSummary(): Promise<ArchiveMonth[]> {
    const result = await this.articleRepository
      .createQueryBuilder('article')
      .select('YEAR(article.published_at)', 'year')
      .addSelect('MONTH(article.published_at)', 'month')
      .addSelect('COUNT(*)', 'count')
      .where('article.status = :status', { status: 'published' })
      .andWhere('article.deleted_at IS NULL')
      .groupBy('YEAR(article.published_at)')
      .addGroupBy('MONTH(article.published_at)')
      .orderBy('year', 'DESC')
      .addOrderBy('month', 'DESC')
      .getRawMany<{ year: string; month: string; count: string }>();

    return result.map(row => ({
      year: Number(row.year),
      month: Number(row.month),
      count: Number(row.count),
    }));
  }

  /** 获取某年某月的归档文章列表 */
  async getArchiveArticles(year: number, month: number): Promise<ArchiveGroup> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const articles = await this.articleRepository
      .createQueryBuilder('article')
      .select([
        'article.id',
        'article.title',
        'article.slug',
        'article.publishedAt',
        'article.coverImage',
        'article.excerpt',
      ])
      .where('article.status = :status', { status: 'published' })
      .andWhere('article.deleted_at IS NULL')
      .andWhere('article.published_at >= :startDate', { startDate })
      .andWhere('article.published_at < :endDate', { endDate })
      .orderBy('article.published_at', 'DESC')
      .getMany();

    return {
      year,
      month,
      articles: articles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        publishedAt: a.publishedAt!,
        coverImage: a.coverImage,
        excerpt: a.excerpt,
      })),
    };
  }
}
