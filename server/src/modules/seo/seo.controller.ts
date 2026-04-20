import { Controller, Get, Param, Query } from '@nestjs/common';
import { ResponseCache } from '@common/security/decorators/response-cache.decorator';
import { SeoService } from './seo.service';

@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  /** 获取站点全局 SEO 配置 */
  @Get('site')
  @ResponseCache({ keyPrefix: 'seo:site', ttlSeconds: 1800, clientTtlSeconds: 300 })
  getSiteSeoSettings() {
    return this.seoService.getSiteSeoSettings();
  }

  /** 获取文章 SEO 元数据 */
  @Get('articles/:slug')
  @ResponseCache({
    keyPrefix: 'seo:article',
    ttlSeconds: 600,
    clientTtlSeconds: 120,
    cacheNotFound: true,
  })
  getArticleSeoMeta(@Param('slug') slug: string) {
    return this.seoService.getArticleSeoMeta(slug);
  }

  /** 获取页面 SEO 元数据 */
  @Get('pages/:slug')
  @ResponseCache({
    keyPrefix: 'seo:page',
    ttlSeconds: 600,
    clientTtlSeconds: 120,
    cacheNotFound: true,
  })
  getPageSeoMeta(@Param('slug') slug: string) {
    return this.seoService.getPageSeoMeta(slug);
  }

  /** 生成 sitemap 数据（JSON 格式） */
  @Get('sitemap')
  @ResponseCache({ keyPrefix: 'seo:sitemap', ttlSeconds: 600, clientTtlSeconds: 300 })
  generateSitemap(@Query('baseUrl') baseUrl: string = 'https://blog.example.com') {
    return this.seoService.generateSitemap(baseUrl);
  }
}
