import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '@database/entities';
import { PagesService } from './pages.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { CreateFriendLinkDto } from './dto/create-friend-link.dto';
import { UpdateFriendLinkDto } from './dto/update-friend-link.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Post('pages')
  createPage(@Body() dto: CreatePageDto, @CurrentUser() currentUser: User) {
    return this.pagesService.createPage(dto, currentUser);
  }

  @Get('pages')
  findPages() {
    return this.pagesService.findAdminPages();
  }

  @Get('pages/:id')
  findPageById(@Param('id') id: string) {
    return this.pagesService.findAdminPageById(id);
  }

  @Patch('pages/:id')
  updatePage(
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.pagesService.updatePage(id, dto, currentUser);
  }

  @Delete('pages/:id')
  removePage(@Param('id') id: string) {
    return this.pagesService.removePage(id);
  }

  @Post('friend-links')
  createFriendLink(@Body() dto: CreateFriendLinkDto) {
    return this.pagesService.createFriendLink(dto);
  }

  @Get('friend-links')
  findFriendLinks() {
    return this.pagesService.findAdminFriendLinks();
  }

  @Get('friend-links/:id')
  findFriendLinkById(@Param('id') id: string) {
    return this.pagesService.findAdminFriendLinkById(id);
  }

  @Patch('friend-links/:id')
  updateFriendLink(@Param('id') id: string, @Body() dto: UpdateFriendLinkDto) {
    return this.pagesService.updateFriendLink(id, dto);
  }

  @Delete('friend-links/:id')
  removeFriendLink(@Param('id') id: string) {
    return this.pagesService.removeFriendLink(id);
  }
}
