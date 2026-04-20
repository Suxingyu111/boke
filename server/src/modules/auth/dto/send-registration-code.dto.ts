import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length } from 'class-validator';

export class SendRegistrationCodeDto {
  @ApiProperty({ description: '注册方式', enum: ['email', 'phone'], example: 'email' })
  @IsIn(['email', 'phone'])
  registerType: 'email' | 'phone';

  @ApiProperty({ description: '邮箱地址或手机号', example: 'coder@example.com' })
  @IsString()
  @Length(3, 255)
  contact: string;
}
