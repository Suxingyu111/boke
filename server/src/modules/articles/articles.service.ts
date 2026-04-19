import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { Article, ArticleLike, ArticleTag, Category, Tag, User } from '@database/entities';
import { ArticleVersionsService } from './article-versions.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';

type ArticleStatus = 'draft' | 'scheduled' | 'published' | 'archived';
type ArticleVisibility = 'public' | 'private' | 'password';

type ArticleView = Article & {
  category: Category;
  author: User;
  tags: Tag[];
  status: ArticleStatus;
  visibility: ArticleVisibility;
};

const ARTICLE_NOT_FOUND_MESSAGE = '文章不存在';
const ARTICLE_SLUG_EXISTS_MESSAGE = '文章 slug 已存在';
const CATEGORY_NOT_FOUND_MESSAGE = '分类不存在';
const TAG_NOT_FOUND_MESSAGE = '标签不存在';
const ARTICLE_PERMISSION_DENIED_MESSAGE = '无权操作该文章';
const SCHEDULED_AT_REQUIRED_MESSAGE = 'scheduledAt 在定时发布时必填';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(ArticleTag)
    private readonly articleTagRepository: Repository<ArticleTag>,
    @InjectRepository(ArticleLike)
    private readonly articleLikeRepository: Repository<ArticleLike>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly articleVersionsService: ArticleVersionsService,
  ) {}

  async create(dto: CreateArticleDto, currentUser: User): Promise<ArticleView> {
    await this.ensureSlugUnique(dto.slug);
    await this.ensureCategoryExists(dto.categoryId);
    const tags = await this.loadTags(dto.tagIds ?? []);
    const publication = this.resolvePublicationState({
      status: dto.status ?? 'draft',
      scheduledAt: dto.scheduledAt,
    });

    const article = this.articleRepository.create({
      title: dto.title.trim(),
      slug: dto.slug.trim(),
      excerpt: dto.excerpt?.trim() ?? null,
      content: dto.content,
      contentHtml: dto.contentHtml?.trim() ?? null,
      coverImage: dto.coverImage?.trim() ?? null,
      categoryId: dto.categoryId,
      userId: currentUser.id,
      status: publication.status,
      visibility: dto.visibility ?? 'public',
      allowComment: dto.allowComment ?? true,
      isTop: dto.isTop ?? false,
      sortOrder: dto.sortOrder ?? 0,
      seoTitle: dto.seoTitle?.trim() ?? null,
      seoDescription: dto.seoDescription?.trim() ?? null,
      seoKeywords: dto.seoKeywords?.trim() ?? null,
      scheduledAt: publication.scheduledAt,
      publishedAt: publication.publishedAt,
      viewCount: 0,
      likes: 0,
      commentCount: 0,
      deletedAt: null,
    });

    const savedArticle = await this.articleRepository.save(article);
    await this.syncArticleTags(
      savedArticle.id,
      tags.map(tag => tag.id),
    );
    await this.refreshStatistics(
      savedArticle.categoryId,
      tags.map(tag => tag.id),
    );
    await this.articleVersionsService.recordVersion(savedArticle, currentUser.id, '创建文章');

    return this.buildArticleView(savedArticle);
  }

  async findAdminList(query: ListArticlesDto, currentUser: User) {
    const articles = await this.articleRepository.find();
    const filteredArticles = articles.filter(article => {
      if (currentUser.role === 'author' && article.userId !== currentUser.id) {
        return false;
      }

      if (query.status && article.status !== query.status) {
        return false;
      }

      if (query.categoryId && article.categoryId !== query.categoryId) {
        return false;
      }

      return true;
    });

    const articlesWithTags = await this.attachTags(filteredArticles);
    const keyword = query.keyword?.trim().toLowerCase();
    const tagId = query.tagId;

    const result = articlesWithTags.filter(article => {
      if (tagId && !article.tags.some(tag => tag.id === tagId)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [article.title, article.excerpt ?? '', article.content]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });

    const sortedItems = this.sortArticles(
      result,
      query.sortBy ?? 'updatedAt',
      query.order ?? 'DESC',
    );
    return this.buildPaginatedResponse(sortedItems, query.page, query.pageSize);
  }

  async findAdminDetail(id: string, currentUser: User): Promise<ArticleView> {
    const article = await this.findManagedArticle(id, currentUser);
    return this.buildArticleView(article);
  }

  async exportArticle(
    id: string,
    format: 'markdown' | 'json',
    currentUser: User,
  ): Promise<{ fileName: string; contentType: string; content: string }> {
    const article = await this.findManagedArticle(id, currentUser);
    const articleView = await this.buildArticleView(article);

    if (format === 'json') {
      return {
        fileName: `${article.slug}.json`,
        contentType: 'application/json; charset=utf-8',
        content: JSON.stringify(articleView, null, 2),
      };
    }

    const markdown = [
      '---',
      `title: ${article.title}`,
      `slug: ${article.slug}`,
      `status: ${article.status}`,
      `visibility: ${article.visibility}`,
      `category: ${articleView.category.name}`,
      `tags: ${articleView.tags.map(tag => tag.name).join(', ')}`,
      `publishedAt: ${this.formatExportDate(article.publishedAt)}`,
      '---',
      '',
      article.content,
    ].join('\n');

    return {
      fileName: `${article.slug}.md`,
      contentType: 'text/markdown; charset=utf-8',
      content: markdown,
    };
  }

  async update(id: string, dto: UpdateArticleDto, currentUser: User): Promise<ArticleView> {
    const article = await this.findManagedArticle(id, currentUser);

    if (dto.slug && dto.slug.trim() !== article.slug) {
      await this.ensureSlugUnique(dto.slug, article.id);
    }

    const nextCategoryId = dto.categoryId ?? article.categoryId;
    if (nextCategoryId !== article.categoryId) {
      await this.ensureCategoryExists(nextCategoryId);
    }

    const nextStatus = dto.status ?? article.status;
    const publication = this.resolvePublicationState({
      currentArticle: article,
      status: nextStatus,
      scheduledAt: dto.scheduledAt,
    });

    const previousTags = await this.findArticleTags(article.id);
    const nextTags = dto.tagIds ? await this.loadTags(dto.tagIds) : previousTags;

    const updatedArticle: Article = {
      ...article,
      title: dto.title?.trim() ?? article.title,
      slug: dto.slug?.trim() ?? article.slug,
      excerpt: dto.excerpt !== undefined ? (dto.excerpt?.trim() ?? null) : article.excerpt,
      content: dto.content ?? article.content,
      contentHtml:
        dto.contentHtml !== undefined ? (dto.contentHtml?.trim() ?? null) : article.contentHtml,
      coverImage:
        dto.coverImage !== undefined ? (dto.coverImage?.trim() ?? null) : article.coverImage,
      categoryId: nextCategoryId,
      status: publication.status,
      visibility: dto.visibility ?? article.visibility,
      allowComment: dto.allowComment ?? article.allowComment,
      isTop: dto.isTop ?? article.isTop,
      sortOrder: dto.sortOrder ?? article.sortOrder,
      seoTitle: dto.seoTitle !== undefined ? (dto.seoTitle?.trim() ?? null) : article.seoTitle,
      seoDescription:
        dto.seoDescription !== undefined
          ? (dto.seoDescription?.trim() ?? null)
          : article.seoDescription,
      seoKeywords:
        dto.seoKeywords !== undefined ? (dto.seoKeywords?.trim() ?? null) : article.seoKeywords,
      scheduledAt: publication.scheduledAt,
      publishedAt: publication.publishedAt,
      deletedAt: nextStatus === 'archived' ? (article.deletedAt ?? new Date()) : null,
      updatedAt: new Date(),
    };

    const savedArticle = await this.articleRepository.save(updatedArticle);
    if (dto.tagIds) {
      await this.syncArticleTags(
        savedArticle.id,
        nextTags.map(tag => tag.id),
      );
    }

    await this.refreshStatistics(
      savedArticle.categoryId,
      [...previousTags.map(tag => tag.id), ...nextTags.map(tag => tag.id)],
      article.categoryId,
    );
    await this.articleVersionsService.recordVersion(
      savedArticle,
      currentUser.id,
      dto.changeNote ?? '更新文章',
    );

    return this.buildArticleView(savedArticle);
  }

  private formatExportDate(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? String(value) : parsedDate.toISOString();
  }

  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    const article = await this.findManagedArticle(id, currentUser);
    const tags = await this.findArticleTags(article.id);

    const archivedArticle = await this.articleRepository.save({
      ...article,
      status: 'archived',
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    await this.refreshStatistics(
      article.categoryId,
      tags.map(tag => tag.id),
    );
    await this.articleVersionsService.recordVersion(archivedArticle, currentUser.id, '归档文章');
    return { message: '文章删除成功' };
  }

  async permanentRemove(id: string, currentUser: User): Promise<{ message: string }> {
    const article = await this.findManagedArticle(id, currentUser);
    const tags = await this.findArticleTags(article.id);

    await this.articleTagRepository.delete({ articleId: article.id });
    await this.articleRepository.delete(article.id);
    await this.refreshStatistics(
      article.categoryId,
      tags.map(tag => tag.id),
    );

    return { message: '文章永久删除成功' };
  }

  async findPublicList(query: ListArticlesDto) {
    await this.publishDueArticles();

    const articles = await this.articleRepository.find({
      where: {
        deletedAt: IsNull(),
        status: 'published',
      },
    });

    const now = new Date();
    const visibleArticles = articles.filter(article => {
      if (article.visibility !== 'public') {
        return false;
      }

      if (article.publishedAt && article.publishedAt > now) {
        return false;
      }

      if (query.categoryId && article.categoryId !== query.categoryId) {
        return false;
      }

      return true;
    });

    const articlesWithTags = await this.attachTags(visibleArticles);
    const keyword = query.keyword?.trim().toLowerCase();
    const items = articlesWithTags.filter(article => {
      if (query.tagId && !article.tags.some(tag => tag.id === query.tagId)) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [article.title, article.excerpt ?? '', article.content]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });

    const sortedItems = this.sortArticles(
      items,
      query.sortBy ?? 'publishedAt',
      query.order ?? 'DESC',
    );
    return this.buildPaginatedResponse(
      sortedItems.map(article => this.toPublicListItem(article)),
      query.page,
      query.pageSize,
    );
  }

  async findPublicDetail(slug: string) {
    await this.publishDueArticles();

    const article = await this.articleRepository.findOne({
      where: {
        slug,
        deletedAt: IsNull(),
        status: 'published',
        visibility: 'public',
      },
    });

    if (!article) {
      throw new NotFoundException(ARTICLE_NOT_FOUND_MESSAGE);
    }

    const updatedArticle = await this.articleRepository.save({
      ...article,
      viewCount: article.viewCount + 1,
      updatedAt: new Date(),
    });

    return this.toPublicDetail(await this.buildArticleView(updatedArticle));
  }

  async getLikeStatus(
    articleId: string,
    ip: string | null,
    userAgent: string | null,
    currentUser?: User | null,
  ) {
    const article = await this.findLikeableArticle(articleId);
    const visitorKey = this.buildVisitorKey(ip, userAgent, currentUser?.id ?? null);
    const like = await this.articleLikeRepository.findOne({
      where: { articleId: article.id, visitorKey },
    });

    return {
      liked: Boolean(like),
      likes: article.likes,
    };
  }

  async likeArticle(
    articleId: string,
    ip: string | null,
    userAgent: string | null,
    currentUser?: User | null,
  ) {
    const article = await this.findLikeableArticle(articleId);
    const visitorKey = this.buildVisitorKey(ip, userAgent, currentUser?.id ?? null);
    const existing = await this.articleLikeRepository.findOne({
      where: { articleId: article.id, visitorKey },
    });

    if (existing) {
      return {
        liked: true,
        likes: article.likes,
        message: '已点赞该文章',
      };
    }

    await this.articleLikeRepository.save(
      this.articleLikeRepository.create({
        articleId: article.id,
        userId: currentUser?.id ?? null,
        visitorKey,
        ipAddress: ip?.slice(0, 45) ?? null,
        userAgent: userAgent?.slice(0, 500) ?? null,
      }),
    );

    const updatedArticle = await this.articleRepository.save({
      ...article,
      likes: article.likes + 1,
      updatedAt: new Date(),
    });

    return {
      liked: true,
      likes: updatedArticle.likes,
      message: '点赞成功',
    };
  }

  async unlikeArticle(
    articleId: string,
    ip: string | null,
    userAgent: string | null,
    currentUser?: User | null,
  ) {
    const article = await this.findLikeableArticle(articleId);
    const visitorKey = this.buildVisitorKey(ip, userAgent, currentUser?.id ?? null);
    const like = await this.articleLikeRepository.findOne({
      where: { articleId: article.id, visitorKey },
    });

    if (!like) {
      return {
        liked: false,
        likes: article.likes,
        message: '当前未点赞该文章',
      };
    }

    await this.articleLikeRepository.delete({ id: like.id });
    const updatedArticle = await this.articleRepository.save({
      ...article,
      likes: Math.max(0, article.likes - 1),
      updatedAt: new Date(),
    });

    return {
      liked: false,
      likes: updatedArticle.likes,
      message: '已取消点赞',
    };
  }

  private async findManagedArticle(id: string, currentUser: User): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: {
        id,
      },
    });

    if (!article) {
      throw new NotFoundException(ARTICLE_NOT_FOUND_MESSAGE);
    }

    const canManageAll = ['admin', 'super_admin'].includes(currentUser.role);
    if (!canManageAll && article.userId !== currentUser.id) {
      throw new ForbiddenException(ARTICLE_PERMISSION_DENIED_MESSAGE);
    }

    return article;
  }

  private async findLikeableArticle(articleId: string): Promise<Article> {
    const article = await this.articleRepository.findOne({
      where: {
        id: articleId,
        deletedAt: IsNull(),
        status: 'published',
        visibility: 'public',
      },
    });

    if (!article) {
      throw new NotFoundException(ARTICLE_NOT_FOUND_MESSAGE);
    }

    const publishedAt = this.normalizeDate(article.publishedAt);
    if (publishedAt && publishedAt > new Date()) {
      throw new NotFoundException(ARTICLE_NOT_FOUND_MESSAGE);
    }

    return article;
  }

  private async buildArticleView(article: Article): Promise<ArticleView> {
    const category = await this.categoryRepository.findOne({ where: { id: article.categoryId } });
    if (!category) {
      throw new NotFoundException(CATEGORY_NOT_FOUND_MESSAGE);
    }

    const tags = await this.findArticleTags(article.id);
    const author =
      (await this.userRepository.findOne({ where: { id: article.userId } })) ??
      ({
        id: article.userId,
        username: 'unknown',
        email: '',
        password: '',
        nickname: '作者',
        avatar: null,
        bio: null,
        isActive: true,
        role: 'author',
        lastLoginAt: null,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      } as User);
    return {
      ...article,
      status: article.status as ArticleStatus,
      visibility: article.visibility as ArticleVisibility,
      category,
      author,
      tags,
    };
  }

  private async attachTags(articles: Article[]): Promise<ArticleView[]> {
    return Promise.all(articles.map(article => this.buildArticleView(article)));
  }

  private async findArticleTags(articleId: string): Promise<Tag[]> {
    const relations = await this.articleTagRepository.find({ where: { articleId } });
    if (relations.length === 0) {
      return [];
    }

    const tagIds = relations.map(relation => relation.tagId);
    const tags = await this.tagRepository.find();
    return tags.filter(tag => tagIds.includes(tag.id));
  }

  private async loadTags(tagIds: string[]): Promise<Tag[]> {
    const uniqueTagIds = [...new Set(tagIds)];
    if (uniqueTagIds.length === 0) {
      return [];
    }

    const tags = await this.tagRepository.find();
    const selectedTags = tags.filter(tag => uniqueTagIds.includes(tag.id));

    if (selectedTags.length !== uniqueTagIds.length) {
      throw new NotFoundException(TAG_NOT_FOUND_MESSAGE);
    }

    return selectedTags;
  }

  private async syncArticleTags(articleId: string, tagIds: string[]): Promise<void> {
    await this.articleTagRepository.delete({ articleId });

    for (const tagId of tagIds) {
      await this.articleTagRepository.save(
        this.articleTagRepository.create({
          articleId,
          tagId,
        }),
      );
    }
  }

  private async ensureCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundException(CATEGORY_NOT_FOUND_MESSAGE);
    }
  }

  private async ensureSlugUnique(slug: string, currentId?: string): Promise<void> {
    const article = await this.articleRepository.findOne({ where: { slug: slug.trim() } });
    if (article && article.id !== currentId && article.deletedAt === null) {
      throw new ConflictException(ARTICLE_SLUG_EXISTS_MESSAGE);
    }
  }

  private resolvePublicationState(options: {
    currentArticle?: Article;
    status: ArticleStatus;
    scheduledAt?: string;
  }): Pick<Article, 'status' | 'scheduledAt' | 'publishedAt'> {
    const currentArticle = options.currentArticle;
    const nextStatus = options.status;

    if (nextStatus === 'scheduled') {
      if (!options.scheduledAt) {
        throw new BadRequestException(SCHEDULED_AT_REQUIRED_MESSAGE);
      }

      return {
        status: 'scheduled',
        scheduledAt: new Date(options.scheduledAt),
        publishedAt: null,
      };
    }

    if (nextStatus === 'published') {
      return {
        status: 'published',
        scheduledAt: null,
        publishedAt: currentArticle?.publishedAt ?? new Date(),
      };
    }

    if (nextStatus === 'archived') {
      return {
        status: 'archived',
        scheduledAt: null,
        publishedAt: currentArticle?.publishedAt ?? null,
      };
    }

    return {
      status: 'draft',
      scheduledAt: null,
      publishedAt: null,
    };
  }

  private async publishDueArticles(): Promise<void> {
    const scheduledArticles = await this.articleRepository.find({ where: { status: 'scheduled' } });
    const now = new Date();

    for (const article of scheduledArticles) {
      const scheduledAt = this.normalizeDate(article.scheduledAt);

      if (!article.deletedAt && scheduledAt && scheduledAt <= now) {
        await this.articleRepository.save({
          ...article,
          status: 'published',
          publishedAt: scheduledAt,
          scheduledAt: null,
          updatedAt: now,
        });
      }
    }
  }

  private sortArticles(
    articles: ArticleView[],
    sortBy: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount',
    order: 'ASC' | 'DESC',
  ): ArticleView[] {
    const multiplier = order === 'ASC' ? 1 : -1;

    return [...articles].sort((left, right) => {
      if (left.isTop !== right.isTop) {
        return left.isTop ? -1 : 1;
      }

      const leftValue = this.normalizeSortValue(left[sortBy]);
      const rightValue = this.normalizeSortValue(right[sortBy]);

      if (leftValue === rightValue) {
        return right.createdAt.getTime() - left.createdAt.getTime();
      }

      return leftValue > rightValue ? multiplier : -multiplier;
    });
  }

  private normalizeSortValue(
    value:
      | Article['createdAt']
      | Article['updatedAt']
      | Article['publishedAt']
      | Article['viewCount'],
  ): number {
    if (typeof value === 'number') {
      return value;
    }

    const dateValue = this.normalizeDate(value);
    if (dateValue) {
      return dateValue.getTime();
    }

    return 0;
  }

  private normalizeDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    const normalizedDate = new Date(value);
    return Number.isNaN(normalizedDate.getTime()) ? null : normalizedDate;
  }

  private buildVisitorKey(
    ip: string | null,
    userAgent: string | null,
    userId: string | null,
  ): string {
    if (userId) {
      return `user:${userId}`;
    }

    const fingerprint = [ip?.trim(), userAgent?.trim()].filter(Boolean).join('|');
    if (!fingerprint) {
      throw new BadRequestException('无法识别当前访客，暂时不能点赞');
    }

    return `guest:${createHash('sha256').update(fingerprint).digest('hex').slice(0, 64)}`;
  }

  private buildPaginatedResponse<T>(items: T[], page = 1, pageSize = 10) {
    const normalizedPage = page ?? 1;
    const normalizedPageSize = pageSize ?? 10;
    const startIndex = (normalizedPage - 1) * normalizedPageSize;

    return {
      items: items.slice(startIndex, startIndex + normalizedPageSize),
      meta: {
        total: items.length,
        page: normalizedPage,
        pageSize: normalizedPageSize,
        totalPages: Math.ceil(items.length / normalizedPageSize) || 1,
      },
    };
  }

  private toPublicListItem(article: ArticleView) {
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      coverImage: article.coverImage,
      author: this.toPublicAuthor(article.author),
      category: this.toPublicCategory(article.category),
      tags: article.tags.map(tag => this.toPublicTag(tag)),
      status: article.status,
      allowComment: article.allowComment,
      isTop: article.isTop,
      sortOrder: article.sortOrder,
      viewCount: article.viewCount,
      likes: article.likes,
      commentCount: article.commentCount,
      publishedAt: article.publishedAt,
      createdAt: article.createdAt,
    };
  }

  private toPublicDetail(article: ArticleView) {
    return {
      ...this.toPublicListItem(article),
      content: article.content,
      contentHtml: article.contentHtml,
    };
  }

  private toPublicCategory(category: Category) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      color: category.color,
      articleCount: category.articleCount,
    };
  }

  private toPublicAuthor(author: User) {
    return {
      id: author.id,
      username: author.username,
      nickname: author.nickname ?? author.username,
      avatar: author.avatar,
      bio: author.bio,
      role: author.role,
    };
  }

  private toPublicTag(tag: Tag) {
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      articleCount: tag.articleCount,
    };
  }

  private async refreshStatistics(
    categoryId: string,
    tagIds: string[],
    previousCategoryId?: string,
  ): Promise<void> {
    const affectedCategoryIds = [
      ...new Set([categoryId, previousCategoryId].filter(Boolean)),
    ] as string[];
    for (const affectedCategoryId of affectedCategoryIds) {
      await this.refreshCategoryCount(affectedCategoryId);
    }

    const affectedTagIds = [...new Set(tagIds)];
    for (const tagId of affectedTagIds) {
      await this.refreshTagCount(tagId);
    }
  }

  private async refreshCategoryCount(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      return;
    }

    const count = await this.articleRepository.count({
      where: {
        categoryId,
        deletedAt: IsNull(),
      },
    });

    await this.categoryRepository.save({
      ...category,
      articleCount: count,
      updatedAt: new Date(),
    });
  }

  private async refreshTagCount(tagId: string): Promise<void> {
    const tag = await this.tagRepository.findOne({ where: { id: tagId } });
    if (!tag) {
      return;
    }

    const relations = await this.articleTagRepository.find({ where: { tagId } });
    const articleIds = relations.map(relation => relation.articleId);
    const articles = await this.articleRepository.find({ where: { deletedAt: IsNull() } });
    const count = articles.filter(article => articleIds.includes(article.id)).length;

    await this.tagRepository.save({
      ...tag,
      articleCount: count,
      updatedAt: new Date(),
    });
  }
}
