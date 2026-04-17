import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '@database/entities';
import { ArchivesController } from './archives.controller';
import { ArchivesService } from './archives.service';

@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [ArchivesController],
  providers: [ArchivesService],
  exports: [ArchivesService],
})
export class ArchivesModule {}
