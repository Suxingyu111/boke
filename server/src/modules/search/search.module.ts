import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '@database/entities';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AdminSearchController } from './admin-search.controller';
import { ElasticsearchProvider } from './elasticsearch.provider';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Article])],
  controllers: [SearchController, AdminSearchController],
  providers: [ElasticsearchProvider, SearchService],
  exports: [SearchService],
})
export class SearchModule {}
