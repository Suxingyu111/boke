import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  contentHtml?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;
}
