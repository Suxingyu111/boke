import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { Article, CommentEntity, User } from '@database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ReplyCommentDto } from './dto/reply-comment.dto';

type CommentStatus = CommentEntity['status'];

export interface PublicCommentView {
  id: string;
  articleId: string;
  parentId: string | null;
  authorName: string;
  authorWebsite: string | null;
  content: string;
  createdAt: Date;
  repliedAt: Date | null;
  replies: PublicCommentView[];
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  /** 获取公开评论树 */
  async getApprovedComments(articleId: string, page = 1, pageSize = 20) {
    await this.ensurePublicArticle(articleId);

    const [topLevelComments, total] = await this.commentRepository.findAndCount({
      where: {
        articleId,
        status: 'approved',
        parentId: IsNull(),
        deletedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const comments = await this.commentRepository.find({
      where: {
        articleId,
        status: 'approved',
        deletedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });

    return {
      items: topLevelComments.map(comment => this.toPublicView(comment, comments)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /** 创建评论 */
  async createComment(
    articleId: string,
    dto: CreateCommentDto,
    ip: string | null,
    userAgent: string | null,
    currentUser: User | null,
  ) {
    const article = await this.ensurePublicArticle(articleId);

    if (!article.allowComment) {
      throw new BadRequestException('当前文章未开启评论');
    }

    if (dto.parentId) {
      await this.ensureParentComment(articleId, dto.parentId);
    }

    const authorName = currentUser?.nickname?.trim() || currentUser?.username || dto.authorName.trim();
    const authorEmail = currentUser?.email || dto.authorEmail.trim();

    const comment = this.commentRepository.create({
      articleId,
      parentId: dto.parentId ?? null,
      userId: currentUser?.id ?? null,
      authorName,
      authorEmail,
      authorWebsite: dto.authorWebsite?.trim() ?? null,
      content: dto.content.trim(),
      ipAddress: ip?.slice(0, 45) ?? null,
      userAgent: userAgent?.slice(0, 500) ?? null,
      likeCount: 0,
      status: 'pending',
      repliedAt: null,
      deletedAt: null,
    });

    const savedComment = await this.commentRepository.save(comment);

    await this.notifyArticleAuthor(article, authorName, currentUser?.id ?? null);

    return {
      id: savedComment.id,
      articleId: savedComment.articleId,
      parentId: savedComment.parentId,
      status: savedComment.status,
      createdAt: savedComment.createdAt,
      message: '评论提交成功，等待审核',
    };
  }

  /** 管理端评论列表 */
  async getAdminComments(
    page = 1,
    pageSize = 20,
    status?: CommentStatus,
    articleId?: string,
  ) {
    const where: FindOptionsWhere<CommentEntity> = {
      deletedAt: IsNull(),
    };

    if (status) {
      where.status = status;
    }

    if (articleId) {
      where.articleId = articleId;
    }

    const [items, total] = await this.commentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /** 更新评论状态 */
  async updateStatus(id: string, status: CommentStatus) {
    const comment = await this.findCommentOrFail(id);
    const previousApproved = this.isApproved(comment.status);
    const nextApproved = this.isApproved(status);

    comment.status = status;
    await this.commentRepository.save(comment);

    if (previousApproved !== nextApproved) {
      await this.adjustArticleCommentCount(comment.articleId, nextApproved ? 1 : -1);
    }

    return {
      message: `评论状态已更新为 ${status}`,
    };
  }

  /** 管理员回复评论 */
  async adminReply(parentId: string, dto: ReplyCommentDto, currentUser: User) {
    const parentComment = await this.findCommentOrFail(parentId);
    const article = await this.findArticleOrFail(parentComment.articleId);
    const replyTime = new Date();

    const reply = this.commentRepository.create({
      articleId: parentComment.articleId,
      parentId: parentComment.id,
      userId: currentUser.id,
      authorName: currentUser.nickname?.trim() || currentUser.username,
      authorEmail: currentUser.email,
      authorWebsite: null,
      content: dto.content.trim(),
      ipAddress: null,
      userAgent: null,
      likeCount: 0,
      status: 'approved',
      repliedAt: replyTime,
      deletedAt: null,
    });

    const savedReply = await this.commentRepository.save(reply);
    parentComment.repliedAt = replyTime;
    await this.commentRepository.save(parentComment);
    await this.adjustArticleCommentCount(parentComment.articleId, 1);

    if (parentComment.userId && parentComment.userId !== currentUser.id) {
      await this.safeCreateUserNotification({
        userId: parentComment.userId,
        type: 'comment_reply',
        title: `您的评论收到了来自「${article.title}」的回复`,
        content: dto.content.trim(),
        relatedId: parentComment.id,
        relatedType: 'comment',
      });
    }

    return savedReply;
  }

  /** 删除评论及其子树 */
  async deleteComment(id: string) {
    const comment = await this.findCommentOrFail(id);
    const comments = await this.commentRepository.find({
      where: { articleId: comment.articleId, deletedAt: IsNull() },
    });
    const subtreeIds = this.collectSubtreeIds(comment.id, comments);
    const approvedCount = comments.filter(
      item => subtreeIds.includes(item.id) && this.isApproved(item.status),
    ).length;

    for (const commentId of subtreeIds) {
      await this.commentRepository.delete(commentId);
    }

    if (approvedCount > 0) {
      await this.adjustArticleCommentCount(comment.articleId, -approvedCount);
    }

    return {
      message: '评论已删除',
    };
  }

  private async ensurePublicArticle(articleId: string): Promise<Article> {
    const article = await this.findArticleOrFail(articleId);

    if (article.deletedAt) {
      throw new NotFoundException('文章不存在');
    }

    if (article.status !== 'published' || article.visibility !== 'public') {
      throw new NotFoundException('文章不存在或暂未公开');
    }

    return article;
  }

  private async ensureParentComment(articleId: string, parentId: string): Promise<CommentEntity> {
    const parentComment = await this.findCommentOrFail(parentId);

    if (parentComment.articleId !== articleId) {
      throw new BadRequestException('父评论与当前文章不匹配');
    }

    return parentComment;
  }

  private async findArticleOrFail(articleId: string): Promise<Article> {
    const article = await this.articleRepository.findOne({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    return article;
  }

  private async findCommentOrFail(id: string): Promise<CommentEntity> {
    const comment = await this.commentRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    return comment;
  }

  private async adjustArticleCommentCount(articleId: string, delta: number): Promise<void> {
    const article = await this.findArticleOrFail(articleId);
    article.commentCount = Math.max(0, article.commentCount + delta);
    await this.articleRepository.save(article);
  }

  private toPublicView(comment: CommentEntity, comments: CommentEntity[]): PublicCommentView {
    const replies = comments
      .filter(item => item.parentId === comment.id)
      .map(item => this.toPublicView(item, comments));

    return {
      id: comment.id,
      articleId: comment.articleId,
      parentId: comment.parentId,
      authorName: comment.authorName,
      authorWebsite: comment.authorWebsite,
      content: comment.content,
      createdAt: comment.createdAt,
      repliedAt: comment.repliedAt,
      replies,
    };
  }

  private collectSubtreeIds(commentId: string, comments: CommentEntity[]): string[] {
    const childIds = comments
      .filter(comment => comment.parentId === commentId)
      .flatMap(comment => this.collectSubtreeIds(comment.id, comments));

    return [commentId, ...childIds];
  }

  private isApproved(status: CommentStatus): boolean {
    return status === 'approved';
  }

  private async notifyArticleAuthor(
    article: Article,
    commenterName: string,
    currentUserId: string | null,
  ): Promise<void> {
    if (!article.userId || article.userId === currentUserId) {
      return;
    }

    const articleAuthor = await this.userRepository.findOne({ where: { id: article.userId } });
    if (!articleAuthor?.email) {
      return;
    }

    try {
      await this.notificationsService.sendCommentNotification(
        articleAuthor.email,
        article.title,
        commenterName,
      );
    } catch (error) {
      this.logger.warn(`发送评论邮件通知失败: ${(error as Error).message}`);
    }
  }

  private async safeCreateUserNotification(data: {
    userId: string;
    type: 'comment_reply';
    title: string;
    content: string;
    relatedId: string;
    relatedType: string;
  }): Promise<void> {
    try {
      await this.userNotificationsService.createNotification(data);
    } catch (error) {
      this.logger.warn(`创建站内通知失败: ${(error as Error).message}`);
    }
  }
}