import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { User } from '@database/entities';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

const extractJwtFromCookie =
  (cookieName: string) =>
  (request: Request | undefined): string | null => {
    const cookieHeader = request?.headers?.cookie;
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (!trimmed.startsWith(`${cookieName}=`)) {
        continue;
      }

      return decodeURIComponent(trimmed.slice(cookieName.length + 1));
    }

    return null;
  };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('jwt.secret');

    if (!secret) {
      throw new Error('JWT_SECRET 未配置');
    }

    const cookieName = configService.get<string>('auth.cookieName', 'blog_auth_token');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractJwtFromCookie(cookieName),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    if (!payload?.sub) {
      throw new UnauthorizedException('登录状态无效，请重新登录');
    }

    return this.authService.getAuthenticatedUser(payload.sub);
  }
}
