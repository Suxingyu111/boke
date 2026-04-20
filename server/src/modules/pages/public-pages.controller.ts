import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ResponseCache } from '@common/security/decorators/response-cache.decorator';
import { PagesService } from './pages.service';
import { ApplyFriendLinkDto } from './dto/apply-friend-link.dto';

@Controller()
export class PublicPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get('pages/about')
  @ResponseCache({
    keyPrefix: 'pages:about',
    ttlSeconds: 1800,
    clientTtlSeconds: 300,
    cacheNotFound: true,
  })
  findAboutPage() {
    return this.pagesService.findAboutPage();
  }

  @Get('pages/:slug')
  @ResponseCache({
    keyPrefix: 'pages:detail',
    ttlSeconds: 1800,
    clientTtlSeconds: 300,
    cacheNotFound: true,
  })
  findPageBySlug(@Param('slug') slug: string) {
    return this.pagesService.findPublicPageBySlug(slug);
  }

  @Get('friend-links')
  @ResponseCache({ keyPrefix: 'friend-links:public', ttlSeconds: 900, clientTtlSeconds: 300 })
  findFriendLinks() {
    return this.pagesService.findPublicFriendLinks();
  }

  @Post('friend-links/applications')
  applyFriendLink(@Body() dto: ApplyFriendLinkDto) {
    return this.pagesService.applyFriendLink(dto);
  }
}
