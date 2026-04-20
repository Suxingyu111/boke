import { BadRequestException } from '@nestjs/common';
import path from 'path';

export interface BinaryUploadLike {
  buffer: Buffer;
  mimetype: string;
}

const MAGIC_SIGNATURES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/gif': [Buffer.from('GIF87a', 'ascii'), Buffer.from('GIF89a', 'ascii')],
  'image/webp': [Buffer.from('RIFF', 'ascii')],
  'application/pdf': [Buffer.from('%PDF', 'ascii')],
};

export const assertAllowedFileSignature = (file: BinaryUploadLike): void => {
  const signatures = MAGIC_SIGNATURES[file.mimetype];
  if (!signatures || file.buffer.length === 0) {
    throw new BadRequestException('文件内容与声明类型不匹配');
  }

  const matched = signatures.some(signature => {
    if (file.mimetype === 'image/webp') {
      return (
        file.buffer.length >= 12 &&
        file.buffer.subarray(0, 4).equals(signature) &&
        file.buffer.subarray(8, 12).equals(Buffer.from('WEBP', 'ascii'))
      );
    }

    return file.buffer.subarray(0, signature.length).equals(signature);
  });

  if (!matched) {
    throw new BadRequestException('文件内容与声明类型不匹配');
  }
};

export const sanitizeAttachmentFileName = (
  fileName: string,
  allowedExtensions?: string[],
): string => {
  const normalizedFileName = path.basename(fileName || '').trim();
  if (!normalizedFileName || normalizedFileName !== fileName) {
    throw new BadRequestException('文件名不合法');
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(normalizedFileName)) {
    throw new BadRequestException('文件名不合法');
  }

  if (allowedExtensions && allowedExtensions.length > 0) {
    const fileExtension = path.extname(normalizedFileName).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException('文件类型不合法');
    }
  }

  return normalizedFileName;
};
