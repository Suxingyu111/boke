import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../src/database/entities';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';

describe('RolesGuard', () => {
  const createContext = (user?: User): ExecutionContext =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  const baseUser: User = {
    id: 'user-id',
    username: 'new_user',
    email: 'new-user@example.com',
    phone: null,
    password: 'hashed-password',
    nickname: '新用户',
    registrationType: 'email',
    emailVerifiedAt: new Date('2026-04-15T00:00:00.000Z'),
    phoneVerifiedAt: null,
    avatar: null,
    bio: null,
    isActive: true,
    role: 'user',
    lastLoginAt: null,
    passwordChangedAt: new Date('2026-04-15T00:00:00.000Z'),
    createdAt: new Date('2026-04-15T00:00:00.000Z'),
    updatedAt: new Date('2026-04-15T00:00:00.000Z'),
  };

  it('路由未声明角色时应直接放行', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('admin 角色应允许访问 admin 路由', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(
      guard.canActivate(
        createContext({
          ...baseUser,
          role: 'admin',
        }),
      ),
    ).toBe(true);
  });

  it('super_admin 角色应允许访问 admin 路由', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(
      guard.canActivate(
        createContext({
          ...baseUser,
          role: 'super_admin',
        }),
      ),
    ).toBe(true);
  });

  it('普通用户访问 admin 路由时应抛出禁止异常', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext(baseUser))).toThrow('无权访问后台资源');
  });

  it('请求中不存在用户信息时应抛出未授权异常', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(createContext())).toThrow(UnauthorizedException);
  });
});
