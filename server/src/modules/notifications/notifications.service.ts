import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailNotification, EmailSubscriber } from '@database/entities';
import { EMAIL_TRANSPORT } from './email-transport.provider';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly fromAddress: string;

  constructor(
    @Inject(EMAIL_TRANSPORT)
    private readonly transport: nodemailer.Transporter | null,
    @InjectRepository(EmailNotification)
    private readonly notificationRepository: Repository<EmailNotification>,
    @InjectRepository(EmailSubscriber)
    private readonly subscriberRepository: Repository<EmailSubscriber>,
    private readonly configService: ConfigService,
  ) {
    this.fromAddress = this.configService.get<string>(
      'email.from',
      this.configService.get<string>('email.user', 'noreply@blog.local'),
    );
  }

  /** 发送单封邮件通知 */
  async sendNotification(dto: SendNotificationDto) {
    const notification = this.notificationRepository.create({
      toEmail: dto.toEmail,
      subject: dto.subject,
      body: dto.body,
      type: dto.type ?? 'system',
      status: 'pending',
    });
    const saved = await this.notificationRepository.save(notification);

    await this.attemptSend(saved);
    return saved;
  }

  /** 发送评论通知给文章作者 */
  async sendCommentNotification(authorEmail: string, articleTitle: string, commenterName: string) {
    return this.sendNotification({
      toEmail: authorEmail,
      subject: `您的文章「${articleTitle}」收到了新评论`,
      body: this.buildCommentEmailBody(articleTitle, commenterName),
      type: 'comment',
    });
  }

  /** 给所有订阅者发送新文章通知 */
  async notifySubscribersNewArticle(articleTitle: string, articleSlug: string) {
    const subscribers = await this.subscriberRepository.find({
      where: { isConfirmed: true, isActive: true },
    });

    const results = { sent: 0, failed: 0 };
    const blogUrl = this.configService.get<string>('app.url', 'http://localhost:5173');

    for (const subscriber of subscribers) {
      try {
        await this.sendNotification({
          toEmail: subscriber.email,
          subject: `新文章发布：${articleTitle}`,
          body: this.buildNewArticleEmailBody(
            articleTitle,
            articleSlug,
            subscriber.unsubscribeToken,
            blogUrl,
          ),
          type: 'subscription',
        });
        results.sent++;
      } catch {
        results.failed++;
      }
    }

    return results;
  }

  /** 获取通知列表（管理端） */
  async getNotifications(page = 1, pageSize = 20) {
    const [items, total] = await this.notificationRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 重试发送失败的通知 */
  async retryFailed() {
    const failedNotifications = await this.notificationRepository.find({
      where: { status: 'failed' },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    let retried = 0;
    for (const notification of failedNotifications) {
      if (notification.retryCount >= 3) continue;
      await this.attemptSend(notification);
      retried++;
    }

    return { retried };
  }

  /** 尝试通过 SMTP 发送邮件 */
  private async attemptSend(notification: EmailNotification): Promise<void> {
    if (!this.transport) {
      notification.status = 'failed';
      notification.errorMessage = 'SMTP 未配置';
      await this.notificationRepository.save(notification);
      return;
    }

    try {
      await this.transport.sendMail({
        from: this.fromAddress,
        to: notification.toEmail,
        subject: notification.subject,
        html: notification.body,
      });

      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.errorMessage = null;
    } catch (err) {
      notification.status = 'failed';
      notification.retryCount += 1;
      notification.errorMessage = (err as Error).message;
      this.logger.warn(`邮件发送失败 [${notification.id}]: ${notification.errorMessage}`);
    }

    await this.notificationRepository.save(notification);
  }

  private buildCommentEmailBody(articleTitle: string, commenterName: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>新评论通知</h2>
        <p><strong>${commenterName}</strong> 对您的文章 <strong>「${articleTitle}」</strong> 发表了评论。</p>
        <p>请登录后台查看详情。</p>
      </div>
    `;
  }

  private buildNewArticleEmailBody(
    articleTitle: string,
    articleSlug: string,
    unsubscribeToken: string,
    blogUrl: string,
  ): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>新文章发布</h2>
        <p>博客发布了新文章：<strong>「${articleTitle}」</strong></p>
        <p><a href="${blogUrl}/articles/${articleSlug}" style="color: #3b82f6;">点击阅读全文</a></p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #9ca3af;">
          如需取消订阅，请
          <a href="${blogUrl}/unsubscribe?token=${unsubscribeToken}">点击这里</a>
        </p>
      </div>
    `;
  }
}
