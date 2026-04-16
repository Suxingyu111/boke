import { IsEmail, IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';

export class ApplyFriendLinkDto {
  @IsString({ message: '站点名称必须为字符串' })
  @Length(1, 100, { message: '站点名称长度必须在 1 到 100 个字符之间' })
  siteName: string;

  @IsUrl({}, { message: '站点地址必须为合法 URL' })
  @MaxLength(255, { message: '站点地址不能超过 255 个字符' })
  siteUrl: string;

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
}
