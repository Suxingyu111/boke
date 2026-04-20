import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import type { StringValue } from 'ms';
import { Repository } from 'typeorm';
import { User, VerificationCode } from '@database/entities';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { AuthUserDto } from './dto/auth-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterAvailabilityDto } from './dto/register-availability.dto';
import { RegisterDto } from './dto/register.dto';
import { RegistrationAvailabilityResponseDto } from './dto/registration-availability-response.dto';
import { RegistrationCodeSentDto } from './dto/registration-code-sent.dto';
import { RegistrationVerificationResponseDto } from './dto/registration-verification-response.dto';
import { SendRegistrationCodeDto } from './dto/send-registration-code.dto';
import { VerifyRegistrationCodeDto } from './dto/verify-registration-code.dto';

const PASSWORD_SALT_ROUNDS = 10;
const INVALID_CREDENTIALS_MESSAGE = '账号或密码错误';
const USER_DISABLED_MESSAGE = '账号已被禁用';
const INVALID_TOKEN_MESSAGE = '登录状态无效，请重新登录';
const REGISTRATION_TOKEN_PURPOSE = 'registration-verification';
const OAUTH_PROVIDERS = ['github', 'google'] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
type RegisterType = 'email' | 'phone';

interface OAuthProfilePayload {
  providerId: string;
  email?: string | null;
  username?: string | null;
  nickname?: string | null;
  avatar?: string | null;
}

interface RequestMetadata {
  ip: string | null;
  userAgent: string | null;
}

interface RegistrationVerificationTokenPayload {
  purpose: typeof REGISTRATION_TOKEN_PURPOSE;
  verificationId: string;
  registerType: RegisterType;
  contact: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(VerificationCode)
    private readonly verificationCodeRepository: Repository<VerificationCode>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async checkRegistrationAvailability(
    dto: RegisterAvailabilityDto,
  ): Promise<RegistrationAvailabilityResponseDto> {
    const hasAnyField = Boolean(dto.contact || dto.username || dto.nickname);
    if (!hasAnyField) {
      throw new BadRequestException('至少需要提供一个待检查字段');
    }

    const result: RegistrationAvailabilityResponseDto = {};

    if (dto.contact) {
      if (!dto.registerType) {
        throw new BadRequestException('检查联系地址时必须提供注册方式');
      }

      const normalizedContact = this.normalizeContact(dto.registerType, dto.contact);
      result.contact = {
        available: !(await this.findUserByRegisterType(dto.registerType, normalizedContact)),
        message: null,
        normalizedValue: normalizedContact,
      };

      result.contact.message = result.contact.available
        ? `${dto.registerType === 'email' ? '邮箱' : '手机号'}可用`
        : `${dto.registerType === 'email' ? '邮箱' : '手机号'}已存在`;
    }

    if (dto.username) {
      const normalizedUsername = dto.username.trim();
      const existing = await this.userRepository.findOne({ where: { username: normalizedUsername } });
      result.username = {
        available: !existing,
        message: existing ? '用户名已存在，请重新填写' : '用户名可用',
        normalizedValue: normalizedUsername,
      };
    }

    if (dto.nickname) {
      const normalizedNickname = dto.nickname.trim();
      const existing = await this.userRepository.findOne({ where: { nickname: normalizedNickname } });
      result.nickname = {
        available: !existing,
        message: existing ? '昵称已存在，请重新填写' : '昵称可用',
        normalizedValue: normalizedNickname,
      };
    }

    return result;
  }

