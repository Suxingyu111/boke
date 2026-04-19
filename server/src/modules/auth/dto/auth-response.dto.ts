import { ApiProperty } from '@nestjs/swagger';
import { AuthUserDto } from './auth-user.dto';

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;
  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';
  @ApiProperty({ example: '7d' })
  expiresIn: string;
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  constructor(params: { accessToken: string; expiresIn: string; user: AuthUserDto }) {
    this.accessToken = params.accessToken;
    this.tokenType = 'Bearer';
    this.expiresIn = params.expiresIn;
    this.user = params.user;
  }
}
