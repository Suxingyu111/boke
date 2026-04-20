import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Put,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GuestbookService } from './guestbook.service';

@Controller('admin/guestbook')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminGuestbookController {
  constructor(private readonly guestbookService: GuestbookService) {}

  /** 获取全部留言（含待审核） */
  @Get()
  getMessages(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
  ) {
    return this.guestbookService.adminGetMessages(page, pageSize, status);
  }

  /** 审核留言 */
  @Put(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: 'approved' | 'rejected',
  ) {
    return this.guestbookService.updateStatus(id, status);
  }

  /** 管理员回复留言 */
  @Post(':id/reply')
  adminReply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('content') content: string,
  ) {
    return this.guestbookService.adminReply(id, content);
  }

  /** 删除留言 */
  @Delete(':id')
  deleteMessage(@Param('id', ParseUUIDPipe) id: string) {
    return this.guestbookService.deleteMessage(id);
  }
}
