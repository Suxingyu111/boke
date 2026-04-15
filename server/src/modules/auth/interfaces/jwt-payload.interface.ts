import { User } from '@database/entities';

export interface JwtPayload {
  sub: string;
  username: string;
  role: User['role'];
}