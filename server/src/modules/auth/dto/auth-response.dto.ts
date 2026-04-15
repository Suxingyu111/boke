import { AuthUserDto } from './auth-user.dto';

export class AuthResponseDto {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthUserDto;

  constructor(params: {
    accessToken: string;
    expiresIn: string;
    user: AuthUserDto;
  }) {
    this.accessToken = params.accessToken;
    this.tokenType = 'Bearer';
    this.expiresIn = params.expiresIn;
    this.user = params.user;
  }
}