import { IsOptional, IsString, IsUUID, IsInt, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchArticlesDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  pageSize?: number;
}
