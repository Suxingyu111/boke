import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateFriendLinkDto {
  @IsOptional()
  @IsString({ message: '站点名称必须为字符串' })
  @Length(1, 100, { message: '站点名称长度必须在 1 到 100 个字符之间' })
  siteName?: string;

  @IsOptional()
  @IsUrl({}, { message: '站点地址必须为合法 URL' })
  @MaxLength(255, { message: '站点地址不能超过 255 个字符' })
  siteUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Logo 地址必须为合法 URL' })
  @MaxLength(500, { message: 'Logo 地址不能超过 500 个字符' })
  logoUrl?: string;

  @IsOptional()
  @IsString({ message: '站点描述必须为字符串' })
  @MaxLength(255, { message: '站点描述不能超过 255 个字符' })
  description?: string;

  @IsOptional()
  @IsEmail({}, { message: '联系邮箱格式不正确' })
  @MaxLength(255, { message: '联系邮箱不能超过 255 个字符' })
  contactEmail?: string;

  @IsOptional()
  @IsString({ message: '申请人名称必须为字符串' })
  @Length(1, 100, { message: '申请人名称长度必须在 1 到 100 个字符之间' })
  applicantName?: string;

  @IsOptional()
  @IsInt({ message: '排序值必须为整数' })
  @Min(0, { message: '排序值不能小于 0' })
  sortOrder?: number;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'offline'], { message: '友链状态不合法' })
  status?: 'pending' | 'approved' | 'rejected' | 'offline';
}
