import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, Page, SiteSetting } from '@database/entities';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article, Page, SiteSetting])],
  controllers: [SeoController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}
