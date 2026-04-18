import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListArticleSeriesDto {
  @IsOptional()
  @IsInt({ message: '页码必须为整数' })
  @Min(1, { message: '页码不能小于 1' })
  page?: number;

  @IsOptional()
  @IsInt({ message: '每页数量必须为整数' })
  @Min(1, { message: '每页数量不能小于 1' })
  @Max(50, { message: '每页数量不能大于 50' })
  pageSize?: number;
}