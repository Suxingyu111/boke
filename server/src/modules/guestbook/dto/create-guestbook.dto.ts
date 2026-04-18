import { IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength, IsEmail } from 'class-validator';

export class CreateGuestbookDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nickname: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @MaxLength(500)
  website?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
