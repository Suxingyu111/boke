import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrationCodeSentDto {
  @ApiProperty({ enum: ['email', 'phone'], example: 'email' })
  registerType: 'email' | 'phone';

  @ApiProperty({ example: 'co***@example.com' })
  maskedContact: string;

  @ApiProperty({ example: 600 })
  expiresInSeconds: number;

  @ApiProperty({ example: 60 })
  cooldownSeconds: number;

  @ApiPropertyOptional({ example: '238901', nullable: true })
  debugCode?: string | null;
}
