import { IsInt, IsUUID, Min } from 'class-validator';

export class SeriesItemDto {
  @IsUUID('4', { message: '文章 ID 格式不正确' })
  articleId: string;

  @IsInt({ message: '排序值必须为整数' })
  @Min(0, { message: '排序值不能小于 0' })
  sortOrder: number;
}