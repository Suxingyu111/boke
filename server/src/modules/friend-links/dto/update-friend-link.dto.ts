import { IsOptional, IsString, IsUrl, MaxLength, MinLength, IsNumber, IsEmail, IsEnum } from 'class-validator';

export class UpdateFriendLinkDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  siteName?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(255)
  siteUrl?: string;

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
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'offline'])
  status?: 'pending' | 'approved' | 'rejected' | 'offline';
}
