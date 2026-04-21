import { HttpException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { User } from '@database/entities';
import { OperationLogsService } from '../../operation-logs/operation-logs.service';
import { StepUpGuard } from './step-up.guard';

const now = new Date('2026-04-21T23:20:00.000Z');

describe('StepUpGuard', () => {
  let guard: StepUpGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let operationLogsService: { record: jest.Mock };

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 'admin-1',
      username: 'admin',
      email: 'admin@example.com',
      phone: null,
      password: '',
      nickname: '管理员',
      registrationType: 'email',
      emailVerifiedAt: now,
      phoneVerifiedAt: null,
      avatar: null,
      bio: null,
      oauthProvider: null,
      oauthProviderId: null,
      isActive: true,
      role: 'admin',
      lastLoginAt: null,
      passwordChangedAt: now,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }) as User;

  const buildExecutionContext = (user?: User, cookie?: string) =>
    ({
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          originalUrl: '/api/admin/backup',
          url: '/api/admin/backup',
          params: {},
          user,
          ip: '203.0.113.10',
          headers: {
            cookie,
            'user-agent': 'jest-agent',
          },
        }),
      }),
    }) as never;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    jwtService = {
      verifyAsync: jest.fn(),
    };
    operationLogsService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    guard = new StepUpGuard(
      reflector as unknown as Reflector,
      {
        get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
          const values: Record<string, unknown> = {
            'auth.stepUpCookieName': 'blog_admin_step_up',
            'auth.stepUpWindowMs': 10 * 60 * 1000,
          };
          return key in values ? values[key] : fallback;
        }),
      } as unknown as ConfigService,
      jwtService as unknown as JwtService,
      operationLogsService as unknown as OperationLogsService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('未声明 step-up 要求时应直接放行', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(buildExecutionContext(buildUser()))).resolves.toBe(true);
  });

  it('近期登录用户应直接放行', async () => {
    reflector.getAllAndOverride.mockReturnValue({ scope: 'backup' });

    await expect(
      guard.canActivate(
        buildExecutionContext(
          buildUser({
            lastLoginAt: new Date('2026-04-21T23:15:30.000Z'),
          }),
        ),
      ),
    ).resolves.toBe(true);
  });

  it('携带有效 step-up Cookie 时应放行', async () => {
    reflector.getAllAndOverride.mockReturnValue({ scope: 'backup' });
    jwtService.verifyAsync.mockResolvedValue({
      purpose: 'step-up',
      sub: 'admin-1',
      scope: 'backup',
    });

    await expect(
      guard.canActivate(
        buildExecutionContext(
          buildUser({
            lastLoginAt: new Date('2026-04-21T22:00:00.000Z'),
          }),
          'blog_admin_step_up=valid-token',
        ),
      ),
    ).resolves.toBe(true);
  });

  it('未完成 step-up 时应拒绝并记录审计日志', async () => {
    reflector.getAllAndOverride.mockReturnValue({ scope: 'backup' });

    await expect(
      guard.canActivate(
        buildExecutionContext(
          buildUser({
            lastLoginAt: new Date('2026-04-21T22:00:00.000Z'),
          }),
        ),
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(operationLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleName: 'backup',
        actionName: 'step_up_required:backup',
        responseCode: 428,
      }),
    );
  });

  it('未登录时应拒绝访问', async () => {
    reflector.getAllAndOverride.mockReturnValue({ scope: 'backup' });

    await expect(guard.canActivate(buildExecutionContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
