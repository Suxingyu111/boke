import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticleTag, ArticleVersion, User } from '@database/entities';

const ARTICLE_NOT_FOUND_MESSAGE = '文章不存在';
const ARTICLE_PERMISSION_DENIED_MESSAGE = '无权操作该文章';
const ARTICLE_VERSION_NOT_FOUND_MESSAGE = '文章版本不存在';

@Injectable()
export class ArticleVersionsService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(ArticleTag)
    private readonly articleTagRepository: Repository<ArticleTag>,
    @InjectRepository(ArticleVersion)
    private readonly articleVersionRepository: Repository<ArticleVersion>,
  ) {}

  async recordVersion(article: Article, operatorId?: string | null, changeNote?: string | null) {
    const tagIds = await this.loadTagIds(article.id);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const versionNo =
        (await this.articleVersionRepository.count({ where: { articleId: article.id } })) + 1;
      const version = this.articleVersionRepository.create({
        articleId: article.id,
        versionNo,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        contentHtml: article.contentHtml,
        coverImage: article.coverImage,
        categoryId: article.categoryId,
        status: article.status,
        visibility: article.visibility,
        allowComment: article.allowComment,
        isTop: article.isTop,
        sortOrder: article.sortOrder,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        seoKeywords: article.seoKeywords,
        scheduledAt: article.scheduledAt,
        publishedAt: article.publishedAt,
        deletedAt: article.deletedAt,
        tagIds,
        operatorId: operatorId ?? null,
        changeNote: changeNote?.trim() || null,
      });

      try {
        return await this.articleVersionRepository.save(version);
      } catch (error) {
        if (attempt === 2 || !this.isDuplicateVersionError(error)) {
          throw error;
        }
      }
    }

    throw new NotFoundException(ARTICLE_VERSION_NOT_FOUND_MESSAGE);
  }

  async listVersions(articleId: string, currentUser: User, page = 1, pageSize = 10) {
    await this.findManagedArticle(articleId, currentUser);

    const [items, total] = await this.articleVersionRepository.findAndCount({
      where: { articleId },
      order: { versionNo: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async getVersionDetail(articleId: string, versionId: string, currentUser: User) {
    await this.findManagedArticle(articleId, currentUser);
    return this.findVersionOrFail(articleId, versionId);
  }

  async restoreVersion(
    articleId: string,
    versionId: string,
    currentUser: User,
    changeNote?: string,
  ) {
    const article = await this.findManagedArticle(articleId, currentUser);
    const version = await this.findVersionOrFail(articleId, versionId);

    await this.recordVersion(article, currentUser.id, changeNote ?? `恢复到版本 v${version.versionNo}`);
    await this.syncArticleTags(articleId, version.tagIds ?? []);

    return this.articleRepository.save({
      ...article,
      slug: version.slug,
      title: version.title,
      excerpt: version.excerpt,
      content: version.content,
      contentHtml: version.contentHtml,
      coverImage: version.coverImage,
      categoryId: version.categoryId,
      status: version.status,
      visibility: version.visibility,
      allowComment: version.allowComment,
      isTop: version.isTop,
      sortOrder: version.sortOrder,
      seoTitle: version.seoTitle,
      seoDescription: version.seoDescription,
      seoKeywords: version.seoKeywords,
      scheduledAt: version.scheduledAt,
      publishedAt: version.publishedAt,
      deletedAt: version.deletedAt,
      updatedAt: new Date(),
    });
  }

  private async findManagedArticle(articleId: string, currentUser: User): Promise<Article> {
    const article = await this.articleRepository.findOne({ where: { id: articleId } });

    if (!article) {
      throw new NotFoundException(ARTICLE_NOT_FOUND_MESSAGE);
    }

    const canManageAll = ['admin', 'super_admin'].includes(currentUser.role);
    if (!canManageAll && article.userId !== currentUser.id) {
      throw new ForbiddenException(ARTICLE_PERMISSION_DENIED_MESSAGE);
    }

    return article;
  }

  private async findVersionOrFail(articleId: string, versionId: string): Promise<ArticleVersion> {
    const version = await this.articleVersionRepository.findOne({
      where: {
        id: versionId,
        articleId,
      },
    });

    if (!version) {
      throw new NotFoundException(ARTICLE_VERSION_NOT_FOUND_MESSAGE);
    }

    return version;
  }

  private async loadTagIds(articleId: string): Promise<string[]> {
    const relations = await this.articleTagRepository.find({ where: { articleId } });
    return relations.map(relation => relation.tagId);
  }

  private async syncArticleTags(articleId: string, tagIds: string[]) {
    await this.articleTagRepository.delete({ articleId });

    if (tagIds.length === 0) {
      return;
    }

    for (const tagId of tagIds) {
      await this.articleTagRepository.save(
        this.articleTagRepository.create({
          articleId,
          tagId,
        }),
      );
    }
  }

  private isDuplicateVersionError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const candidate = error as { code?: string; errno?: number; message?: string };
    return (
      candidate.code === 'ER_DUP_ENTRY' ||
      candidate.errno === 1062 ||
      candidate.message?.includes('uk_article_versions_article_version') === true
    );
  }
}