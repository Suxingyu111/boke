import { ApiProperty } from '@nestjs/swagger';
import { User } from '@database/entities';

export class AuthUserDto {
  @ApiProperty({ example: '0f4c5af2-1111-4444-8888-123456789abc' })
  id: string;
  @ApiProperty({ example: 'author' })
  username: string;
  @ApiProperty({ example: 'author@example.com' })
  email: string;
  @ApiProperty({ example: '博主', nullable: true })
  nickname: string | null;
  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  avatar: string | null;
  @ApiProperty({ example: '持续写作与构建产品。', nullable: true })
  bio: string | null;
  @ApiProperty({ example: true })
  isActive: boolean;
  @ApiProperty({ example: 'author' })
  role: User['role'];
  @ApiProperty({ example: '2026-04-19T10:00:00.000Z', nullable: true })
  lastLoginAt: Date | null;
  @ApiProperty({ example: '2026-04-19T10:00:00.000Z' })
  createdAt: Date;
  @ApiProperty({ example: '2026-04-19T10:00:00.000Z' })
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
