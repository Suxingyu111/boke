import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(3, 255)
  account: string;

  @IsString()
  @Length(8, 64)
  password: string;
}
