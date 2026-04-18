import { Body, Controller, Get, Post, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SanitizePipe } from '../../common/pipes/sanitize.pipe';
import { ApplyFriendLinkDto } from './dto/apply-friend-link.dto';
import { FriendLinksService } from './friend-links.service';

@Controller('friend-links')
export class PublicFriendLinksController {
  constructor(private readonly friendLinksService: FriendLinksService) {}

  /** 获取已审核的友链列表 */
  @Get()
  getApprovedLinks() {
    return this.friendLinksService.getApprovedLinks();
  }

  /** 提交友链申请 */
  @Post('apply')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @UsePipes(SanitizePipe)
  applyLink(@Body() dto: ApplyFriendLinkDto) {
    return this.friendLinksService.applyLink(dto);
  }
}
