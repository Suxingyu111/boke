import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { User } from '@database/entities';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('oauth.github.clientId', 'disabled'),
      clientSecret: configService.get<string>('oauth.github.clientSecret', 'disabled'),
      callbackURL:
        configService.get<string>('oauth.github.callbackUrl') || 'http://localhost/oauth/github-disabled',
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<User> {
    const primaryEmail = profile.emails?.[0]?.value ?? null;

    return this.authService.resolveOAuthUser('github', {
      providerId: profile.id,
      email: primaryEmail,
      username: profile.username ?? null,
      nickname: profile.displayName ?? profile.username ?? null,
      avatar: profile.photos?.[0]?.value ?? null,
    });
  }
}
