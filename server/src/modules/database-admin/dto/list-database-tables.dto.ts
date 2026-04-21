import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListDatabaseTablesDto {
  @IsOptional()
  @IsInt({ message: '页码必须为整数' })
  @Min(1, { message: '页码不能小于 1' })
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt({ message: '每页数量必须为整数' })
  @Min(1, { message: '每页数量不能小于 1' })
  @Max(100, { message: '每页数量不能大于 100' })
  @Type(() => Number)
  pageSize?: number;

  @IsOptional()
  @IsString({ message: '关键字必须为字符串' })
  @MaxLength(100, { message: '关键字不能超过 100 个字符' })
  keyword?: string;

  @IsOptional()
  @IsString({ message: '存储引擎必须为字符串' })
  @MaxLength(20, { message: '存储引擎不能超过 20 个字符' })
  engine?: string;
}
