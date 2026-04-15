import { IsBoolean, IsHexColor, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: '分类名称必须为字符串' })
  @Length(1, 100, { message: '分类名称长度必须在 1 到 100 个字符之间' })
  name?: string;

  @IsOptional()
  @IsString({ message: '分类 slug 必须为字符串' })
  @Length(1, 100, { message: '分类 slug 长度必须在 1 到 100 个字符之间' })
  @Matches(/^[a-z0-9-]+$/, { message: '分类 slug 仅支持小写字母、数字和中划线' })
  slug?: string;

  @IsOptional()
  @IsString({ message: '分类描述必须为字符串' })
  @MaxLength(1000, { message: '分类描述不能超过 1000 个字符' })
  description?: string;

  @IsOptional()
  @IsInt({ message: '分类排序值必须为整数' })
  @Min(0, { message: '分类排序值不能小于 0' })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean({ message: '分类显示状态必须为布尔值' })
  isVisible?: boolean;

  @IsOptional()
  @IsHexColor({ message: '分类颜色必须为合法的十六进制颜色值' })
  color?: string;
}