import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListMediaAssetsDto {
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
  @IsString({ message: '文件类型必须为字符串' })
  @MaxLength(100, { message: '文件类型不能超过 100 个字符' })
  mimeType?: string;
}