import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';
import { BatchUpsertSettingsDto } from './dto/batch-upsert-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** 公开接口 - 获取站点公开设置（标题、副标题、备案等） */
  @Get('settings')
  findPublicSettings() {
    return this.settingsService.findPublicSettings();
  }

  /** 管理接口 - 获取全部设置，支持按分组过滤 */
  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAllSettings(@Query('group') group?: string) {
    return this.settingsService.findAllSettings(group);
  }

  /** 管理接口 - 按 key 获取单个设置 */
  @Get('admin/settings/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findByKey(@Param('key') key: string) {
    return this.settingsService.findByKey(key);
  }

  /** 管理接口 - 新增或更新单个设置 */
  @Put('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  upsert(@Body() dto: UpsertSettingDto) {
    return this.settingsService.upsert(dto);
  }

  /** 管理接口 - 批量新增或更新设置 */
  @Put('admin/settings/batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  batchUpsert(@Body() dto: BatchUpsertSettingsDto) {
    return this.settingsService.batchUpsert(dto.settings);
  }

  /** 管理接口 - 删除设置项 */
  @Delete('admin/settings/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('key') key: string) {
    return this.settingsService.remove(key);
  }
}
