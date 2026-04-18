import { IsOptional, IsString, MaxLength, IsUrl, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nickname?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(500)
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
