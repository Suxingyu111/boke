import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RestoreArticleVersionDto {
  @IsOptional()
  @IsString({ message: '版本备注必须为字符串' })
  @MaxLength(255, { message: '版本备注不能超过 255 个字符' })
  changeNote?: string;
}