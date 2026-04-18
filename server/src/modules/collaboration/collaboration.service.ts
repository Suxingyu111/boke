import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, DraftCollaborator, DraftEditLog, User } from '@database/entities';
import { AddCollaboratorDto } from './dto/add-collaborator.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';

@Injectable()
export class CollaborationService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(DraftCollaborator)
    private readonly collaboratorRepository: Repository<DraftCollaborator>,
    @InjectRepository(DraftEditLog)
    private readonly editLogRepository: Repository<DraftEditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** 添加协作者到草稿 */
  async addCollaborator(articleId: string, dto: AddCollaboratorDto, currentUser: User) {
    await this.ensureDraftOwner(articleId, currentUser);

    if (dto.userId === currentUser.id) {
      throw new BadRequestException('不能将自己添加为协作者');
    }

    const targetUser = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!targetUser) {
      throw new NotFoundException('目标用户不存在');
    }

    const existing = await this.collaboratorRepository.findOne({
      where: { articleId, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException('该用户已经是协作者');
    }

    const collaborator = this.collaboratorRepository.create({
      articleId,
      userId: dto.userId,
      permission: dto.permission,
      invitedBy: currentUser.id,
    });

    return this.collaboratorRepository.save(collaborator);
  }

  /** 移除协作者 */
  async removeCollaborator(articleId: string, collaboratorId: string, currentUser: User) {
    await this.ensureDraftOwner(articleId, currentUser);

    const collaborator = await this.collaboratorRepository.findOne({
      where: { id: collaboratorId, articleId },
    });
    if (!collaborator) {
      throw new NotFoundException('协作者不存在');
    }

    await this.collaboratorRepository.remove(collaborator);
    return { message: '协作者已移除' };
  }

  /** 获取草稿的所有协作者 */
  async getCollaborators(articleId: string, currentUser: User) {
    await this.ensureCanAccess(articleId, currentUser);

    const collaborators = await this.collaboratorRepository.find({
      where: { articleId },
      relations: ['user', 'inviter'],
    });

    return collaborators.map(c => ({
      id: c.id,
      userId: c.userId,
      username: c.user?.username,
      nickname: c.user?.nickname,
      avatar: c.user?.avatar,
      permission: c.permission,
      invitedBy: c.invitedBy,
      inviterName: c.inviter?.username,
      createdAt: c.createdAt,
    }));
  }

  /** 协作者编辑草稿 */
  async updateDraft(articleId: string, dto: UpdateDraftDto, currentUser: User) {
    const article = await this.articleRepository.findOne({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    if (article.status !== 'draft') {
      throw new BadRequestException('只能协作编辑草稿状态的文章');
    }

    await this.ensureCanEdit(articleId, currentUser, article);

    const editLogs: Partial<DraftEditLog>[] = [];

    if (dto.title !== undefined && dto.title !== article.title) {
      editLogs.push({
        articleId,
        userId: currentUser.id,
        fieldChanged: 'title',
        oldValue: article.title,
        newValue: dto.title,
        summary: `修改标题: "${article.title}" → "${dto.title}"`,
      });
      article.title = dto.title;
    }

    if (dto.content !== undefined && dto.content !== article.content) {
      editLogs.push({
        articleId,
        userId: currentUser.id,
        fieldChanged: 'content',
        oldValue: null, // 内容太长不记录全文
        newValue: null,
        summary: '更新了正文内容',
      });
      article.content = dto.content;
    }

    if (dto.contentHtml !== undefined) {
      article.contentHtml = dto.contentHtml;
    }

    if (dto.excerpt !== undefined && dto.excerpt !== article.excerpt) {
      editLogs.push({
        articleId,
        userId: currentUser.id,
        fieldChanged: 'excerpt',
        oldValue: article.excerpt,
        newValue: dto.excerpt,
        summary: '更新了摘要',
      });
      article.excerpt = dto.excerpt;
    }

    const savedArticle = await this.articleRepository.save(article);

    if (editLogs.length > 0) {
      await this.editLogRepository.save(editLogs.map(log => this.editLogRepository.create(log)));
    }

    return savedArticle;
  }

  /** 获取草稿编辑历史 */
  async getEditHistory(articleId: string, currentUser: User) {
    await this.ensureCanAccess(articleId, currentUser);

    const logs = await this.editLogRepository.find({
      where: { articleId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return logs.map(log => ({
      id: log.id,
      userId: log.userId,
      username: log.user?.username,
      fieldChanged: log.fieldChanged,
      summary: log.summary,
      createdAt: log.createdAt,
    }));
  }

  /** 确认当前用户是草稿所有者 */
  private async ensureDraftOwner(articleId: string, currentUser: User): Promise<Article> {
    const article = await this.articleRepository.findOne({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }
    if (article.status !== 'draft') {
      throw new BadRequestException('只能对草稿添加协作者');
    }
    if (
      article.userId !== currentUser.id &&
      currentUser.role !== 'admin' &&
      currentUser.role !== 'super_admin'
    ) {
      throw new ForbiddenException('只有作者或管理员可以管理协作者');
    }
    return article;
  }

  /** 确认当前用户可以访问该草稿 */
  private async ensureCanAccess(articleId: string, currentUser: User): Promise<void> {
    const article = await this.articleRepository.findOne({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (article.userId === currentUser.id) return;
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') return;

    const collaborator = await this.collaboratorRepository.findOne({
      where: { articleId, userId: currentUser.id },
    });
    if (!collaborator) {
      throw new ForbiddenException('无权访问该草稿');
    }
  }

  /** 确认当前用户有编辑权限 */
  private async ensureCanEdit(
    articleId: string,
    currentUser: User,
    article: Article,
  ): Promise<void> {
    if (article.userId === currentUser.id) return;
    if (currentUser.role === 'admin' || currentUser.role === 'super_admin') return;

    const collaborator = await this.collaboratorRepository.findOne({
      where: { articleId, userId: currentUser.id },
    });
    if (!collaborator) {
      throw new ForbiddenException('无权编辑该草稿');
    }
    if (collaborator.permission !== 'editor') {
      throw new ForbiddenException('您只有查看权限，无法编辑');
    }
  }
}
