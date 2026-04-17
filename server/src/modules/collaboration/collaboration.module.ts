import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article, DraftCollaborator, DraftEditLog, User } from '@database/entities';
import { CollaborationService } from './collaboration.service';
import { CollaborationController } from './collaboration.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Article, DraftCollaborator, DraftEditLog, User])],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
