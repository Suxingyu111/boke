import { IsOptional, IsString, IsBoolean, IsEnum, MaxLength, MinLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: 'draft' | 'published';

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
