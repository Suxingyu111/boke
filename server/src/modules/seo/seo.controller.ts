import { Controller, Get, Param, Query } from '@nestjs/common';

import { SeoService } from './seo.service';

@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  /** 获取站点全局 SEO 配置 */
  @Get('site')
  getSiteSeoSettings() {
    return this.seoService.getSiteSeoSettings();
  }

  /** 获取文章 SEO 元数据 */
  @Get('articles/:slug')
  getArticleSeoMeta(@Param('slug') slug: string) {
    return this.seoService.getArticleSeoMeta(slug);
  }

  /** 获取页面 SEO 元数据 */
  @Get('pages/:slug')
  getPageSeoMeta(@Param('slug') slug: string) {
    return this.seoService.getPageSeoMeta(slug);
  }

  /** 生成 sitemap 数据（JSON 格式） */
  @Get('sitemap')
  generateSitemap(@Query('baseUrl') baseUrl: string = 'https://blog.example.com') {
    return this.seoService.generateSitemap(baseUrl);
  }
}
