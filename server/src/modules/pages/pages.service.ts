import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PAGE_CACHE_PREFIXES } from '@common/security/cache-prefixes';
import { sanitizeOptionalRichTextHtml } from '@common/security/html-sanitizer.util';
import { ResponseCacheService } from '@common/security/response-cache.service';
import { Repository } from 'typeorm';
import { FriendLink, Page, User } from '@database/entities';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { ApplyFriendLinkDto } from './dto/apply-friend-link.dto';
import { CreateFriendLinkDto } from './dto/create-friend-link.dto';
import { UpdateFriendLinkDto } from './dto/update-friend-link.dto';

const PAGE_NOT_FOUND_MESSAGE = '页面不存在';
const PAGE_SLUG_EXISTS_MESSAGE = '页面 slug 已存在';
const ABOUT_PAGE_EXISTS_MESSAGE = '关于我页面已存在';
const FRIEND_LINK_NOT_FOUND_MESSAGE = '友链不存在';

@Injectable()
export class PagesService {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(FriendLink)
    private readonly friendLinkRepository: Repository<FriendLink>,
    @Optional()
    private readonly responseCacheService?: ResponseCacheService,
  ) {}

  async createPage(dto: CreatePageDto, currentUser: User): Promise<Page> {
    await this.ensurePageSlugUnique(dto.slug);
    await this.ensureAboutPageUnique(dto.pageType ?? 'custom');

    const page = this.pageRepository.create({
      title: dto.title.trim(),
      slug: dto.slug.trim(),
      pageType: dto.pageType ?? 'custom',
      content: dto.content,
      contentHtml: sanitizeOptionalRichTextHtml(dto.contentHtml),
      summary: dto.summary?.trim() ?? null,
      isHomeVisible: dto.isHomeVisible ?? false,
      status: dto.status ?? 'draft',
      seoTitle: dto.seoTitle?.trim() ?? null,
      seoDescription: dto.seoDescription?.trim() ?? null,
      publishedAt: this.resolvePublishedAt(dto.status ?? 'draft'),
      createdBy: currentUser.id,
      updatedBy: currentUser.id,
    });

    const savedPage = await this.pageRepository.save(page);
    await this.invalidatePageCaches();
    return savedPage;
  }

  async findAdminPages(): Promise<Page[]> {
    return this.pageRepository.find({
      order: {
        updatedAt: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findAdminPageById(id: string): Promise<Page> {
    return this.findPageById(id);
  }

  async updatePage(id: string, dto: UpdatePageDto, currentUser: User): Promise<Page> {
    const page = await this.findPageById(id);

    if (dto.slug && dto.slug.trim() !== page.slug) {
      await this.ensurePageSlugUnique(dto.slug, id);
    }

    const nextPageType = dto.pageType ?? page.pageType;
    if (nextPageType !== page.pageType || nextPageType === 'about') {
      await this.ensureAboutPageUnique(nextPageType, id);
    }

    const nextStatus = dto.status ?? page.status;
    const updatedPage: Page = {
      ...page,
      title: dto.title?.trim() ?? page.title,
      slug: dto.slug?.trim() ?? page.slug,
      pageType: nextPageType,
      content: dto.content ?? page.content,
      contentHtml:
        dto.contentHtml !== undefined
          ? sanitizeOptionalRichTextHtml(dto.contentHtml)
          : page.contentHtml,
      summary: dto.summary !== undefined ? (dto.summary?.trim() ?? null) : page.summary,
      isHomeVisible: dto.isHomeVisible ?? page.isHomeVisible,
      status: nextStatus,
      seoTitle: dto.seoTitle !== undefined ? (dto.seoTitle?.trim() ?? null) : page.seoTitle,
      seoDescription:
        dto.seoDescription !== undefined
          ? (dto.seoDescription?.trim() ?? null)
          : page.seoDescription,
      publishedAt: this.resolvePublishedAt(nextStatus, page.publishedAt),
      updatedBy: currentUser.id,
      updatedAt: new Date(),
    };

    const savedPage = await this.pageRepository.save(updatedPage);
    await this.invalidatePageCaches();
    return savedPage;
  }

  async removePage(id: string): Promise<{ message: string }> {
    const page = await this.findPageById(id);
    await this.pageRepository.remove(page);
    await this.invalidatePageCaches();
    return { message: '页面删除成功' };
  }

  async findAboutPage(): Promise<Page> {
    const page = await this.pageRepository.findOne({
      where: { pageType: 'about', status: 'published' },
    });
    if (!page) {
      throw new NotFoundException(PAGE_NOT_FOUND_MESSAGE);
    }

    return page;
  }

  async findPublicPageBySlug(slug: string): Promise<Page> {
    const page = await this.pageRepository.findOne({ where: { slug, status: 'published' } });
    if (!page) {
      throw new NotFoundException(PAGE_NOT_FOUND_MESSAGE);
    }

    return page;
  }

  async createFriendLink(dto: CreateFriendLinkDto): Promise<FriendLink> {
    const status = dto.status ?? 'approved';
    const link = this.friendLinkRepository.create({
      siteName: dto.siteName.trim(),
      siteUrl: dto.siteUrl.trim(),
      logoUrl: dto.logoUrl?.trim() ?? null,
      description: dto.description?.trim() ?? null,
      contactEmail: dto.contactEmail?.trim() ?? null,
      applicantName: dto.applicantName?.trim() ?? null,
      sortOrder: dto.sortOrder ?? 0,
      status,
      approvedAt: this.resolveApprovedAt(status),
    });

    const savedLink = await this.friendLinkRepository.save(link);
    await this.invalidatePageCaches();
    return savedLink;
  }

  async applyFriendLink(dto: ApplyFriendLinkDto): Promise<FriendLink> {
    const link = this.friendLinkRepository.create({
      siteName: dto.siteName.trim(),
      siteUrl: dto.siteUrl.trim(),
      description: dto.description?.trim() ?? null,
      contactEmail: dto.contactEmail?.trim() ?? null,
      applicantName: dto.applicantName?.trim() ?? null,
      logoUrl: null,
      sortOrder: 0,
      status: 'pending',
      approvedAt: null,
    });

    return this.friendLinkRepository.save(link);
  }

  async findAdminFriendLinks(): Promise<FriendLink[]> {
    const links = await this.friendLinkRepository.find();
    return this.sortFriendLinks(links);
  }

  async findAdminFriendLinkById(id: string): Promise<FriendLink> {
    return this.findFriendLinkById(id);
  }

  async updateFriendLink(id: string, dto: UpdateFriendLinkDto): Promise<FriendLink> {
    const link = await this.findFriendLinkById(id);
    const nextStatus = dto.status ?? link.status;
    const updatedLink: FriendLink = {
      ...link,
      siteName: dto.siteName?.trim() ?? link.siteName,
      siteUrl: dto.siteUrl?.trim() ?? link.siteUrl,
      logoUrl: dto.logoUrl !== undefined ? (dto.logoUrl?.trim() ?? null) : link.logoUrl,
      description:
        dto.description !== undefined ? (dto.description?.trim() ?? null) : link.description,
      contactEmail:
        dto.contactEmail !== undefined ? (dto.contactEmail?.trim() ?? null) : link.contactEmail,
      applicantName:
        dto.applicantName !== undefined ? (dto.applicantName?.trim() ?? null) : link.applicantName,
      sortOrder: dto.sortOrder ?? link.sortOrder,
      status: nextStatus,
      approvedAt: this.resolveApprovedAt(nextStatus, link.approvedAt),
      updatedAt: new Date(),
    };

    const savedLink = await this.friendLinkRepository.save(updatedLink);
    await this.invalidatePageCaches();
    return savedLink;
  }

  async removeFriendLink(id: string): Promise<{ message: string }> {
    const link = await this.findFriendLinkById(id);
    await this.friendLinkRepository.remove(link);
    await this.invalidatePageCaches();
    return { message: '友链删除成功' };
  }

  private async invalidatePageCaches(): Promise<void> {
    await this.responseCacheService?.invalidatePrefixes(PAGE_CACHE_PREFIXES);
  }

  async findPublicFriendLinks(): Promise<FriendLink[]> {
    const links = await this.friendLinkRepository.find({ where: { status: 'approved' } });
    return this.sortFriendLinks(links);
  }

  private async findPageById(id: string): Promise<Page> {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (!page) {
      throw new NotFoundException(PAGE_NOT_FOUND_MESSAGE);
    }

    return page;
  }

  private async findFriendLinkById(id: string): Promise<FriendLink> {
    const link = await this.friendLinkRepository.findOne({ where: { id } });
    if (!link) {
      throw new NotFoundException(FRIEND_LINK_NOT_FOUND_MESSAGE);
    }

    return link;
  }

  private async ensurePageSlugUnique(slug: string, currentId?: string): Promise<void> {
    const page = await this.pageRepository.findOne({ where: { slug: slug.trim() } });
    if (page && page.id !== currentId) {
      throw new ConflictException(PAGE_SLUG_EXISTS_MESSAGE);
    }
  }

  private async ensureAboutPageUnique(
    pageType: Page['pageType'],
    currentId?: string,
  ): Promise<void> {
    if (pageType !== 'about') {
      return;
    }

    const aboutPage = await this.pageRepository.findOne({ where: { pageType: 'about' } });
    if (aboutPage && aboutPage.id !== currentId) {
      throw new ConflictException(ABOUT_PAGE_EXISTS_MESSAGE);
    }
  }

  private resolvePublishedAt(
    status: Page['status'],
    currentValue: Date | null = null,
  ): Date | null {
    if (status !== 'published') {
      return currentValue;
    }

    return currentValue ?? new Date();
  }

  private resolveApprovedAt(
    status: FriendLink['status'],
    currentValue: Date | null = null,
  ): Date | null {
    if (status !== 'approved') {
      return null;
    }

    return currentValue ?? new Date();
  }

  private sortFriendLinks(links: FriendLink[]): FriendLink[] {
    return [...links].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.siteName.localeCompare(right.siteName, 'zh-CN');
    });
  }
}
