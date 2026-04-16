import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PagesService } from './pages.service';
import { ApplyFriendLinkDto } from './dto/apply-friend-link.dto';

@Controller()
export class PublicPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get('pages/about')
  findAboutPage() {
    return this.pagesService.findAboutPage();
  }

  @Get('pages/:slug')
  findPageBySlug(@Param('slug') slug: string) {
    return this.pagesService.findPublicPageBySlug(slug);
  }

  @Get('friend-links')
  findFriendLinks() {
    return this.pagesService.findPublicFriendLinks();
  }

  @Post('friend-links/applications')
  applyFriendLink(@Body() dto: ApplyFriendLinkDto) {
    return this.pagesService.applyFriendLink(dto);
  }
}
