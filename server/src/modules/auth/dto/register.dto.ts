import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class RegisterDto {
  @ApiProperty({ description: '注册方式', enum: ['email', 'phone'], example: 'email' })
  @IsIn(['email', 'phone'])
  registerType: 'email' | 'phone';

  @ApiProperty({
    description: '验证码校验成功后返回的注册令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.registration',
  })
  @IsString()
  @Length(20, 1000)
  verificationToken: string;

  @ApiProperty({ description: '用户名', example: 'coder_su' })
  @IsString()
  @Length(3, 50)
  @Matches(USERNAME_PATTERN, {
    message: '用户名只能包含字母、数字和下划线',
  })
  username: string;

  @ApiProperty({ description: '登录密码，必须包含字母和数字', example: 'Pass123456' })
  @IsString()
  @Length(8, 64)
  @Matches(PASSWORD_PATTERN, {
    message: '密码必须包含字母和数字',
  })
  password: string;

  @ApiPropertyOptional({ description: '昵称', example: '苏同学' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nickname?: string;
}
