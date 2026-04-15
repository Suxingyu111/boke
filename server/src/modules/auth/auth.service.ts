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

  private async ensureUserDoesNotExist(
    email: string,
    username: string,
  ): Promise<void> {
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
}