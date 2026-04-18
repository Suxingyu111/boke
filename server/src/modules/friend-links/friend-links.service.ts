import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FriendLink } from '@database/entities';
import { ApplyFriendLinkDto } from './dto/apply-friend-link.dto';
import { UpdateFriendLinkDto } from './dto/update-friend-link.dto';

@Injectable()
export class FriendLinksService {
  constructor(
    @InjectRepository(FriendLink)
    private readonly friendLinkRepository: Repository<FriendLink>,
  ) {}

  /** 前台：获取已审核的友链列表 */
  async getApprovedLinks() {
    return this.friendLinkRepository.find({
      where: { status: 'approved' },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /** 前台：提交友链申请 */
  async applyLink(dto: ApplyFriendLinkDto) {
    const link = this.friendLinkRepository.create({
      siteName: dto.siteName.trim(),
      siteUrl: dto.siteUrl.trim(),
      logoUrl: dto.logoUrl?.trim() ?? null,
      description: dto.description?.trim() ?? null,
      contactEmail: dto.contactEmail?.trim() ?? null,
      applicantName: dto.applicantName?.trim() ?? null,
      status: 'pending',
      sortOrder: 0,
    });

    const saved = await this.friendLinkRepository.save(link);
    return {
      id: saved.id,
      siteName: saved.siteName,
      message: '友链申请提交成功，等待审核',
    };
  }

  /** 管理端：获取全部友链 */
  async adminGetLinks(status?: string) {
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    return this.friendLinkRepository.find({
      where,
      order: { status: 'ASC', sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  /** 管理端：审核友链 */
  async reviewLink(id: string, status: 'approved' | 'rejected') {
    const link = await this.friendLinkRepository.findOne({ where: { id } });
    if (!link) {
      throw new NotFoundException('友链不存在');
    }

    link.status = status;
    if (status === 'approved') {
      link.approvedAt = new Date();
    }

    await this.friendLinkRepository.save(link);
    return { message: `友链已${status === 'approved' ? '通过' : '拒绝'}` };
  }

  /** 管理端：更新友链信息 */
  async updateLink(id: string, dto: UpdateFriendLinkDto) {
    const link = await this.friendLinkRepository.findOne({ where: { id } });
    if (!link) {
      throw new NotFoundException('友链不存在');
    }

    if (dto.siteName !== undefined) link.siteName = dto.siteName.trim();
    if (dto.siteUrl !== undefined) link.siteUrl = dto.siteUrl.trim();
    if (dto.logoUrl !== undefined) link.logoUrl = dto.logoUrl.trim();
    if (dto.description !== undefined) link.description = dto.description.trim();
    if (dto.contactEmail !== undefined) link.contactEmail = dto.contactEmail.trim();
    if (dto.sortOrder !== undefined) link.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) {
      link.status = dto.status;
      if (dto.status === 'approved' && !link.approvedAt) {
        link.approvedAt = new Date();
      }
    }

    return this.friendLinkRepository.save(link);
  }

  /** 管理端：删除友链 */
  async deleteLink(id: string) {
    const result = await this.friendLinkRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('友链不存在');
    }
    return { message: '友链已删除' };
  }
}
