import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListOperationLogsDto {
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
  @IsString({ message: '模块名称必须为字符串' })
  @MaxLength(50, { message: '模块名称不能超过 50 个字符' })
  moduleName?: string;

  @IsOptional()
  @IsString({ message: '操作名称必须为字符串' })
  @MaxLength(50, { message: '操作名称不能超过 50 个字符' })
  actionName?: string;
}