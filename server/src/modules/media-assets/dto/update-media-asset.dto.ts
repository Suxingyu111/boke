import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMediaAssetDto {
  @IsOptional()
  @IsString({ message: '图片说明必须为字符串' })
  @MaxLength(255, { message: '图片说明不能超过 255 个字符' })
  altText?: string;
}