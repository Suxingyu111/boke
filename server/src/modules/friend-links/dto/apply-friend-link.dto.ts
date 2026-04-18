import { IsOptional, IsString, IsUrl, MaxLength, MinLength, IsEmail } from 'class-validator';

export class ApplyFriendLinkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  siteName: string;

  @IsString()
  @IsUrl()
  @MaxLength(255)
  siteUrl: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  applicantName?: string;
}
