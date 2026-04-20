import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { User } from '../src/database/entities';
import { LoginDto } from '../src/modules/auth/dto/login.dto';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';

describe('AuthController', () => {
  const registerDto: RegisterDto = {
    registerType: 'email',
    verificationToken: 'verified-token',
    username: 'new_user',
    password: 'SecurePass123',
    nickname: '新用户',
  };

  const loginDto: LoginDto = {
    account: 'new-user@example.com',
    password: 'SecurePass123',
  };

  const authResult = {
    accessToken: 'signed-token',
    tokenType: 'Bearer',
    expiresIn: '7d',
    user: {
      id: 'user-id',
      username: 'new_user',
      email: 'new-user@example.com',
      phone: null,
      nickname: '新用户',
      avatar: null,
      bio: null,
      registrationType: 'email',
      emailVerified: true,
      phoneVerified: false,
      isActive: true,
      role: 'user',
      lastLoginAt: null,
      createdAt: new Date('2026-04-15T00:00:00.000Z'),
      updatedAt: new Date('2026-04-15T00:00:00.000Z'),
    },
  };
  const currentUser = {
    ...authResult.user,
    password: 'hashed-password',
    emailVerifiedAt: new Date('2026-04-15T00:00:00.000Z'),
    phoneVerifiedAt: null,
    passwordChangedAt: new Date('2026-04-15T00:00:00.000Z'),
  } as User;

  it('应调用 service.register 完成注册', async () => {
    const service = {
      register: jest.fn().mockResolvedValue(authResult),
      login: jest.fn(),
    } as unknown as AuthService;

    const controller = new AuthController(service);

    await expect(controller.register(registerDto)).resolves.toEqual(authResult);
  });

  it('应调用 service.login 完成登录', async () => {
    const service = {
      register: jest.fn(),
      login: jest.fn().mockResolvedValue(authResult),
    } as unknown as AuthService;

    const controller = new AuthController(service);

    await expect(controller.login(loginDto)).resolves.toEqual(authResult);
  });

  it('应返回当前登录用户信息', () => {
    const service = {
      register: jest.fn(),
      login: jest.fn(),
    } as unknown as AuthService;

    const controller = new AuthController(service);

    expect(controller.getMe(currentUser)).toEqual(authResult.user);
  });

  it('应返回后台登录用户信息', () => {
    const service = {
      register: jest.fn(),
      login: jest.fn(),
    } as unknown as AuthService;

    const controller = new AuthController(service);

    expect(controller.getAdminMe(currentUser)).toEqual(authResult.user);
  });

  it('应返回 OAuth 提供商可用状态', () => {
    const service = {
      register: jest.fn(),
      login: jest.fn(),
      getOAuthProviders: jest.fn().mockReturnValue({
        github: true,
        google: false,
      }),
    } as unknown as AuthService;

    const controller = new AuthController(service);

    expect(controller.getOAuthProviders()).toEqual({
      github: true,
      google: false,
    });
  });
});
