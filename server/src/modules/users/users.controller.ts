import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { User } from '@database/entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadedMediaFile } from '../media-assets/media-assets.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** 获取当前用户个人资料 */
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  /** 更新个人资料 */
  @Put('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  /** 上传头像图片（自动更新用户 avatar 字段，最大 10 MB，服务端自动压缩） */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAvatar(
    @UploadedFile() file: UploadedMediaFile,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.uploadAvatar(currentUser, file);
  }

  /** 修改密码 */
  @Put('password')
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  /** 获取当前用户收藏的文章 */
  @Get('favorites')
  getFavoriteArticles(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    return this.usersService.getFavoriteArticles(user.id, page, pageSize);
  }
}
