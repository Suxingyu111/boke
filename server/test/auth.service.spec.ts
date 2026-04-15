import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../src/database/entities';
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
  let jwtService: { signAsync: jest.Mock };
  let configService: { get: jest.Mock };

  const registerDto: RegisterDto = {
    username: 'new_user',
    email: 'new-user@example.com',
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

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as typeof userRepository;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'jwt.expiresIn') {
          return '7d';
        }

        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
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
        email: registerDto.email,
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
        nickname: baseUser.nickname,
        avatar: baseUser.avatar,
        bio: baseUser.bio,
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
    userRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(baseUser);

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
      'LOWER(user.email) = :email OR user.username = :account',
      { email: loginDto.account.toLowerCase(), account: loginDto.account },
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
      'LOWER(user.email) = :email OR user.username = :account',
      { email: baseUser.username.toLowerCase(), account: baseUser.username },
    );
    expect(result.accessToken).toBe('signed-token');
  });

  it('应返回当前已认证用户', async () => {
    userRepository.findOne.mockResolvedValue(baseUser);

    await expect(service.getAuthenticatedUser(baseUser.id)).resolves.toEqual(baseUser);
  });

  it('当前已认证用户不存在时应抛出未授权异常', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.getAuthenticatedUser(baseUser.id)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('当前已认证用户已禁用时应抛出禁止异常', async () => {
    userRepository.findOne.mockResolvedValue({
      ...baseUser,
      isActive: false,
    });

    await expect(service.getAuthenticatedUser(baseUser.id)).rejects.toBeInstanceOf(ForbiddenException);
  });
});