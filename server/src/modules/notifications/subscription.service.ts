import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { EmailSubscriber } from '@database/entities';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(EmailSubscriber)
    private readonly subscriberRepository: Repository<EmailSubscriber>,
  ) {}

  /** 订阅 */
  async subscribe(dto: SubscribeDto) {
    const existing = await this.subscriberRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      if (existing.isActive && existing.isConfirmed) {
        throw new ConflictException('该邮箱已订阅');
      }
      // 重新激活
      existing.isActive = true;
      existing.name = dto.name ?? existing.name;
      existing.confirmToken = this.generateToken();
      existing.unsubscribedAt = null;
      await this.subscriberRepository.save(existing);
      return { message: '订阅请求已提交，请查看邮箱确认', confirmToken: existing.confirmToken };
    }

    const subscriber = this.subscriberRepository.create({
      email: dto.email,
      name: dto.name ?? null,
      isConfirmed: false,
      confirmToken: this.generateToken(),
      unsubscribeToken: this.generateToken(),
      isActive: true,
    });

    await this.subscriberRepository.save(subscriber);
    return { message: '订阅请求已提交，请查看邮箱确认', confirmToken: subscriber.confirmToken };
  }

  /** 确认订阅 */
  async confirmSubscription(token: string) {
    const subscriber = await this.subscriberRepository.findOne({
      where: { confirmToken: token, isActive: true },
    });

    if (!subscriber) {
      throw new NotFoundException('无效的确认链接');
    }

    subscriber.isConfirmed = true;
    subscriber.confirmedAt = new Date();
    subscriber.confirmToken = null;
    await this.subscriberRepository.save(subscriber);

    return { message: '订阅确认成功' };
  }

  /** 取消订阅 */
  async unsubscribe(token: string) {
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
}
