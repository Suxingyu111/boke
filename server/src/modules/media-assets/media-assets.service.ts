import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { assertAllowedFileSignature } from '@common/security/file-validation.util';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Repository } from 'typeorm';
import { MediaAsset, User } from '@database/entities';

export const MEDIA_STORAGE_ROOT = 'MEDIA_STORAGE_ROOT';

export interface UploadedMediaFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MEDIA_ASSET_NOT_FOUND_MESSAGE = '媒体资源不存在';
const MEDIA_FILE_NOT_FOUND_MESSAGE = '媒体文件不存在';
const INVALID_MEDIA_FILE_MESSAGE = '不支持的文件类型';
const EMPTY_MEDIA_FILE_MESSAGE = '上传文件不能为空';
const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024;
const MEDIA_FILE_URL_PREFIX = '/api/media-assets/files';

const ALLOWED_MEDIA_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
};

@Injectable()
export class MediaAssetsService {
  constructor(
    @InjectRepository(MediaAsset)
    private readonly mediaAssetRepository: Repository<MediaAsset>,
    @Inject(MEDIA_STORAGE_ROOT)
    private readonly storageRoot: string,
  ) {}

  async upload(file: UploadedMediaFile, currentUser: User, altText?: string) {
    this.validateFile(file);
    await this.ensureStorageRoot();

    const hashValue = createHash('sha256').update(file.buffer).digest('hex');
    const existing = await this.mediaAssetRepository.findOne({ where: { hashValue } });
    if (existing) {
      return existing;
    }

    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileName = `${randomUUID()}${fileExt}`;
    const absolutePath = this.resolveAbsolutePath(fileName);
    await fs.writeFile(absolutePath, file.buffer);

    const mediaAsset = this.mediaAssetRepository.create({
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileExt,
      fileSize: file.size,
      filePath: fileName,
      fileUrl: `${MEDIA_FILE_URL_PREFIX}/${fileName}`,
      width: null,
      height: null,
      altText: altText?.trim() || null,
      storageDisk: 'local',
      hashValue,
      uploadedBy: currentUser.id,
    });

    return this.mediaAssetRepository.save(mediaAsset);
  }

  async list(page = 1, pageSize = 10, mimeType?: string) {
    const [items, total] = await this.mediaAssetRepository.findAndCount({
      where: mimeType ? { mimeType } : undefined,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async findById(id: string) {
    return this.findAssetOrFail(id);
  }

  async update(id: string, altText?: string) {
    const asset = await this.findAssetOrFail(id);

    return this.mediaAssetRepository.save({
      ...asset,
      altText: altText !== undefined ? altText.trim() || null : asset.altText,
      updatedAt: new Date(),
    });
  }

  async remove(id: string) {
    const asset = await this.findAssetOrFail(id);
    await this.safeRemoveFile(asset.filePath);
    await this.mediaAssetRepository.delete(asset.id);

    return { message: '媒体资源删除成功' };
  }

  async resolveFileForDownload(fileName: string) {
    this.ensureSafeFileName(fileName);
    const absolutePath = this.resolveAbsolutePath(fileName);

    try {
      await fs.access(absolutePath);
    } catch {
      throw new NotFoundException(MEDIA_FILE_NOT_FOUND_MESSAGE);
    }

    const asset = await this.mediaAssetRepository.findOne({ where: { fileName } });
    if (!asset) {
      throw new NotFoundException(MEDIA_ASSET_NOT_FOUND_MESSAGE);
    }

    return {
      absolutePath,
      mimeType: asset.mimeType,
    };
  }

  private async findAssetOrFail(id: string): Promise<MediaAsset> {
    const asset = await this.mediaAssetRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(MEDIA_ASSET_NOT_FOUND_MESSAGE);
    }

    return asset;
  }

  private validateFile(file?: UploadedMediaFile): void {
    if (!file || !file.buffer || file.size <= 0) {
      throw new BadRequestException(EMPTY_MEDIA_FILE_MESSAGE);
    }

    if (file.size > MAX_MEDIA_FILE_SIZE) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const fileExt = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ALLOWED_MEDIA_TYPES[file.mimetype];

    if (!allowedExtensions || !allowedExtensions.includes(fileExt)) {
      throw new BadRequestException(INVALID_MEDIA_FILE_MESSAGE);
    }

    assertAllowedFileSignature(file);
  }

  private async ensureStorageRoot(): Promise<void> {
    await fs.mkdir(this.storageRoot, { recursive: true });
  }

  private resolveAbsolutePath(fileName: string): string {
    return path.join(this.storageRoot, fileName);
  }

  private ensureSafeFileName(fileName: string): void {
    if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new BadRequestException('文件路径不合法');
    }
  }

  private async safeRemoveFile(filePath: string): Promise<void> {
    const absolutePath = this.resolveAbsolutePath(filePath);

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
