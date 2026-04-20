import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length, Matches } from 'class-validator';

export class VerifyRegistrationCodeDto {
  @ApiProperty({ description: '注册方式', enum: ['email', 'phone'], example: 'email' })
  @IsIn(['email', 'phone'])
  registerType: 'email' | 'phone';

  @ApiProperty({ description: '邮箱地址或手机号', example: 'coder@example.com' })
  @IsString()
  @Length(3, 255)
  contact: string;

  @ApiProperty({ description: '6 位验证码', example: '238901' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: '验证码必须为 6 位数字' })
  code: string;
}
