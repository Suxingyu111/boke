import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const STEP_UP_SCOPES = ['backup', 'database-admin'] as const;
export type StepUpScope = (typeof STEP_UP_SCOPES)[number];

export class StepUpDto {
  @ApiProperty({ example: 'current_password_example' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ enum: STEP_UP_SCOPES, example: 'backup' })
  @IsString()
  @IsIn(STEP_UP_SCOPES)
  scope: StepUpScope;
}
