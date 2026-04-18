import { Controller, Get, Param, Put, Body, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { I18nService, SupportedLocale } from './i18n.service';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  /** 获取支持的语言列表 */
  @Get('locales')
  getSupportedLocales() {
    return this.i18nService.getSupportedLocales();
  }

  /** 获取默认语言 */
  @Get('default')
  getDefaultLocale() {
    return this.i18nService.getDefaultLocale();
  }

  /** 获取指定语言翻译包 */
  @Get('translations/:locale')
  getTranslations(@Param('locale') locale: SupportedLocale) {
    return this.i18nService.getTranslations(locale);
  }

  /** 设置默认语言（管理端） */
  @Put('default')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  setDefaultLocale(@Body('locale') locale: SupportedLocale) {
    return this.i18nService.setDefaultLocale(locale);
  }
}
