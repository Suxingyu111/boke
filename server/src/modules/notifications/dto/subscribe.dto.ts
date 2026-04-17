import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubscribeDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
