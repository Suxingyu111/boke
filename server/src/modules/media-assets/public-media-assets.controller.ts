import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { MediaAssetsService } from './media-assets.service';

@Controller('media-assets')
export class PublicMediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Get('files/:fileName')
  async serveFile(@Param('fileName') fileName: string, @Res() response: Response) {
    const file = await this.mediaAssetsService.resolveFileForDownload(fileName);
    response.type(file.mimeType);
    return response.sendFile(file.absolutePath);
  }
}