  async sendRegistrationCode(
    dto: SendRegistrationCodeDto,
    metadata: RequestMetadata,
  ): Promise<RegistrationCodeSentDto> {
    const registerType = dto.registerType;
    const contact = this.normalizeContact(registerType, dto.contact);
    const now = new Date();
    const cooldownSeconds = this.configService.get<number>('registration.codeCooldownSeconds', 60);
    const expiresInSeconds = this.configService.get<number>('registration.codeTtlSeconds', 600);
    const maxAttempts = this.configService.get<number>('registration.maxVerifyAttempts', 5);
    const latest = await this.findLatestVerification(registerType, contact);

    if (
      latest &&
      !latest.consumedAt &&
      latest.expiresAt > now &&
      latest.lastSentAt.getTime() + cooldownSeconds * 1000 > now.getTime()
    ) {
      throw new HttpException(
        `验证码发送过于频繁，请 ${cooldownSeconds} 秒后再试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (latest && !latest.consumedAt && !latest.verifiedAt) {
      latest.consumedAt = now;
      await this.verificationCodeRepository.save(latest);
    }

    const code = this.generateVerificationCode();
    const verification = this.verificationCodeRepository.create({
      targetType: registerType,
      targetValue: contact,
      purpose: 'registration',
      codeHash: this.hashValue(code),
      sendCount: 1,
      verifyAttempts: 0,
      maxAttempts,
      lastSentAt: now,
      expiresAt: new Date(now.getTime() + expiresInSeconds * 1000),
      verifiedAt: null,
      consumedAt: null,
      requestIp: metadata.ip?.slice(0, 45) ?? null,
      userAgent: metadata.userAgent?.slice(0, 500) ?? null,
    });

    const saved = await this.verificationCodeRepository.save(verification);

    try {
      await this.dispatchRegistrationCode(registerType, contact, code);
    } catch (error) {
      saved.consumedAt = new Date();
      await this.verificationCodeRepository.save(saved);
      throw error;
    }

    return {
      registerType,
      maskedContact: this.maskContact(registerType, contact),
      expiresInSeconds,
      cooldownSeconds,
      debugCode: this.shouldExposeDebugCode() ? code : null,
    };
  }

  async verifyRegistrationCode(
    dto: VerifyRegistrationCodeDto,
  ): Promise<RegistrationVerificationResponseDto> {
    const registerType = dto.registerType;
    const contact = this.normalizeContact(registerType, dto.contact);
    const latest = await this.findLatestVerification(registerType, contact);

    if (!latest || latest.consumedAt || latest.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('验证码已失效，请重新获取');
    }

    if (!latest.verifiedAt) {
      const codeHash = this.hashValue(dto.code.trim());
      const isValid = this.compareHash(codeHash, latest.codeHash);
      if (!isValid) {
        latest.verifyAttempts += 1;
        if (latest.verifyAttempts >= latest.maxAttempts) {
          latest.consumedAt = new Date();
        }
        await this.verificationCodeRepository.save(latest);
        throw new BadRequestException('验证码错误，请重新输入');
      }

      latest.verifiedAt = new Date();
      await this.verificationCodeRepository.save(latest);
    }

    await this.ensureContactNotRegistered(registerType, contact, latest);

    const expiresIn = this.configService.get<string>('registration.verificationTokenTtl', '30m');
    const verificationToken = await this.jwtService.signAsync(
      {
        purpose: REGISTRATION_TOKEN_PURPOSE,
        verificationId: latest.id,
        registerType,
        contact,
      },
      {
        expiresIn: expiresIn as StringValue,
      },
    );

    return {
      registerType,
      maskedContact: this.maskContact(registerType, contact),
      verificationToken,
      expiresIn,
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const normalizedUsername = dto.username.trim();
    const normalizedNickname = dto.nickname?.trim() || null;
    const verification = await this.resolveValidRegistrationVerification(dto);

    await this.ensureUniqueProfile(normalizedUsername, normalizedNickname);

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const now = new Date();
    const user = this.userRepository.create({
      username: normalizedUsername,
      email: dto.registerType === 'email' ? verification.targetValue : null,
      phone: dto.registerType === 'phone' ? verification.targetValue : null,
      password: passwordHash,
      nickname: normalizedNickname,
      registrationType: dto.registerType,
      emailVerifiedAt: dto.registerType === 'email' ? verification.verifiedAt ?? now : null,
      phoneVerifiedAt: dto.registerType === 'phone' ? verification.verifiedAt ?? now : null,
      avatar: null,
      bio: null,
      role: 'user',
      isActive: true,
      lastLoginAt: null,
      passwordChangedAt: now,
    });

    let savedUser: User;
    try {
      savedUser = await this.userRepository.save(user);
    } catch (error) {
      if (this.isDuplicateEntryError(error)) {
        throw await this.buildDuplicateRegistrationException(dto.registerType, verification.targetValue, normalizedUsername, normalizedNickname);
      }

      throw error;
    }

    verification.consumedAt = new Date();
    await this.verificationCodeRepository.save(verification);

    return this.buildAuthResponse(savedUser);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const account = dto.account.trim();
    const normalizedEmail = account.toLowerCase();
    const normalizedPhone = this.tryNormalizePhone(account) ?? '__not_a_phone__';
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = :email OR user.phone = :phone OR user.username = :account', {
        email: normalizedEmail,
        phone: normalizedPhone,
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
      })) ?? (normalizedEmail
        ? await this.userRepository.findOne({ where: { email: normalizedEmail } })
        : null);

    if (!user) {
      user = await this.createOAuthUser(provider, normalizedProviderId, normalizedEmail, payload);
    } else {
      user = await this.syncOAuthUser(user, provider, normalizedProviderId, normalizedEmail, payload);
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
      updatePayload.nickname = await this.resolveAvailableNickname(payload.nickname);
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

  private async resolveValidRegistrationVerification(dto: RegisterDto): Promise<VerificationCode> {
    const payload = await this.verifyRegistrationToken(dto.verificationToken);
    if (
      payload.purpose !== REGISTRATION_TOKEN_PURPOSE ||
      payload.registerType !== dto.registerType
    ) {
      throw new BadRequestException('注册验证已失效，请重新验证联系人');
    }

    const verification = await this.verificationCodeRepository.findOne({
      where: { id: payload.verificationId },
    });

    if (!verification || verification.consumedAt) {
      throw new BadRequestException('注册验证已失效，请重新验证联系人');
    }

    if (verification.targetType !== dto.registerType || verification.targetValue !== payload.contact) {
      throw new BadRequestException('注册验证与当前注册方式不匹配');
    }

    if (!verification.verifiedAt || verification.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('注册验证已失效，请重新验证联系人');
    }

    await this.ensureContactNotRegistered(dto.registerType, verification.targetValue, verification);
    return verification;
  }

  private async verifyRegistrationToken(token: string): Promise<RegistrationVerificationTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RegistrationVerificationTokenPayload>(token);
    } catch {
      throw new BadRequestException('注册验证已失效，请重新验证联系人');
    }
  }

  private async findLatestVerification(
    registerType: RegisterType,
    contact: string,
  ): Promise<VerificationCode | null> {
    return this.verificationCodeRepository.findOne({
      where: {
        targetType: registerType,
        targetValue: contact,
        purpose: 'registration',
      },
      order: { createdAt: 'DESC' },
    });
  }

  private async ensureContactNotRegistered(
    registerType: RegisterType,
    contact: string,
    verification?: VerificationCode,
  ): Promise<void> {
    const existing = await this.findUserByRegisterType(registerType, contact);
    if (!existing) {
      return;
    }

    if (verification) {
      verification.consumedAt = new Date();
      await this.verificationCodeRepository.save(verification);
    }

    throw new ConflictException(
      registerType === 'email' ? '该邮箱已注册，请直接登录' : '该手机号已注册，请直接登录',
    );
  }

  private async ensureUniqueProfile(username: string, nickname: string | null): Promise<void> {
    const [existingUsername, existingNickname] = await Promise.all([
      this.userRepository.findOne({ where: { username } }),
      nickname ? this.userRepository.findOne({ where: { nickname } }) : Promise.resolve(null),
    ]);

    if (existingUsername) {
      throw new ConflictException('用户名已存在，请重新填写');
    }

    if (existingNickname) {
      throw new ConflictException('昵称已存在，请重新填写');
    }
  }

  private async buildDuplicateRegistrationException(
    registerType: RegisterType,
    contact: string,
    username: string,
    nickname: string | null,
  ): Promise<ConflictException> {
    if (await this.findUserByRegisterType(registerType, contact)) {
      return new ConflictException(
        registerType === 'email' ? '该邮箱已注册，请直接登录' : '该手机号已注册，请直接登录',
      );
    }

    if (await this.userRepository.findOne({ where: { username } })) {
      return new ConflictException('用户名已存在，请重新填写');
    }

    if (nickname && (await this.userRepository.findOne({ where: { nickname } }))) {
      return new ConflictException('昵称已存在，请重新填写');
    }

    return new ConflictException('注册失败，请更换注册信息后重试');
  }

  private async findUserByRegisterType(
    registerType: RegisterType,
    contact: string,
  ): Promise<User | null> {
    if (registerType === 'email') {
      return this.userRepository.findOne({ where: { email: contact } });
    }

    return this.userRepository.findOne({ where: { phone: contact } });
  }

  private async createOAuthUser(
    provider: OAuthProvider,
    providerId: string,
    email: string | null,
    payload: OAuthProfilePayload,
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(
      `${provider}:${providerId}:${Date.now().toString(36)}`,
      PASSWORD_SALT_ROUNDS,
    );
    const username = await this.generateUniqueUsername(
      payload.username ?? payload.nickname ?? email?.split('@')[0] ?? provider,
    );
    const nickname = payload.nickname?.trim()
      ? await this.resolveAvailableNickname(payload.nickname)
      : payload.username?.trim() || null;
    const user = this.userRepository.create({
      username,
      email,
      phone: null,
      password: passwordHash,
      nickname,
      registrationType: 'oauth',
      emailVerifiedAt: email && !email.endsWith('@oauth.local') ? new Date() : null,
      phoneVerifiedAt: null,
      avatar: payload.avatar?.trim() || null,
      bio: null,
      oauthProvider: provider,
      oauthProviderId: providerId,
      role: 'user',
      isActive: true,
      lastLoginAt: null,
      passwordChangedAt: new Date(),
    });

    return this.userRepository.save(user);
  }

  private async syncOAuthUser(
    user: User,
    provider: OAuthProvider,
    providerId: string,
    email: string | null,
    payload: OAuthProfilePayload,
  ): Promise<User> {
    const candidateNickname = payload.nickname?.trim() ?? payload.username?.trim() ?? null;
    const resolvedNickname =
      user.nickname ??
      (candidateNickname ? await this.resolveAvailableNickname(candidateNickname) : null);
    const nextUser: User = {
      ...user,
      email: user.email ?? email,
      registrationType: user.registrationType ?? 'oauth',
      oauthProvider: user.oauthProvider ?? provider,
      oauthProviderId: user.oauthProviderId ?? providerId,
      nickname: resolvedNickname,
      avatar: user.avatar ?? payload.avatar?.trim() ?? null,
      emailVerifiedAt:
        user.emailVerifiedAt ?? (email && !email.endsWith('@oauth.local') ? new Date() : null),
    };

    if (
      nextUser.email === user.email &&
      nextUser.oauthProvider === user.oauthProvider &&
      nextUser.oauthProviderId === user.oauthProviderId &&
      nextUser.nickname === user.nickname &&
      nextUser.avatar === user.avatar &&
      nextUser.emailVerifiedAt === user.emailVerifiedAt
    ) {
      return user;
    }

    return this.userRepository.save(nextUser);
  }

  private normalizeOAuthEmail(
    provider: OAuthProvider,
    providerId: string,
    email?: string | null,
  ): string | null {
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

  private async resolveAvailableNickname(value: string): Promise<string | null> {
    const nickname = value.trim();
    if (!nickname) {
      return null;
    }

    const existing = await this.userRepository.findOne({ where: { nickname } });
    return existing ? null : nickname;
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

  private async dispatchRegistrationCode(
    registerType: RegisterType,
    contact: string,
    code: string,
  ): Promise<void> {
    if (registerType === 'email') {
      const mailConfigured = Boolean(this.configService.get<string>('email.host', ''));
      if (mailConfigured) {
        await this.notificationsService.sendNotification({
          toEmail: contact,
          subject: '博客系统注册验证码',
          body: this.buildRegistrationCodeEmailBody(code),
          type: 'system',
        });
        return;
      }

      if (this.isProduction()) {
        throw new ServiceUnavailableException('邮件验证码服务未配置');
      }

      this.logger.log(`开发模式邮件验证码 [${contact}]: ${code}`);
      return;
    }

    if (this.isProduction()) {
      throw new ServiceUnavailableException('短信验证码服务未配置');
    }

    this.logger.log(`开发模式短信验证码 [${contact}]: ${code}`);
  }

  private buildRegistrationCodeEmailBody(code: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>注册验证码</h2>
        <p>您正在注册博客系统账号，本次验证码为：</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 4px;">${code}</p>
        <p>验证码有效期 10 分钟，请勿泄露给他人。</p>
      </div>
    `;
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private compareHash(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private generateVerificationCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private normalizeContact(registerType: RegisterType, contact: string): string {
    const trimmed = contact.trim();
    if (!trimmed) {
      throw new BadRequestException(registerType === 'email' ? '邮箱不能为空' : '手机号不能为空');
    }

    if (registerType === 'email') {
      const normalized = trimmed.toLowerCase();
      if (!EMAIL_PATTERN.test(normalized)) {
        throw new BadRequestException('邮箱格式不正确');
      }

      return normalized;
    }

    return this.normalizePhone(trimmed);
  }

  private normalizePhone(contact: string): string {
    const digits = contact.replace(/[^\d]/g, '');
    if (digits.length < 7 || digits.length > 15) {
      throw new BadRequestException('手机号格式不正确');
    }

    return `+${digits}`;
  }

  private tryNormalizePhone(contact: string): string | null {
    try {
      return this.normalizePhone(contact);
    } catch {
      return null;
    }
  }

  private maskContact(registerType: RegisterType, contact: string): string {
    if (registerType === 'email') {
      const [local, domain] = contact.split('@');
      const visible = local.slice(0, 2);
      return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
    }

    const digits = contact.replace(/[^\d]/g, '');
    if (digits.length <= 7) {
      return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
    }

    return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  }

  private shouldExposeDebugCode(): boolean {
    return this.configService.get<boolean>('registration.exposeDebugCode', !this.isProduction());
  }

  private isProduction(): boolean {
    return this.configService.get<string>('nodeEnv', 'development') === 'production';
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
