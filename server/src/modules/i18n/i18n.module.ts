import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SiteSetting } from '@database/entities';
import { I18nController } from './i18n.controller';
import { I18nService } from './i18n.service';

@Module({
  imports: [TypeOrmModule.forFeature([SiteSetting])],
  controllers: [I18nController],
  providers: [I18nService],
  exports: [I18nService],
})
export class I18nModule {}
