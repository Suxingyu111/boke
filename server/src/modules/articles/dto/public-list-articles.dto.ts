import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class PublicListArticlesDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @IsInt({ message: '页码必须为整数' })
  @Min(1, { message: '页码不能小于 1' })
  page?: number;

  @ApiPropertyOptional({ description: '每页数量，最大 50', example: 10 })
  @IsOptional()
  @IsInt({ message: '每页数量必须为整数' })
  @Min(1, { message: '每页数量不能小于 1' })
  @Max(50, { message: '每页数量不能大于 50' })
  pageSize?: number;

  @ApiPropertyOptional({
    description: '分类 ID',
    example: '0f4c5af2-1111-4444-8888-123456789abc',
  })
  @IsOptional()
  @IsUUID('4', { message: '分类 ID 格式不正确' })
  categoryId?: string;

  @ApiPropertyOptional({
    description: '标签 ID',
    example: '0f4c5af2-2222-4444-8888-123456789abc',
  })
  @IsOptional()
  @IsUUID('4', { message: '标签 ID 格式不正确' })
  tagId?: string;

  @ApiPropertyOptional({ description: '搜索关键字', example: 'NestJS' })
  @IsOptional()
  @IsString({ message: '关键字必须为字符串' })
  @MaxLength(100, { message: '关键字不能超过 100 个字符' })
  keyword?: string;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['createdAt', 'updatedAt', 'publishedAt', 'viewCount'],
    example: 'publishedAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'publishedAt', 'viewCount'], {
    message: '排序字段不合法',
  })
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: '排序方向不合法' })
  order?: 'ASC' | 'DESC';
}
