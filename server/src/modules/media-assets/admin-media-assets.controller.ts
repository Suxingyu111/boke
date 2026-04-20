import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '@database/entities';
import { ListMediaAssetsDto } from './dto/list-media-assets.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';
import { MediaAssetsService, UploadedMediaFile } from './media-assets.service';

@Controller('admin/media-assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('author')
export class AdminMediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  upload(
    @UploadedFile() file: UploadedMediaFile,
    @Body('altText') altText: string | undefined,
    @CurrentUser() currentUser: User,
  ) {
    return this.mediaAssetsService.upload(file, currentUser, altText);
  }

  @Get()
  findList(@Query() query: ListMediaAssetsDto, @CurrentUser() currentUser: User) {
    return this.mediaAssetsService.list(
      query.page ?? 1,
      query.pageSize ?? 10,
      query.mimeType,
      currentUser,
    );
  }

  @Get(':id')
  findDetail(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.mediaAssetsService.findById(id, currentUser);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMediaAssetDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.mediaAssetsService.update(id, dto.altText, currentUser);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.mediaAssetsService.remove(id, currentUser);
  }
}
