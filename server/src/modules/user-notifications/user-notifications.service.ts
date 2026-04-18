import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotification } from '@database/entities';

@Injectable()
export class UserNotificationsService {
  constructor(
    @InjectRepository(UserNotification)
    private readonly notificationRepository: Repository<UserNotification>,
  ) {}

  /** 创建站内通知 */
  async createNotification(data: {
    userId: string;
    type: UserNotification['type'];
    title: string;
    content?: string;
    relatedId?: string;
    relatedType?: string;
  }) {
    const notification = this.notificationRepository.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      content: data.content ?? null,
      relatedId: data.relatedId ?? null,
      relatedType: data.relatedType ?? null,
      isRead: false,
    });

    return this.notificationRepository.save(notification);
  }

  /** 获取用户通知列表 */
  async getUserNotifications(userId: string, page = 1, pageSize = 20, unreadOnly = false) {
    const where: Record<string, unknown> = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [items, total] = await this.notificationRepository.findAndCount({
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
      totalPages: Math.ceil(total / pageSize),
      unreadCount: unreadOnly ? total : await this.getUnreadCount(userId),
    };
  }

  /** 获取未读通知数量 */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  /** 标记单个通知为已读 */
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return { message: '通知不存在' };
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await this.notificationRepository.save(notification);

    return { message: '已标记为已读' };
  }

  /** 全部标记为已读 */
  async markAllAsRead(userId: string) {
    await this.notificationRepository
      .createQueryBuilder()
      .update(UserNotification)
      .set({ isRead: true, readAt: new Date() })
      .where('user_id = :userId AND is_read = false', { userId })
      .execute();

    return { message: '全部通知已标记为已读' };
  }

  /** 删除通知 */
  async deleteNotification(userId: string, notificationId: string) {
    await this.notificationRepository.delete({ id: notificationId, userId });
    return { message: '通知已删除' };
  }

  /** 批量向用户发送系统通知（管理端用） */
  async broadcastNotification(title: string, content: string, userIds: string[]) {
    const notifications = userIds.map(userId =>
      this.notificationRepository.create({
        userId,
        type: 'system' as const,
        title,
        content,
        isRead: false,
      }),
    );

    await this.notificationRepository.save(notifications);
    return { sent: notifications.length };
  }
}
