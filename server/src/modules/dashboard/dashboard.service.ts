import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Article, Category, Tag, Page, FriendLink } from '@database/entities';

export interface DashboardStats {
  articleCount: number;
  totalViewCount: number;
  totalCommentCount: number;
  categoryCount: number;
  tagCount: number;
  draftCount: number;
  publishedCount: number;
  pageCount: number;
  friendLinkCount: number;
}

export interface RecentArticle {
  id: string;
  title: string;
  slug: string;
  status: string;
  viewCount: number;
  commentCount: number;
  publishedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(FriendLink)
    private readonly friendLinkRepository: Repository<FriendLink>,
  ) {}

  /** 获取仪表盘统计数据 */
  async getStats(): Promise<DashboardStats> {
    const [
      articleCount,
      viewCountResult,
      commentCountResult,
      categoryCount,
      tagCount,
      draftCount,
      publishedCount,
      pageCount,
      friendLinkCount,
    ] = await Promise.all([
      this.articleRepository.count({ where: { deletedAt: IsNull() } }),
      this.articleRepository
        .createQueryBuilder('a')
        .select('COALESCE(SUM(a.view_count), 0)', 'total')
        .where('a.deleted_at IS NULL')
        .getRawOne<{ total: string }>(),
      this.articleRepository
        .createQueryBuilder('a')
        .select('COALESCE(SUM(a.comment_count), 0)', 'total')
        .where('a.deleted_at IS NULL')
        .getRawOne<{ total: string }>(),
      this.categoryRepository.count(),
      this.tagRepository.count(),
      this.articleRepository.count({
        where: { status: 'draft', deletedAt: IsNull() },
      }),
      this.articleRepository.count({
        where: { status: 'published', deletedAt: IsNull() },
      }),
      this.pageRepository.count(),
      this.friendLinkRepository.count(),
    ]);

    return {
      articleCount,
      totalViewCount: parseInt(viewCountResult?.total ?? '0', 10),
      totalCommentCount: parseInt(commentCountResult?.total ?? '0', 10),
      categoryCount,
      tagCount,
      draftCount,
      publishedCount,
      pageCount,
      friendLinkCount,
    };
  }

  /** 获取最近发布/更新的文章 */
  async getRecentArticles(limit = 10): Promise<RecentArticle[]> {
    const articles = await this.articleRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['id', 'title', 'slug', 'status', 'viewCount', 'commentCount', 'publishedAt', 'createdAt'],
    });

    return articles.map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      status: a.status,
      viewCount: a.viewCount,
      commentCount: a.commentCount,
      publishedAt: a.publishedAt,
      createdAt: a.createdAt,
    }));
  }
}
