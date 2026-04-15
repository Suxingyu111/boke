import { IsString, Length, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString({ message: '标签名称必须为字符串' })
  @Length(1, 50, { message: '标签名称长度必须在 1 到 50 个字符之间' })
  name: string;

  @IsString({ message: '标签 slug 必须为字符串' })
  @Length(1, 100, { message: '标签 slug 长度必须在 1 到 100 个字符之间' })
  @Matches(/^[a-z0-9-]+$/, { message: '标签 slug 仅支持小写字母、数字和中划线' })
  slug: string;
}