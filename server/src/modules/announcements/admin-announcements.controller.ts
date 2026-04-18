import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User } from '@database/entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementsService } from './announcements.service';

@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  /** 获取全部公告 */
  @Get()
  getAnnouncements(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.announcementsService.adminGetAnnouncements(page, pageSize);
  }

  /** 创建公告 */
  @Post()
  create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: User) {
    return this.announcementsService.create(dto, user.id);
  }

  /** 更新公告 */
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementsService.update(id, dto);
  }

  /** 删除公告 */
  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.announcementsService.delete(id);
  }
}
