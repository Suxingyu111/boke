import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ListArticlesDto {
  @IsOptional()
  @IsInt({ message: '页码必须为整数' })
  @Min(1, { message: '页码不能小于 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: '每页数量必须为整数' })
  @Min(1, { message: '每页数量不能小于 1' })
  @Max(50, { message: '每页数量不能大于 50' })
  pageSize?: number;

  @IsOptional()
  @IsEnum(['draft', 'scheduled', 'published', 'archived'], {
    message: '文章状态不合法',
  })
  status?: 'draft' | 'scheduled' | 'published' | 'archived';

  @IsOptional()
  @IsUUID('4', { message: '分类 ID 格式不正确' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: '标签 ID 格式不正确' })
  tagId?: string;

  @IsOptional()
  @IsString({ message: '关键字必须为字符串' })
  @MaxLength(100, { message: '关键字不能超过 100 个字符' })
  keyword?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'publishedAt', 'viewCount'], {
    message: '排序字段不合法',
  })
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: '排序方向不合法' })
  order?: 'ASC' | 'DESC';
}
