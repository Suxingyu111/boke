import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export class RegisterDto {
  @IsString()
  @Length(3, 50)
  @Matches(USERNAME_PATTERN, {
    message: '用户名只能包含字母、数字和下划线',
  })
  username: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  @Length(8, 64)
  @Matches(PASSWORD_PATTERN, {
    message: '密码必须包含字母和数字',
  })
  password: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  nickname?: string;
}
