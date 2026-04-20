import { ApiProperty } from '@nestjs/swagger';

export class RegistrationVerificationResponseDto {
  @ApiProperty({ enum: ['email', 'phone'], example: 'email' })
  registerType: 'email' | 'phone';

  @ApiProperty({ example: 'co***@example.com' })
  maskedContact: string;

  @ApiProperty({
    description: '验证码校验成功后用于最终注册的令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.registration',
  })
  verificationToken: string;

  @ApiProperty({ example: '30m' })
  expiresIn: string;
}
