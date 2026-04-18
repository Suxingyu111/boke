import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoKeywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoSlug?: string;
}
