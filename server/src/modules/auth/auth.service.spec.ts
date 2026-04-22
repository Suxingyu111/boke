import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User, VerificationCode } from '@database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { SecurityAuditService } from '../operation-logs/security-audit.service';
import { AuthService } from './auth.service';

describe('AuthService OAuth 安全行为', () => {
  let service: AuthService;
  let configValues: Record<string, string | boolean>;

  beforeEach(async () => {
    configValues = {
      'oauth.clientUrl': 'https://client.example.com',
      'auth.cookieName': 'blog_auth_token',
      'auth.stepUpCookieName': 'blog_admin_step_up',
      'auth.stepUpCookiePath': '/api/admin',
      'auth.stepUpTtl': '10m',
      'jwt.expiresIn': '7d',
      'security.cookieSecure': true,
      'security.cookieSameSite': 'strict',
      nodeEnv: 'production',
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(VerificationCode),
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, fallback?: string) =>
              key in configValues ? configValues[key] : fallback,
            ),
          },
        },
        {
          provide: NotificationsService,
          useValue: {},
        },
        {
          provide: SecurityAuditService,
          useValue: {
            recordBestEffort: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('OAuth 成功回跳地址不应包含 token 查询参数', () => {
    const redirect = service.buildOAuthSuccessRedirect('/admin/articles');
    const target = new URL(redirect);

    expect(target.origin).toBe('https://client.example.com');
    expect(target.pathname).toBe('/oauth/callback');
    expect(target.searchParams.get('token')).toBeNull();
    expect(target.searchParams.get('redirect')).toBe('/admin/articles');
  });

  it('应写入 HttpOnly 鉴权 Cookie 与 step-up Cookie，并支持统一清除', () => {
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    service.writeAuthCookie(response, 'oauth-access-token');
    service.writeStepUpCookie(response, 'step-up-token');
    service.clearAuthCookie(response);

    expect(response.cookie).toHaveBeenCalledWith(
      'blog_auth_token',
      'oauth-access-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'blog_auth_token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'blog_admin_step_up',
      'step-up-token',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/api/admin',
      }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'blog_admin_step_up',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/api/admin',
      }),
    );
  });
});
