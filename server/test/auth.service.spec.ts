import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User, VerificationCode } from '../src/database/entities';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { LoginDto } from '../src/modules/auth/dto/login.dto';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>> & {
    createQueryBuilder: jest.Mock;
  };
  let verificationCodeRepository: jest.Mocked<Repository<VerificationCode>>;
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let notificationsService: { sendNotification: jest.Mock };

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

  const createVerifiedCode = (): VerificationCode => ({
    id: 'verification-1',
    targetType: 'email',
    targetValue: 'new-user@example.com',
    purpose: 'registration',
    codeHash: 'hash',
    sendCount: 1,
    verifyAttempts: 0,
    maxAttempts: 5,
    lastSentAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    verifiedAt: new Date(),
    consumedAt: null,
    requestIp: null,
    userAgent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as typeof userRepository;

    verificationCodeRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as typeof verificationCodeRepository;
    verificationCodeRepository.findOne.mockResolvedValue(createVerifiedCode());
    verificationCodeRepository.save.mockImplementation(async value => value as VerificationCode);

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
      verifyAsync: jest.fn().mockResolvedValue({
        purpose: 'registration-verification',
        verificationId: 'verification-1',
        registerType: 'email',
        contact: 'new-user@example.com',
      }),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'jwt.expiresIn') {
          return '7d';
        }
        if (key === 'registration.verificationTokenTtl') {
          return '30m';
        }

        return defaultValue;
      }),
    };

    notificationsService = {
      sendNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(VerificationCode),
          useValue: verificationCodeRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('注册成功后应返回脱敏用户和访问令牌', async () => {
    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockReturnValue(baseUser);
    userRepository.save.mockResolvedValue(baseUser);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const result = await service.register(registerDto);

    expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: registerDto.username,
        email: 'new-user@example.com',
        nickname: registerDto.nickname,
        password: 'hashed-password',
        role: 'user',
        isActive: true,
      }),
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: baseUser.id,
      username: baseUser.username,
      role: baseUser.role,
    });
    expect(result).toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: '7d',
      user: {
        id: baseUser.id,
        username: baseUser.username,
        email: baseUser.email,
        phone: baseUser.phone,
        nickname: baseUser.nickname,
        avatar: baseUser.avatar,
        bio: baseUser.bio,
        registrationType: baseUser.registrationType,
        emailVerified: true,
        phoneVerified: false,
        isActive: baseUser.isActive,
        role: baseUser.role,
        lastLoginAt: baseUser.lastLoginAt,
        createdAt: baseUser.createdAt,
        updatedAt: baseUser.updatedAt,
      },
    });
  });

  it('注册时邮箱重复应抛出冲突异常', async () => {
    userRepository.findOne.mockResolvedValue(baseUser);

    await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('注册时用户名重复应抛出冲突异常', async () => {
    userRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(baseUser);

    await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('注册时数据库唯一键冲突应抛出冲突异常', async () => {
    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockReturnValue(baseUser);
    userRepository.save.mockRejectedValue({ code: 'ER_DUP_ENTRY' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('登录成功后应更新时间并返回脱敏用户和访问令牌', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(baseUser),
    };
    userRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    userRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login(loginDto);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(user.email) = :email OR user.phone = :phone OR user.username = :account',
      {
        email: loginDto.account.toLowerCase(),
        phone: '__not_a_phone__',
        account: loginDto.account,
      },
    );
    expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, baseUser.password);
    expect(userRepository.update).toHaveBeenCalledWith(
      baseUser.id,
      expect.objectContaining({
        lastLoginAt: expect.any(Date),
      }),
    );
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toEqual(
      expect.objectContaining({
        id: baseUser.id,
        username: baseUser.username,
        email: baseUser.email,
      }),
    );
    expect(result.user).not.toHaveProperty('password');
  });

  it('登录时禁用用户应抛出禁止异常', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        ...baseUser,
        isActive: false,
      }),
    };
    userRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('登录时密码错误应抛出未授权异常', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(baseUser),
    };
    userRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('登录时账号不存在应抛出未授权异常', async () => {
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    userRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.login(loginDto)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('登录时应支持用户名作为账号', async () => {
    const usernameLoginDto: LoginDto = {
      account: baseUser.username,
      password: 'SecurePass123',
    };
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(baseUser),
    };
    userRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    userRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login(usernameLoginDto);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(user.email) = :email OR user.phone = :phone OR user.username = :account',
      {
        email: baseUser.username.toLowerCase(),
        phone: '__not_a_phone__',
        account: baseUser.username,
      },
    );
    expect(result.accessToken).toBe('signed-token');
  });

  it('应返回当前已认证用户', async () => {
    userRepository.findOne.mockResolvedValue(baseUser);

    await expect(service.getAuthenticatedUser(baseUser.id)).resolves.toEqual(baseUser);
  });

  it('当前已认证用户不存在时应抛出未授权异常', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.getAuthenticatedUser(baseUser.id)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('当前已认证用户已禁用时应抛出禁止异常', async () => {
    userRepository.findOne.mockResolvedValue({
      ...baseUser,
      isActive: false,
    });

    await expect(service.getAuthenticatedUser(baseUser.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('应返回 OAuth 提供商启用状态', () => {
    configService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'oauth.github.clientId') return 'github-client-id';
      if (key === 'oauth.github.clientSecret') return 'github-client-secret';
      if (key === 'oauth.github.callbackUrl') return 'http://localhost:3000/api/auth/github/callback';
      if (key === 'oauth.google.clientId') return '';
      if (key === 'oauth.google.clientSecret') return '';
      if (key === 'oauth.google.callbackUrl') return '';
      return defaultValue;
    });

    expect(service.getOAuthProviders()).toEqual({
      github: true,
      google: false,
    });
  });

  it('OAuth 首次登录时应自动创建本地账号', async () => {
    userRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    userRepository.create.mockReturnValue({
      ...baseUser,
      username: 'github_user',
      email: 'oauth-user@example.com',
      oauthProvider: 'github',
      oauthProviderId: 'github-001',
    });
    userRepository.save.mockResolvedValue({
      ...baseUser,
      username: 'github_user',
      email: 'oauth-user@example.com',
      oauthProvider: 'github',
      oauthProviderId: 'github-001',
    });
    userRepository.update.mockResolvedValue({ affected: 1, raw: {}, generatedMaps: [] });
    (bcrypt.hash as jest.Mock).mockResolvedValue('oauth-password-hash');

    const user = await service.resolveOAuthUser('github', {
      providerId: 'github-001',
      email: 'oauth-user@example.com',
      username: 'github_user',
      nickname: 'GitHub 用户',
      avatar: 'https://example.com/avatar.png',
    });

    expect(bcrypt.hash).toHaveBeenCalled();
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'github_user',
        email: 'oauth-user@example.com',
        oauthProvider: 'github',
        oauthProviderId: 'github-001',
      }),
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      baseUser.id,
      expect.objectContaining({
        lastLoginAt: expect.any(Date),
      }),
    );
    expect(user).toEqual(
      expect.objectContaining({
        username: 'github_user',
        email: 'oauth-user@example.com',
      }),
    );
  });

  it('应构造 OAuth 成功与失败跳转地址', () => {
    configService.get.mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'oauth.clientUrl') {
        return 'http://localhost:5173';
      }

      return defaultValue;
    });

    const successUrl = service.buildOAuthSuccessRedirect('/admin');
    const failureUrl = service.buildOAuthFailureRedirect('GitHub OAuth 登录失败', '/profile');

    expect(successUrl).toContain('/oauth/callback?');
    expect(successUrl).not.toContain('token=');
    expect(successUrl).toContain('redirect=%2Fadmin');
    expect(failureUrl).toContain('/login?');
    expect(failureUrl).toContain('oauthError=');
    expect(failureUrl).toContain('redirect=%2Fprofile');
  });
});
