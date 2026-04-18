import { IsOptional, IsString, IsNumber, MaxLength, Min } from 'class-validator';

export class RecordVisitDto {
  @IsString()
  @MaxLength(500)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referer?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stayDuration?: number;
}
