import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import path from 'path';
import { MediaAsset } from '@database/entities';
import { AdminMediaAssetsController } from './admin-media-assets.controller';
import { PublicMediaAssetsController } from './public-media-assets.controller';
import { MEDIA_STORAGE_ROOT, MediaAssetsService } from './media-assets.service';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAsset])],
  controllers: [AdminMediaAssetsController, PublicMediaAssetsController],
  providers: [
    MediaAssetsService,
    {
      provide: MEDIA_STORAGE_ROOT,
      useValue: path.join(process.cwd(), 'uploads', 'media-assets'),
    },
  ],
  exports: [MediaAssetsService],
})
export class MediaAssetsModule {}