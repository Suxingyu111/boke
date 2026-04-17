import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendNotificationDto {
  @IsEmail()
  toEmail: string;

  @IsString()
  @MaxLength(255)
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsEnum(['comment', 'subscription', 'system'])
  type?: 'comment' | 'subscription' | 'system';
}
