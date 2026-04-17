import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ArticlePurchase, PaidContent, User } from '@database/entities';
import { SetPaidContentDto } from './dto/set-paid-content.dto';
import { PurchaseArticleDto } from './dto/purchase-article.dto';

@Injectable()
export class PaidContentService {
  constructor(
    @InjectRepository(PaidContent)
    private readonly paidContentRepository: Repository<PaidContent>,
    @InjectRepository(ArticlePurchase)
    private readonly purchaseRepository: Repository<ArticlePurchase>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** 设置文章为付费内容 */
  async setPaidContent(articleId: string, dto: SetPaidContentDto, currentUser: User) {
    const article = await this.articleRepository.findOne({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    // 仅作者或管理员可设置
    if (
      article.userId !== currentUser.id &&
      currentUser.role !== 'admin' &&
      currentUser.role !== 'super_admin'
    ) {
      throw new BadRequestException('无权设置该文章的付费状态');
    }

    let paidContent = await this.paidContentRepository.findOne({ where: { articleId } });

    if (paidContent) {
      paidContent.price = dto.price;
      paidContent.previewPercent = dto.previewPercent ?? paidContent.previewPercent;
      paidContent.isActive = dto.isActive ?? paidContent.isActive;
      paidContent.description = dto.description ?? paidContent.description;
    } else {
      paidContent = this.paidContentRepository.create({
        articleId,
        price: dto.price,
        previewPercent: dto.previewPercent ?? 30,
        isActive: dto.isActive ?? true,
        description: dto.description ?? null,
      });
    }

    return this.paidContentRepository.save(paidContent);
  }

  /** 移除付费设置 */
  async removePaidContent(articleId: string, currentUser: User) {
    const article = await this.articleRepository.findOne({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    if (
      article.userId !== currentUser.id &&
      currentUser.role !== 'admin' &&
      currentUser.role !== 'super_admin'
    ) {
      throw new BadRequestException('无权操作');
    }

    const paidContent = await this.paidContentRepository.findOne({ where: { articleId } });
    if (!paidContent) {
      throw new NotFoundException('该文章未设置付费');
    }

    await this.paidContentRepository.remove(paidContent);
    return { message: '付费设置已移除' };
  }

  /** 获取付费信息 */
  async getPaidInfo(articleId: string) {
    const paidContent = await this.paidContentRepository.findOne({ where: { articleId } });
    if (!paidContent || !paidContent.isActive) {
      return null;
    }
    return {
      price: paidContent.price,
      previewPercent: paidContent.previewPercent,
      description: paidContent.description,
    };
  }

  /** 用户购买文章 */
  async purchaseArticle(dto: PurchaseArticleDto, currentUser: User) {
    const paidContent = await this.paidContentRepository.findOne({
      where: { articleId: dto.articleId, isActive: true },
    });
    if (!paidContent) {
      throw new NotFoundException('该文章未设置为付费内容');
    }

    const existing = await this.purchaseRepository.findOne({
      where: { articleId: dto.articleId, userId: currentUser.id },
    });
    if (existing) {
      throw new ConflictException('您已购买过该文章');
    }

    const purchase = this.purchaseRepository.create({
      articleId: dto.articleId,
      userId: currentUser.id,
      paidAmount: paidContent.price,
      paymentMethod: dto.paymentMethod ?? 'manual',
      transactionId: dto.transactionId ?? null,
    });

    return this.purchaseRepository.save(purchase);
  }

  /** 检查用户是否已购买 */
  async hasPurchased(articleId: string, userId: string): Promise<boolean> {
    const purchase = await this.purchaseRepository.findOne({
      where: { articleId, userId },
    });
    return !!purchase;
  }

  /** 获取文章内容（处理付费裁剪） */
  async getArticleContent(articleId: string, userId?: string) {
    const article = await this.articleRepository.findOne({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    const paidContent = await this.paidContentRepository.findOne({
      where: { articleId, isActive: true },
    });

    // 非付费文章，返回完整内容
    if (!paidContent) {
      return {
        content: article.content,
        contentHtml: article.contentHtml,
        isPaid: false,
        hasAccess: true,
      };
    }

    // 作者自己可以看全文
    if (userId === article.userId) {
      return {
        content: article.content,
        contentHtml: article.contentHtml,
        isPaid: true,
        hasAccess: true,
      };
    }

    // 检查是否已购买
    if (userId) {
      const purchased = await this.hasPurchased(articleId, userId);
      if (purchased) {
        return {
          content: article.content,
          contentHtml: article.contentHtml,
          isPaid: true,
          hasAccess: true,
        };
      }
    }

    // 未购买，返回预览内容
    const previewLength = Math.floor(article.content.length * (paidContent.previewPercent / 100));
    const previewContent = article.content.substring(0, previewLength);

    return {
      content: previewContent,
      contentHtml: null,
      isPaid: true,
      hasAccess: false,
      price: paidContent.price,
      previewPercent: paidContent.previewPercent,
    };
  }

  /** 获取文章购买记录（管理端） */
  async getPurchaseRecords(articleId: string) {
    const purchases = await this.purchaseRepository.find({
      where: { articleId },
      relations: ['user'],
      order: { purchasedAt: 'DESC' },
    });

    return purchases.map(p => ({
      id: p.id,
      userId: p.userId,
      username: p.user?.username,
      paidAmount: p.paidAmount,
      paymentMethod: p.paymentMethod,
      purchasedAt: p.purchasedAt,
    }));
  }

  /** 获取用户已购买的文章列表 */
  async getUserPurchases(userId: string) {
    const purchases = await this.purchaseRepository.find({
      where: { userId },
      relations: ['article'],
      order: { purchasedAt: 'DESC' },
    });

    return purchases.map(p => ({
      id: p.id,
      articleId: p.articleId,
      articleTitle: p.article?.title,
      articleSlug: p.article?.slug,
      paidAmount: p.paidAmount,
      purchasedAt: p.purchasedAt,
    }));
  }
}
