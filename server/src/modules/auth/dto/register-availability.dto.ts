import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export class RegisterAvailabilityDto {
  @ApiPropertyOptional({ description: '注册方式', enum: ['email', 'phone'], example: 'email' })
  @IsOptional()
  @IsIn(['email', 'phone'])
  registerType?: 'email' | 'phone';

  @ApiPropertyOptional({ description: '待检查的联系地址（邮箱或手机号）', example: 'coder@example.com' })
  @IsOptional()
  @IsString()
  @Length(3, 255)
  contact?: string;

  @ApiPropertyOptional({ description: '待检查的用户名', example: 'coder_su' })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  @Matches(USERNAME_PATTERN, {
    message: '用户名只能包含字母、数字和下划线',
  })
  username?: string;

  @ApiPropertyOptional({ description: '待检查的昵称', example: '苏同学' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nickname?: string;
}
