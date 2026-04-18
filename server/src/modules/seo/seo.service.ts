import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, Page, SiteSetting } from '@database/entities';

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(SiteSetting)
    private readonly settingRepository: Repository<SiteSetting>,
  ) {}

  /** 获取文章的 SEO 元数据 */
  async getArticleSeoMeta(slug: string) {
    const article = await this.articleRepository.findOne({
      where: { slug, status: 'published' },
      relations: ['category', 'author'],
    });

    if (!article) {
      throw new NotFoundException('文章不存在');
    }

    return {
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.excerpt || '',
      keywords: article.seoKeywords || '',
      ogType: 'article',
      ogTitle: article.seoTitle || article.title,
      ogDescription: article.seoDescription || article.excerpt || '',
      ogImage: article.coverImage || '',
      author: article.author?.nickname || article.author?.username || '',
      publishedAt: article.publishedAt?.toISOString() || '',
      category: article.category?.name || '',
    };
  }

  /** 获取页面的 SEO 元数据 */
  async getPageSeoMeta(slug: string) {
    const page = await this.pageRepository.findOne({
      where: { slug, status: 'published' },
    });

    if (!page) {
      throw new NotFoundException('页面不存在');
    }

    return {
      title: page.seoTitle || page.title,
      description: page.seoDescription || page.summary || '',
      ogType: 'website',
      ogTitle: page.seoTitle || page.title,
      ogDescription: page.seoDescription || page.summary || '',
    };
  }

  /** 获取站点级别 SEO 设置 */
  async getSiteSeoSettings() {
    const seoKeys = [
      'site_title',
      'site_description',
      'site_keywords',
      'site_author',
      'site_logo',
      'site_favicon',
      'og_image',
      'google_analytics_id',
      'baidu_analytics_id',
    ];

    const settings = await this.settingRepository
      .createQueryBuilder('s')
      .where('s.setting_key IN (:...keys)', { keys: seoKeys })
      .getMany();

    const result: Record<string, unknown> = {};
    for (const setting of settings) {
      result[setting.settingKey] = setting.settingValue;
    }
    return result;
  }

  /** 生成 sitemap 数据 */
  async generateSitemap(baseUrl: string) {
    const articles = await this.articleRepository.find({
      where: { status: 'published' },
      select: ['slug', 'updatedAt', 'publishedAt'],
      order: { publishedAt: 'DESC' },
    });

    const pages = await this.pageRepository.find({
      where: { status: 'published' },
      select: ['slug', 'updatedAt'],
    });

    const urls = [
      { loc: baseUrl, changefreq: 'daily', priority: '1.0' },
      ...articles.map(article => ({
        loc: `${baseUrl}/articles/${article.slug}`,
        lastmod: (article.updatedAt || article.publishedAt)?.toISOString(),
        changefreq: 'weekly' as const,
        priority: '0.8',
      })),
      ...pages.map(page => ({
        loc: `${baseUrl}/pages/${page.slug}`,
        lastmod: page.updatedAt?.toISOString(),
        changefreq: 'monthly' as const,
        priority: '0.6',
      })),
    ];

    return urls;
  }
}
