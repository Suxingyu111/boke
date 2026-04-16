import { User } from '@database/entities';

export class AuthUserDto {
  id: string;
  username: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  isActive: boolean;
  role: User['role'];
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.nickname = user.nickname;
    this.avatar = user.avatar;
    this.bio = user.bio;
    this.isActive = user.isActive;
    this.role = user.role;
    this.lastLoginAt = user.lastLoginAt;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
