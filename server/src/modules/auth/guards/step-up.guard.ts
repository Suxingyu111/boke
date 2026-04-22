import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { User } from '@database/entities';
import { SecurityAuditService } from '../../operation-logs/security-audit.service';
import { STEP_UP_KEY, StepUpRequirement } from '../decorators/require-step-up.decorator';

interface StepUpTokenPayload {
  purpose: 'step-up';
  sub: string;
  scope: string;
}

type RequestWithUser = {
  method: string;
  originalUrl?: string;
  url: string;
  params?: Record<string, string | undefined>;
  user?: User;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class StepUpGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly securityAuditService: SecurityAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<StepUpRequirement>(STEP_UP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const currentUser = request.user;

    if (!currentUser) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    if (this.hasRecentLogin(currentUser)) {
      return true;
    }

    const token = this.extractCookieValue(request.headers.cookie, this.getStepUpCookieName());
    if (token && (await this.isValidStepUpToken(token, currentUser.id, requirement.scope))) {
      return true;
    }

    await this.securityAuditService.record({
      operatorId: currentUser.id,
      moduleName: this.deriveModuleName(request),
      actionName: `step_up_required:${requirement.scope}`,
      eventType: `auth.step_up_required.${requirement.scope}`,
      severity: 'warning',
      alert: false,
      summary: '高危操作缺少二次认证',
      targetType: requirement.scope,
      targetId: this.deriveTargetId(request.params),
      requestMethod: request.method,
      requestPath: request.originalUrl ?? request.url,
      payload: { stepUpScope: requirement.scope },
      responseCode: HttpStatus.PRECONDITION_REQUIRED,
      ipAddress: request.ip ?? null,
      userAgent: this.normalizeUserAgent(request.headers['user-agent']),
    });

    throw new HttpException(
      '高危操作需要二次认证，请先验证当前密码',
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }

  private hasRecentLogin(user: Pick<User, 'lastLoginAt'>): boolean {
    if (!user.lastLoginAt) {
      return false;
    }

    return Date.now() - user.lastLoginAt.getTime() <= this.getStepUpWindowMs();
  }

  private async isValidStepUpToken(token: string, userId: string, scope: string): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync<StepUpTokenPayload>(token);

      return payload.purpose === 'step-up' && payload.sub === userId && payload.scope === scope;
    } catch {
      return false;
    }
  }

  private extractCookieValue(cookieHeader: string | string[] | undefined, cookieName: string): string | null {
    const rawCookie = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader;
    if (!rawCookie) {
      return null;
    }

    for (const segment of rawCookie.split(';')) {
      const trimmed = segment.trim();
      if (trimmed.startsWith(`${cookieName}=`)) {
        return decodeURIComponent(trimmed.slice(cookieName.length + 1));
      }
    }

    return null;
  }

  private deriveModuleName(request: RequestWithUser): string {
    const requestPath = request.originalUrl ?? request.url;
    const segments = requestPath.split('?')[0].split('/').filter(Boolean);
    return segments[2] ?? 'admin';
  }

  private deriveTargetId(params?: Record<string, string | undefined>): string | null {
    if (!params) {
      return null;
    }

    return params.id ?? params.filename ?? params.tableName ?? null;
  }

  private normalizeUserAgent(userAgent: string | string[] | undefined): string | null {
    if (!userAgent) {
      return null;
    }

    return Array.isArray(userAgent) ? userAgent.join('; ') : userAgent;
  }

  private getStepUpCookieName(): string {
    return this.configService.get<string>('auth.stepUpCookieName', 'blog_admin_step_up');
  }

  private getStepUpWindowMs(): number {
    return this.configService.get<number>('auth.stepUpWindowMs', 10 * 60 * 1000);
  }
}
