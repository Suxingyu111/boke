import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from '@database/entities';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly configService: ConfigService,
  ) {}

  async getRssFeed(siteUrl: string): Promise<string> {
    const normalizedSiteUrl = this.normalizeSiteUrl(siteUrl);
    const { title, description } = this.getSiteMeta();
    const articles = await this.loadRecentPublishedArticles();
    const lastBuildDate = articles[0]?.publishedAt ?? articles[0]?.createdAt ?? new Date();

    const items = articles
      .map(article => {
        const articleUrl = `${normalizedSiteUrl}/articles/${article.slug}`;
        const publishedAt = article.publishedAt ?? article.createdAt;
        const excerpt = this.escapeXml(article.excerpt ?? '');

        return [
          '<item>',
          `<title>${this.escapeXml(article.title)}</title>`,
          `<link>${this.escapeXml(articleUrl)}</link>`,
          `<guid isPermaLink="true">${this.escapeXml(articleUrl)}</guid>`,
          `<pubDate>${publishedAt.toUTCString()}</pubDate>`,
          `<description>${excerpt}</description>`,
          '</item>',
        ].join('');
      })
      .join('');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0">',
      '<channel>',
      `<title>${this.escapeXml(title)}</title>`,
      `<link>${this.escapeXml(normalizedSiteUrl)}</link>`,
      `<description>${this.escapeXml(description)}</description>`,
      '<language>zh-CN</language>',
      `<lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>`,
      items,
      '</channel>',
      '</rss>',
    ].join('');
  }

  async getAtomFeed(siteUrl: string): Promise<string> {
    const normalizedSiteUrl = this.normalizeSiteUrl(siteUrl);
    const { title, description } = this.getSiteMeta();
    const articles = await this.loadRecentPublishedArticles();
    const updatedAt = articles[0]?.publishedAt ?? articles[0]?.createdAt ?? new Date();
    const atomSelfLink = `${normalizedSiteUrl}/api/feed/atom`;

    const entries = articles
      .map(article => {
        const articleUrl = `${normalizedSiteUrl}/articles/${article.slug}`;
        const publishedAt = article.publishedAt ?? article.createdAt;
        const authorName = article.author?.nickname || article.author?.username || '博主';

        return [
          '<entry>',
          `<id>${this.escapeXml(articleUrl)}</id>`,
          `<title>${this.escapeXml(article.title)}</title>`,
          `<link href="${this.escapeXml(articleUrl)}" />`,
          `<updated>${publishedAt.toISOString()}</updated>`,
          `<published>${publishedAt.toISOString()}</published>`,
          `<summary>${this.escapeXml(article.excerpt ?? '')}</summary>`,
          '<author>',
          `<name>${this.escapeXml(authorName)}</name>`,
          '</author>',
          '</entry>',
        ].join('');
      })
      .join('');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<feed xmlns="http://www.w3.org/2005/Atom">',
      `<id>${this.escapeXml(atomSelfLink)}</id>`,
      `<title>${this.escapeXml(title)}</title>`,
      `<subtitle>${this.escapeXml(description)}</subtitle>`,
      `<link href="${this.escapeXml(normalizedSiteUrl)}" />`,
      `<link href="${this.escapeXml(atomSelfLink)}" rel="self" type="application/atom+xml" />`,
      `<updated>${updatedAt.toISOString()}</updated>`,
      entries,
      '</feed>',
    ].join('');
  }

  private async loadRecentPublishedArticles(): Promise<Article[]> {
    const now = new Date();
    return this.articleRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .where('article.deletedAt IS NULL')
      .andWhere('article.status = :status', { status: 'published' })
      .andWhere('article.visibility = :visibility', { visibility: 'public' })
      .andWhere('(article.publishedAt IS NULL OR article.publishedAt <= :now)', { now })
      .orderBy('article.publishedAt', 'DESC')
      .addOrderBy('article.createdAt', 'DESC')
      .limit(20)
      .getMany();
  }

  private getSiteMeta(): { title: string; description: string } {
    return {
      title: this.configService.get<string>('app.name', 'Blog System'),
      description: this.configService.get<string>('app.desc', '博客内容订阅'),
    };
  }

  private normalizeSiteUrl(siteUrl: string): string {
    return siteUrl.trim().replace(/\/$/, '');
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
