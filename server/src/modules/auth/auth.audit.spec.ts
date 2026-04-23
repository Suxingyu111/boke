import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcrypt';
import { User } from '@database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { SecurityAuditService } from '../operation-logs/security-audit.service';
import { AuthService } from './auth.service';

describe('AuthService 安全审计', () => {
  let service: AuthService;
  let queryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let userRepository: {
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
  };
  let verificationCodeRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let securityAuditService: {
    recordBestEffort: jest.Mock;
  };

  beforeEach(() => {
    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };
    userRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
    };
    verificationCodeRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async payload => ({ id: 'verification-1', ...payload })),
      create: jest.fn().mockImplementation(payload => payload),
    };
    securityAuditService = {
      recordBestEffort: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      userRepository as never,
      verificationCodeRepository as never,
      {
        signAsync: jest.fn().mockResolvedValue('jwt-token'),
      } as unknown as JwtService,
      {
        get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
          const values: Record<string, unknown> = {
            'auth.cookieName': 'blog_auth_token',
            'auth.stepUpCookieName': 'blog_admin_step_up',
            'auth.stepUpCookiePath': '/api/admin',
            'auth.stepUpTtl': '10m',
            'jwt.expiresIn': '7d',
            'security.cookieSecure': false,
            'security.cookieSameSite': 'strict',
            'registration.codeCooldownSeconds': 60,
            'registration.codeTtlSeconds': 600,
            'registration.maxVerifyAttempts': 5,
            'registration.exposeDebugCode': true,
            'email.host': '',
            nodeEnv: 'development',
          };

          return key in values ? values[key] : fallback;
        }),
      } as unknown as ConfigService,
      {
        sendNotification: jest.fn(),
      } as unknown as NotificationsService,
      securityAuditService as unknown as SecurityAuditService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('登录失败时应记录脱敏后的账号审计事件', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(
      service.login(
        { account: 'security@example.com', password: 'invalid-password' },
        {
          ip: '203.0.113.1',
          userAgent: 'jest-agent',
          requestMethod: 'POST',
          requestPath: '/api/auth/login',
        },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(securityAuditService.recordBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth.login_failed',
        payload: expect.objectContaining({
          account: 'se******@example.com',
          reason: 'account_not_found',
        }),
      }),
    );
  });

  it('二次认证失败时应触发高优先级告警', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 'admin-1',
      password: hashSync('correct-password', 10),
      isActive: true,
    } as User);

    await expect(
      service.confirmStepUp(
        'admin-1',
        'bad-password',
        'backup',
        {
          ip: '203.0.113.1',
          userAgent: 'jest-agent',
          requestMethod: 'POST',
          requestPath: '/api/auth/step-up',
        },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(securityAuditService.recordBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'auth.step_up_failed',
        alert: true,
        payload: {
          scope: 'backup',
          reason: 'invalid_password',
        },
      }),
    );
  });

  it('开发模式验证码日志不应输出原始联系人和验证码', async () => {
    const loggerSpy = jest
      .spyOn((service as unknown as { logger: { log: (message: string) => void } }).logger, 'log')
      .mockImplementation(() => undefined);
    jest
      .spyOn(
        service as unknown as {
          generateVerificationCode: () => string;
        },
        'generateVerificationCode',
      )
      .mockReturnValue('123456');

    await service.sendRegistrationCode(
      {
        registerType: 'email',
        contact: 'person@example.com',
      },
      {
        ip: '203.0.113.1',
        userAgent: 'jest-agent',
      },
    );

    expect(loggerSpy).toHaveBeenCalledWith('开发模式邮件验证码已生成，目标：pe****@example.com');
    expect(loggerSpy).not.toHaveBeenCalledWith(expect.stringContaining('person@example.com'));
    expect(loggerSpy).not.toHaveBeenCalledWith(expect.stringContaining('123456'));
  });
});
