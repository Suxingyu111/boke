import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrationAvailabilityFieldDto {
  @ApiProperty({ example: true })
  available: boolean;

  @ApiPropertyOptional({ example: '用户名可用', nullable: true })
  message: string | null;

  @ApiPropertyOptional({ example: 'coder_su', nullable: true })
  normalizedValue?: string | null;
}

export class RegistrationAvailabilityResponseDto {
  @ApiPropertyOptional({ type: RegistrationAvailabilityFieldDto, nullable: true })
  contact?: RegistrationAvailabilityFieldDto;

  @ApiPropertyOptional({ type: RegistrationAvailabilityFieldDto, nullable: true })
  username?: RegistrationAvailabilityFieldDto;

  @ApiPropertyOptional({ type: RegistrationAvailabilityFieldDto, nullable: true })
  nickname?: RegistrationAvailabilityFieldDto;
}
