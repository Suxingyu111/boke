import { Controller, Get, Header, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { FeedService } from './feed.service';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('rss')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  getRss(@Req() req: Request): Promise<string> {
    return this.feedService.getRssFeed(this.resolveSiteUrl(req));
  }

  @Get('atom')
  @Header('Content-Type', 'application/atom+xml; charset=utf-8')
  getAtom(@Req() req: Request): Promise<string> {
    return this.feedService.getAtomFeed(this.resolveSiteUrl(req));
  }

  private resolveSiteUrl(req: Request): string {
    const forwardedProtoHeader = req.headers['x-forwarded-proto'];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const protocol = forwardedProto?.split(',')[0]?.trim() || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    return `${protocol}://${host}`;
  }
}
