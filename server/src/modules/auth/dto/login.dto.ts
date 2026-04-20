import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '用户名、邮箱或手机号', example: 'admin_manager' })
  @IsString()
  @Length(3, 255)
  account: string;

  @ApiProperty({ description: '登录密码', example: 'admin12345678' })
  @IsString()
  @Length(8, 64)
  password: string;
}
