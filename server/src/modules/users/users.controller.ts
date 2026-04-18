import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User } from '@database/entities';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
