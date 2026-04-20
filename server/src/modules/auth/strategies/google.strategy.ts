import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { User } from '@database/entities';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientId =
      configService.get<string>('oauth.google.clientId') || 'disabled';
    const clientSecret =
      configService.get<string>('oauth.google.clientSecret') || 'disabled';
    const callbackUrl =
      configService.get<string>('oauth.google.callbackUrl') ||
      'http://localhost/oauth/google-disabled';

    super({
      clientID: clientId,
      clientSecret,
      callbackURL: callbackUrl,
      scope: ['profile', 'email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<User> {
    return this.authService.resolveOAuthUser('google', {
      providerId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      username: profile.displayName?.trim() || profile.name?.givenName || null,
      nickname: profile.displayName?.trim() || null,
      avatar: profile.photos?.[0]?.value ?? null,
    });
  }
}
