import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../src/database/entities';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';

describe('JwtStrategy', () => {
  const baseUser: User = {
    id: 'user-id',
    username: 'new_user',
    email: 'new-user@example.com',
    password: 'hashed-password',
    nickname: '新用户',
    avatar: null,
    bio: null,
    isActive: true,
    role: 'user',
    lastLoginAt: null,
    createdAt: new Date('2026-04-15T00:00:00.000Z'),
    updatedAt: new Date('2026-04-15T00:00:00.000Z'),
  };

  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'jwt.secret') {
        return 'test-secret';
      }

      return undefined;
    }),
  } as unknown as ConfigService;

  it('应根据有效 payload 返回用户信息', async () => {
    const authService = {
      getAuthenticatedUser: jest.fn().mockResolvedValue(baseUser),
    } as unknown as AuthService;

    const strategy = new JwtStrategy(configService, authService);

    await expect(
      strategy.validate({ sub: baseUser.id, username: baseUser.username, role: baseUser.role }),
    ).resolves.toEqual(baseUser);
  });

  it('payload 缺少 sub 时应抛出未授权异常', async () => {
    const authService = {
      getAuthenticatedUser: jest.fn(),
    } as unknown as AuthService;

    const strategy = new JwtStrategy(configService, authService);

    await expect(
      strategy.validate({ sub: '', username: baseUser.username, role: baseUser.role }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('用户不存在时应透传未授权异常', async () => {
    const authService = {
      getAuthenticatedUser: jest.fn().mockRejectedValue(new UnauthorizedException()),
    } as unknown as AuthService;

    const strategy = new JwtStrategy(configService, authService);

    await expect(
      strategy.validate({ sub: baseUser.id, username: baseUser.username, role: baseUser.role }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('用户被禁用时应透传禁止异常', async () => {
    const authService = {
      getAuthenticatedUser: jest.fn().mockRejectedValue(new ForbiddenException()),
    } as unknown as AuthService;

    const strategy = new JwtStrategy(configService, authService);

    await expect(
      strategy.validate({ sub: baseUser.id, username: baseUser.username, role: baseUser.role }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});