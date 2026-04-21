import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { EmailSubscriber } from '@database/entities';
import { SubscribeDto } from './dto/subscribe.dto';
import { NotificationsService } from './notifications.service';

@Injectable()
export class SubscriptionService {
  private initializationPromise: Promise<void> | null = null;

  constructor(
    @InjectRepository(EmailSubscriber)
    private readonly subscriberRepository: Repository<EmailSubscriber>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  /** 订阅 */
  async subscribe(dto: SubscribeDto) {
    await this.ensureInitialized();

    const existing = await this.subscriberRepository.findOne({
      where: { email: dto.email },
    });

    const confirmToken = this.generateToken();

    if (existing) {
      if (existing.isActive && existing.isConfirmed) {
        throw new ConflictException('该邮箱已订阅');
      }
      existing.isActive = true;
      existing.isConfirmed = false;
      existing.name = dto.name ?? existing.name;
      existing.confirmToken = null;
      existing.confirmTokenHash = this.hashToken(confirmToken);
      existing.unsubscribedAt = null;
      await this.subscriberRepository.save(existing);
      await this.sendConfirmationEmail(existing.email, existing.name, confirmToken);
      return { message: '订阅请求已提交，请查看邮箱确认' };
    }

    const subscriber = this.subscriberRepository.create({
      email: dto.email,
      name: dto.name ?? null,
      isConfirmed: false,
      confirmToken: null,
      confirmTokenHash: this.hashToken(confirmToken),
      unsubscribeToken: this.generateToken(),
      isActive: true,
    });

    await this.subscriberRepository.save(subscriber);
    await this.sendConfirmationEmail(subscriber.email, subscriber.name, confirmToken);
    return { message: '订阅请求已提交，请查看邮箱确认' };
  }

  /** 确认订阅 */
  async confirmSubscription(token: string) {
    await this.ensureInitialized();

    const tokenHash = this.hashToken(token);
    const subscriber = await this.subscriberRepository.findOne({
      where: [
        { confirmTokenHash: tokenHash, isActive: true },
        { confirmToken: token, isActive: true },
      ],
    });

    if (!subscriber) {
      throw new NotFoundException('无效的确认链接');
    }

    subscriber.isConfirmed = true;
    subscriber.confirmedAt = new Date();
    subscriber.confirmToken = null;
    subscriber.confirmTokenHash = null;
    await this.subscriberRepository.save(subscriber);

    return { message: '订阅确认成功' };
  }

  /** 取消订阅 */
  async unsubscribe(token: string) {
    await this.ensureInitialized();

    const subscriber = await this.subscriberRepository.findOne({
      where: { unsubscribeToken: token },
    });

    if (!subscriber) {
      throw new NotFoundException('无效的退订链接');
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await this.subscriberRepository.save(subscriber);

    return { message: '已成功取消订阅' };
  }

  /** 获取订阅者列表（管理端） */
  async getSubscribers(page = 1, pageSize = 20) {
    await this.ensureInitialized();

    const [items, total] = await this.subscriberRepository.findAndCount({
      order: { subscribedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: items.map(s => ({
        id: s.id,
        email: s.email,
        name: s.name,
        isConfirmed: s.isConfirmed,
        isActive: s.isActive,
        subscribedAt: s.subscribedAt,
        confirmedAt: s.confirmedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 删除订阅者（管理端） */
  async removeSubscriber(id: string) {
    await this.ensureInitialized();

    const subscriber = await this.subscriberRepository.findOne({ where: { id } });
    if (!subscriber) {
      throw new NotFoundException('订阅者不存在');
    }
    await this.subscriberRepository.remove(subscriber);
    return { message: '订阅者已删除' };
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeSecurityState().catch(error => {
        this.initializationPromise = null;
        throw error;
      });
    }

    await this.initializationPromise;
  }

  private async initializeSecurityState(): Promise<void> {
    await this.ensureConfirmTokenHashColumn();
    await this.migrateLegacyConfirmTokens();
  }

  private async ensureConfirmTokenHashColumn(): Promise<void> {
    if (typeof this.subscriberRepository.query !== 'function') {
      return;
    }

    await this.subscriberRepository.query(
      `
        ALTER TABLE email_subscribers
        ADD COLUMN IF NOT EXISTS confirm_token_hash VARCHAR(64) NULL AFTER confirm_token
      `,
    );
  }

  private async migrateLegacyConfirmTokens(): Promise<void> {
    if (typeof this.subscriberRepository.find !== 'function') {
      return;
    }

    const subscribers = await this.subscriberRepository.find();
    for (const subscriber of subscribers) {
      if (!subscriber.confirmToken || subscriber.confirmTokenHash) {
        continue;
      }

      subscriber.confirmTokenHash = this.hashToken(subscriber.confirmToken);
      subscriber.confirmToken = null;
      await this.subscriberRepository.save(subscriber);
    }
  }

  private async sendConfirmationEmail(
    email: string,
    name: string | null,
    confirmToken: string,
  ): Promise<void> {
    const clientUrl = this.configService.get<string>('oauth.clientUrl', 'http://localhost:5173');
    const confirmUrl = new URL(
      `/subscriptions/confirm/${confirmToken}`,
      this.ensureTrailingSlash(clientUrl),
    ).toString();

    await this.notificationsService.sendNotification({
      toEmail: email,
      subject: '请确认你的博客订阅',
      body: this.buildConfirmationEmailBody(name, confirmUrl),
      type: 'subscription',
    });
  }

  private buildConfirmationEmailBody(name: string | null, confirmUrl: string): string {
    const displayName = name?.trim() || '读者';

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>确认订阅</h2>
        <p>${displayName}，你好！</p>
        <p>请点击下方按钮确认订阅博客更新：</p>
        <p style="margin: 24px 0;">
          <a href="${confirmUrl}" style="display: inline-block; padding: 12px 20px; border-radius: 8px; background: #2563eb; color: #fff; text-decoration: none;">
            确认订阅
          </a>
        </p>
        <p style="font-size: 12px; color: #6b7280; word-break: break-all;">
          如果按钮无法点击，请复制以下链接到浏览器打开：${confirmUrl}
        </p>
      </div>
    `;
  }

  private ensureTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }
}
