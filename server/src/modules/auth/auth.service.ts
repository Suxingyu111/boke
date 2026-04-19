import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '@database/entities';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthUserDto } from './dto/auth-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const PASSWORD_SALT_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = '账号或密码错误';
const USER_DISABLED_MESSAGE = '账号已被禁用';
const USER_EXISTS_MESSAGE = '注册失败，请更换注册信息后重试';
const INVALID_TOKEN_MESSAGE = '登录状态无效，请重新登录';
const OAUTH_PROVIDERS = ['github', 'google'] as const;

type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

interface OAuthProfilePayload {
  providerId: string;
  email?: string | null;
  username?: string | null;
  nickname?: string | null;
  avatar?: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedUsername = dto.username.trim();
    await this.ensureUserDoesNotExist(normalizedEmail, normalizedUsername);

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = this.userRepository.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: passwordHash,
      nickname: dto.nickname?.trim() ?? null,
      role: 'user',
      isActive: true,
    });

    let savedUser: User;
    try {
      savedUser = await this.userRepository.save(user);
    } catch (error) {
      if (this.isDuplicateEntryError(error)) {
        throw new ConflictException(USER_EXISTS_MESSAGE);
      }

      throw error;
    }

    return this.buildAuthResponse(savedUser);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const account = dto.account.trim();
    const normalizedEmail = account.toLowerCase();
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :email OR user.username = :account', {
        email: normalizedEmail,
        account,
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    if (!user.isActive) {
      throw new ForbiddenException(USER_DISABLED_MESSAGE);
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const lastLoginAt = new Date();
    const updateResult = await this.userRepository.update(user.id, { lastLoginAt });
    if (updateResult.affected && updateResult.affected > 0) {
      user.lastLoginAt = lastLoginAt;
    }

    return this.buildAuthResponse(user);
  }

  async getAuthenticatedUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    if (!user.isActive) {
      throw new ForbiddenException(USER_DISABLED_MESSAGE);
    }

    return user;
  }

  getOAuthProviders() {
    return {
      github: this.isOAuthEnabled('github'),
      google: this.isOAuthEnabled('google'),
    };
  }

  isOAuthEnabled(provider: OAuthProvider): boolean {
    const clientId = this.configService.get<string>(`oauth.${provider}.clientId`, '');
    const clientSecret = this.configService.get<string>(`oauth.${provider}.clientSecret`, '');
    const callbackUrl = this.configService.get<string>(`oauth.${provider}.callbackUrl`, '');

    return Boolean(clientId && clientSecret && callbackUrl);
  }

  async resolveOAuthUser(
    provider: OAuthProvider,
    payload: OAuthProfilePayload,
  ): Promise<User> {
    const normalizedProviderId = payload.providerId.trim();
    const normalizedEmail = this.normalizeOAuthEmail(provider, normalizedProviderId, payload.email);

    let user =
      (await this.userRepository.findOne({
        where: {
          oauthProvider: provider,
          oauthProviderId: normalizedProviderId,
        },
      })) ?? (await this.userRepository.findOne({ where: { email: normalizedEmail } }));

    if (!user) {
      user = await this.createOAuthUser(provider, normalizedProviderId, normalizedEmail, payload);
    } else {
      user = await this.syncOAuthUser(user, provider, normalizedProviderId, payload);
    }

    if (!user.isActive) {
      throw new ForbiddenException(USER_DISABLED_MESSAGE);
    }

    const lastLoginAt = new Date();
    const updatePayload: Partial<User> = {
      lastLoginAt,
      oauthProvider: user.oauthProvider ?? provider,
      oauthProviderId: user.oauthProviderId ?? normalizedProviderId,
    };

    if (!user.avatar && payload.avatar) {
      updatePayload.avatar = payload.avatar;
    }

    if (!user.nickname && payload.nickname) {
      updatePayload.nickname = payload.nickname;
    }

    const updateResult = await this.userRepository.update(user.id, updatePayload);
    if (updateResult.affected && updateResult.affected > 0) {
      Object.assign(user, updatePayload);
    }

    return user;
  }

  async buildOAuthAuthResponse(user: User): Promise<AuthResponseDto> {
    return this.buildAuthResponse(user);
  }

  buildOAuthSuccessRedirect(
    auth: AuthResponseDto,
    redirectPath?: string,
  ): string {
    const clientUrl = this.configService.get<string>('oauth.clientUrl', 'http://localhost:5173');
    const target = new URL('/oauth/callback', this.ensureTrailingSlash(clientUrl));
    target.searchParams.set('token', auth.accessToken);

    const safeRedirect = this.normalizeRedirectPath(redirectPath);
    if (safeRedirect) {
      target.searchParams.set('redirect', safeRedirect);
    }

    return target.toString();
  }

  buildOAuthFailureRedirect(message: string, redirectPath?: string): string {
    const clientUrl = this.configService.get<string>('oauth.clientUrl', 'http://localhost:5173');
    const target = new URL('/login', this.ensureTrailingSlash(clientUrl));
    target.searchParams.set('oauthError', message);

    const safeRedirect = this.normalizeRedirectPath(redirectPath);
    if (safeRedirect) {
      target.searchParams.set('redirect', safeRedirect);
    }

    return target.toString();
  }

  private async ensureUserDoesNotExist(email: string, username: string): Promise<void> {
    const [existingEmailUser, existingUsernameUser] = await Promise.all([
      this.userRepository.findOne({ where: { email } }),
      this.userRepository.findOne({ where: { username } }),
    ]);

    if (existingEmailUser) {
      throw new ConflictException(USER_EXISTS_MESSAGE);
    }

    if (existingUsernameUser) {
      throw new ConflictException(USER_EXISTS_MESSAGE);
    }
  }

  private async createOAuthUser(
    provider: OAuthProvider,
    providerId: string,
    email: string,
    payload: OAuthProfilePayload,
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(
      `${provider}:${providerId}:${Date.now().toString(36)}`,
      PASSWORD_SALT_ROUNDS,
    );
    const username = await this.generateUniqueUsername(
      payload.username ?? payload.nickname ?? email.split('@')[0] ?? provider,
    );
    const user = this.userRepository.create({
      username,
      email,
      password: passwordHash,
      nickname: payload.nickname?.trim() || payload.username?.trim() || null,
      avatar: payload.avatar?.trim() || null,
      bio: null,
      oauthProvider: provider,
      oauthProviderId: providerId,
      role: 'user',
      isActive: true,
      lastLoginAt: null,
    });

    return this.userRepository.save(user);
  }

  private async syncOAuthUser(
    user: User,
    provider: OAuthProvider,
    providerId: string,
    payload: OAuthProfilePayload,
  ): Promise<User> {
    const nextUser: User = {
      ...user,
      oauthProvider: user.oauthProvider ?? provider,
      oauthProviderId: user.oauthProviderId ?? providerId,
      nickname: user.nickname ?? payload.nickname?.trim() ?? payload.username?.trim() ?? null,
      avatar: user.avatar ?? payload.avatar?.trim() ?? null,
    };

    if (
      nextUser.oauthProvider === user.oauthProvider &&
      nextUser.oauthProviderId === user.oauthProviderId &&
      nextUser.nickname === user.nickname &&
      nextUser.avatar === user.avatar
    ) {
      return user;
    }

    return this.userRepository.save(nextUser);
  }

  private normalizeOAuthEmail(
    provider: OAuthProvider,
    providerId: string,
    email?: string | null,
  ): string {
    const normalized = email?.trim().toLowerCase();
    if (normalized) {
      return normalized;
    }

    return `${provider}-${providerId}@oauth.local`;
  }

  private async generateUniqueUsername(value: string): Promise<string> {
    const base =
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 30) || 'oauth_user';

    let candidate = base;
    let index = 2;

    while (await this.userRepository.findOne({ where: { username: candidate } })) {
      candidate = `${base}_${index}`.slice(0, 50);
      index += 1;
    }

    return candidate;
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return new AuthResponseDto({
      accessToken,
      expiresIn: this.configService.get<string>('jwt.expiresIn', '7d'),
      user: new AuthUserDto(user),
    });
  }

  private isDuplicateEntryError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_DUP_ENTRY'
    );
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }

  private normalizeRedirectPath(value?: string): string | undefined {
    if (!value || typeof value !== 'string') {
      return undefined;
    }

    if (!value.startsWith('/')) {
      return undefined;
    }

    if (value.startsWith('//')) {
      return undefined;
    }

    return value;
  }
}
