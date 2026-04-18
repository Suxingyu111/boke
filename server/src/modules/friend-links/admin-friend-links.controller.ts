import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateFriendLinkDto } from './dto/update-friend-link.dto';
import { FriendLinksService } from './friend-links.service';

@Controller('admin/friend-links')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminFriendLinksController {
  constructor(private readonly friendLinksService: FriendLinksService) {}

  /** 获取全部友链（可筛选状态） */
  @Get()
  getLinks(@Query('status') status?: string) {
    return this.friendLinksService.adminGetLinks(status);
  }

  /** 审核友链 */
  @Put(':id/review')
  reviewLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: 'approved' | 'rejected',
  ) {
    return this.friendLinksService.reviewLink(id, status);
  }

  /** 更新友链信息 */
  @Put(':id')
  updateLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFriendLinkDto,
  ) {
    return this.friendLinksService.updateLink(id, dto);
  }

  /** 删除友链 */
  @Delete(':id')
  deleteLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.friendLinksService.deleteLink(id);
  }
}
