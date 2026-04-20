import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GUESTBOOK_CACHE_PREFIXES } from '@common/security/cache-prefixes';
import { ResponseCacheService } from '@common/security/response-cache.service';
import { Repository } from 'typeorm';
import { Guestbook } from '@database/entities';
import { CreateGuestbookDto } from './dto/create-guestbook.dto';

@Injectable()
export class GuestbookService {
  constructor(
    @InjectRepository(Guestbook)
    private readonly guestbookRepository: Repository<Guestbook>,
    @Optional()
    private readonly responseCacheService?: ResponseCacheService,
  ) {}

  /** 前台：获取已审核的留言列表 */
  async getApprovedMessages(page = 1, pageSize = 20) {
    const [items, total] = await this.guestbookRepository.findAndCount({
      where: { status: 'approved' },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 构建回复树结构
    const topLevel = items.filter(item => !item.parentId);
    const replies = items.filter(item => item.parentId);

    const result = topLevel.map(msg => ({
      ...msg,
      email: undefined, // 不暴露邮箱
      ip: undefined,    // 不暴露 IP
      replies: replies
        .filter(r => r.parentId === msg.id)
        .map(r => ({ ...r, email: undefined, ip: undefined })),
    }));

    return {
      items: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** 前台：提交留言 */
  async createMessage(dto: CreateGuestbookDto, ip: string | null) {
    if (dto.parentId) {
      const parent = await this.guestbookRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('回复的留言不存在');
      }
    }

    const message = this.guestbookRepository.create({
      nickname: dto.nickname.trim(),
      email: dto.email?.trim() ?? null,
      website: dto.website?.trim() ?? null,
      content: dto.content.trim(),
      parentId: dto.parentId ?? null,
      ip: ip?.slice(0, 45) ?? null,
      status: 'pending',
      isAdminReply: false,
    });

    const saved = await this.guestbookRepository.save(message);
    return {
      id: saved.id,
      nickname: saved.nickname,
      content: saved.content,
      createdAt: saved.createdAt,
      message: '留言提交成功，等待审核',
    };
  }

  /** 管理端：获取全部留言（含待审核） */
  async adminGetMessages(page = 1, pageSize = 20, status?: string) {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [items, total] = await this.guestbookRepository.findAndCount({
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
    };
  }

  /** 管理端：审核留言 */
  async updateStatus(id: string, status: 'approved' | 'rejected') {
    const message = await this.guestbookRepository.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException('留言不存在');
    }

    message.status = status;
    await this.guestbookRepository.save(message);
    await this.invalidatePublicCaches();
    return { message: `留言已${status === 'approved' ? '通过' : '拒绝'}` };
  }

  /** 管理端：管理员回复 */
  async adminReply(parentId: string, content: string) {
    const parent = await this.guestbookRepository.findOne({ where: { id: parentId } });
    if (!parent) {
      throw new NotFoundException('留言不存在');
    }

    const reply = this.guestbookRepository.create({
      nickname: '博主',
      content: content.trim(),
      parentId,
      status: 'approved',
      isAdminReply: true,
    });

    const savedReply = await this.guestbookRepository.save(reply);
    await this.invalidatePublicCaches();
    return savedReply;
  }

  /** 管理端：删除留言 */
  async deleteMessage(id: string) {
    await this.guestbookRepository.delete(id);
    await this.invalidatePublicCaches();
    return { message: '留言已删除' };
  }

  private async invalidatePublicCaches(): Promise<void> {
    await this.responseCacheService?.invalidatePrefixes(GUESTBOOK_CACHE_PREFIXES);
  }
}
