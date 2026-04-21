import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { DEFAULT_USER_ROLES } from '@database/default-user-roles';
import { User, UserRoleEntity } from '@database/entities';

const PASSWORD_SALT_ROUNDS = 10;
const SUPER_ADMIN_EMAIL_DOMAIN = 'local.admin';

@Injectable()
export class SuperAdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminBootstrapService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const username = this.configService.get<string>('superAdmin.username');
    const password = this.configService.get<string>('superAdmin.password');

    if (!username || !password) {
      this.logger.log('未检测到超级管理员配置，跳过超管引导。');
      return;
    }

    await this.ensureDefaultRoles();
    await this.ensureConfiguredSuperAdmin(username, password);
  }

  private async ensureDefaultRoles(): Promise<void> {
    const roles = DEFAULT_USER_ROLES.map(role =>
      this.userRoleRepository.create({
        code: role.code,
        name: role.name,
        description: role.description,
        sortOrder: role.sortOrder,
        isSystem: role.isSystem,
      }),
    );

    await this.userRoleRepository.save(roles);
  }

  private async ensureConfiguredSuperAdmin(username: string, password: string): Promise<void> {
    const email = this.configService.get<string>('superAdmin.email') ?? null;
    const nickname = this.configService.get<string>('superAdmin.nickname') || '系统超管';
    const normalizedUsername = username.trim();
    const normalizedEmail = this.resolveSuperAdminEmail(normalizedUsername, email);
    const existingUser = await this.findExistingSuperAdminCandidate(normalizedUsername, normalizedEmail);
    const passwordHash = await this.resolvePasswordHash(existingUser, password);
    const now = new Date();

    if (!existingUser) {
      const user = this.userRepository.create({
        username: normalizedUsername,
        email: normalizedEmail,
        phone: null,
        password: passwordHash,
        nickname,
        registrationType: 'email',
        emailVerifiedAt: normalizedEmail ? now : null,
        phoneVerifiedAt: null,
        avatar: null,
        bio: null,
        role: 'super_admin',
        isActive: true,
        lastLoginAt: null,
        passwordChangedAt: now,
      });
      await this.userRepository.save(user);
      this.logger.log(`超级管理员已创建：${normalizedUsername}`);
      return;
    }

    existingUser.username = normalizedUsername;
    existingUser.email = normalizedEmail;
    existingUser.nickname = nickname;
    existingUser.registrationType = 'email';
    existingUser.emailVerifiedAt = normalizedEmail ? existingUser.emailVerifiedAt ?? now : null;
    existingUser.role = 'super_admin';
    existingUser.isActive = true;

    if (existingUser.password !== passwordHash) {
      existingUser.password = passwordHash;
      existingUser.passwordChangedAt = now;
    }

    await this.userRepository.save(existingUser);
    this.logger.log(`超级管理员已同步：${normalizedUsername}`);
  }

  private async findExistingSuperAdminCandidate(
    username: string,
    email: string | null,
  ): Promise<User | null> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.username = :username', { username });

    if (email) {
      queryBuilder.orWhere('user.email = :email', { email });
    }

    return queryBuilder.orderBy('user.username = :username', 'DESC').getOne();
  }

  private async resolvePasswordHash(existingUser: User | null, password: string): Promise<string> {
    if (existingUser?.password) {
      const matches = await bcrypt.compare(password, existingUser.password);
      if (matches) {
        return existingUser.password;
      }
    }

    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }

  private resolveSuperAdminEmail(username: string, email: string | null): string {
    const normalizedEmail = email?.trim().toLowerCase();

    if (normalizedEmail) {
      return normalizedEmail;
    }

    const safeLocalPart =
      username
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'super-admin';

    return `${safeLocalPart}@${SUPER_ADMIN_EMAIL_DOMAIN}`;
  }
}
