import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ResponseCache } from '@common/security/decorators/response-cache.decorator';

@Controller()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get('tags')
  @ResponseCache({ keyPrefix: 'tags:public', ttlSeconds: 3600, clientTtlSeconds: 300 })
  findPublicList() {
    return this.tagsService.findAll();
  }

  @Get('admin/tags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAdminList() {
    return this.tagsService.findAll();
  }

  @Get('admin/tags/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findById(@Param('id') id: string) {
    return this.tagsService.findById(id);
  }

  @Post('admin/tags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Patch('admin/tags/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(id, dto);
  }

  @Delete('admin/tags/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}
