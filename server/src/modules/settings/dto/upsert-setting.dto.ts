import { IsString, IsOptional, IsEnum, IsBoolean, MaxLength, IsNotEmpty } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  @IsNotEmpty({ message: 'settingKey 不能为空' })
  @MaxLength(100)
  settingKey: string;

  @IsNotEmpty({ message: 'settingValue 不能为空' })
  settingValue: unknown;

  @IsOptional()
  @IsEnum(['string', 'number', 'boolean', 'json'], { message: 'valueType 必须为 string/number/boolean/json' })
  valueType?: 'string' | 'number' | 'boolean' | 'json';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  groupName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
