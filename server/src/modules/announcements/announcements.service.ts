import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ANNOUNCEMENT_CACHE_PREFIXES } from '@common/security/cache-prefixes';
import { ResponseCacheService } from '@common/security/response-cache.service';
import { Repository } from 'typeorm';
import { Announcement } from '@database/entities';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    @Optional()
    private readonly responseCacheService?: ResponseCacheService,
  ) {}

  /** 前台：获取已发布的公告列表 */
  async getPublishedAnnouncements(page = 1, pageSize = 10) {
    const [items, total] = await this.announcementRepository.findAndCount({
      where: { status: 'published' },
      order: { isPinned: 'DESC', publishedAt: 'DESC' },
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

  /** 前台：获取最新的置顶公告 */
  async getLatestPinnedAnnouncement() {
    return this.announcementRepository.findOne({
      where: { status: 'published', isPinned: true },
      order: { publishedAt: 'DESC' },
    });
  }

  /** 管理端：获取全部公告 */
  async adminGetAnnouncements(page = 1, pageSize = 20) {
    const [items, total] = await this.announcementRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** 管理端：创建公告 */
  async create(dto: CreateAnnouncementDto, userId: string) {
    const announcement = this.announcementRepository.create({
      title: dto.title.trim(),
      content: dto.content.trim(),
      status: dto.status ?? 'draft',
      isPinned: dto.isPinned ?? false,
      publishedAt: dto.status === 'published' ? new Date() : null,
      createdBy: userId,
    });

    const savedAnnouncement = await this.announcementRepository.save(announcement);
    await this.invalidatePublicCaches();
    return savedAnnouncement;
  }

  /** 管理端：更新公告 */
  async update(id: string, dto: UpdateAnnouncementDto) {
    const announcement = await this.announcementRepository.findOne({ where: { id } });
    if (!announcement) {
      throw new NotFoundException('公告不存在');
    }

    if (dto.title !== undefined) announcement.title = dto.title.trim();
    if (dto.content !== undefined) announcement.content = dto.content.trim();
    if (dto.isPinned !== undefined) announcement.isPinned = dto.isPinned;
    if (dto.status !== undefined) {
      announcement.status = dto.status;
      if (dto.status === 'published' && !announcement.publishedAt) {
        announcement.publishedAt = new Date();
      }
    }

    const savedAnnouncement = await this.announcementRepository.save(announcement);
    await this.invalidatePublicCaches();
    return savedAnnouncement;
  }

  /** 管理端：删除公告 */
  async delete(id: string) {
    const result = await this.announcementRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('公告不存在');
    }
    await this.invalidatePublicCaches();
    return { message: '公告已删除' };
  }

  private async invalidatePublicCaches(): Promise<void> {
    await this.responseCacheService?.invalidatePrefixes(ANNOUNCEMENT_CACHE_PREFIXES);
  }
}
