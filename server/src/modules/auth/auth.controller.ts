import { Body, Controller, Get, HttpCode, HttpStatus, Next, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import * as passport from 'passport';
import { NextFunction, Request, Response } from 'express';
import { User } from '@database/entities';
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
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/check-availability')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: '检查注册字段可用性' })
  @ApiResponse({ status: 200, description: '检查成功', type: RegistrationAvailabilityResponseDto })
  checkAvailability(@Body() dto: RegisterAvailabilityDto): Promise<RegistrationAvailabilityResponseDto> {
    return this.authService.checkRegistrationAvailability(dto);
  }

  @Post('register/send-code')
  @Throttle({ default: { limit: 6, ttl: 60000 } })
  @ApiOperation({ summary: '发送注册验证码' })
  @ApiResponse({ status: 201, description: '验证码已发送', type: RegistrationCodeSentDto })
  sendRegistrationCode(
    @Body() dto: SendRegistrationCodeDto,
    @Req() req: Request,
  ): Promise<RegistrationCodeSentDto> {
    return this.authService.sendRegistrationCode(dto, {
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('register/verify-code')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 12, ttl: 60000 } })
  @ApiOperation({ summary: '校验注册验证码' })
  @ApiResponse({ status: 200, description: '验证码校验成功', type: RegistrationVerificationResponseDto })
  verifyRegistrationCode(
    @Body() dto: VerifyRegistrationCodeDto,
  ): Promise<RegistrationVerificationResponseDto> {
    return this.authService.verifyRegistrationCode(dto);
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: '注册账号' })
  @ApiResponse({ status: 201, description: '注册成功', type: AuthResponseDto })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '账号登录' })
  @ApiResponse({ status: 200, description: '登录成功', type: AuthResponseDto })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '获取当前登录用户信息' })
  @ApiResponse({ status: 200, description: '获取成功', type: AuthUserDto })
  getMe(@CurrentUser() user: User): AuthUserDto {
    return new AuthUserDto(user);
  }

  @Get('admin/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '获取当前管理员信息' })
  @ApiResponse({ status: 200, description: '获取成功', type: AuthUserDto })
  getAdminMe(@CurrentUser() user: User): AuthUserDto {
    return new AuthUserDto(user);
  }

  @Get('oauth/providers')
  @ApiOperation({ summary: '获取 OAuth 提供商可用状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getOAuthProviders() {
    return this.authService.getOAuthProviders();
  }

  @Get('github')
  @ApiOperation({ summary: '发起 GitHub OAuth 登录' })
  async githubLogin(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Query('redirect') redirect?: string,
  ): Promise<void> {
    await this.startOAuth('github', ['user:email'], req, res, next, redirect);
  }

  @Get('github/callback')
  @ApiOperation({ summary: '处理 GitHub OAuth 回调' })
  async githubCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Query('state') redirect?: string,
  ): Promise<void> {
    await this.finishOAuth('github', req, res, next, redirect);
  }

  @Get('google')
  @ApiOperation({ summary: '发起 Google OAuth 登录' })
  async googleLogin(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Query('redirect') redirect?: string,
  ): Promise<void> {
    await this.startOAuth('google', ['profile', 'email'], req, res, next, redirect);
  }

  @Get('google/callback')
  @ApiOperation({ summary: '处理 Google OAuth 回调' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Query('state') redirect?: string,
  ): Promise<void> {
    await this.finishOAuth('google', req, res, next, redirect);
  }

  private async startOAuth(
    provider: 'github' | 'google',
    scope: string[],
    req: Request,
    res: Response,
    next: NextFunction,
    redirect?: string,
  ): Promise<void> {
    const providerLabel = provider === 'github' ? 'GitHub' : 'Google';
    if (!this.authService.isOAuthEnabled(provider)) {
      res.redirect(this.authService.buildOAuthFailureRedirect(`${providerLabel} OAuth 未配置`, redirect));
      return;
    }

    passport.authenticate(provider, {
      scope,
      session: false,
      state: redirect,
    })(req, res, next);
  }

  private async finishOAuth(
    provider: 'github' | 'google',
    req: Request,
    res: Response,
    next: NextFunction,
    redirect?: string,
  ): Promise<void> {
    const providerLabel = provider === 'github' ? 'GitHub' : 'Google';
    if (!this.authService.isOAuthEnabled(provider)) {
      res.redirect(this.authService.buildOAuthFailureRedirect(`${providerLabel} OAuth 未配置`, redirect));
      return;
    }

    await new Promise<void>((resolve, reject) => {
      passport.authenticate(
        provider,
        { session: false },
        async (error: unknown, user: User | false | null) => {
          if (error || !user) {
            res.redirect(
              this.authService.buildOAuthFailureRedirect(`${providerLabel} OAuth 登录失败`, redirect),
            );
            resolve();
            return;
          }

          try {
            const authResponse = await this.authService.buildOAuthAuthResponse(user);
            res.redirect(this.authService.buildOAuthSuccessRedirect(authResponse, redirect));
            resolve();
          } catch (authError) {
            reject(authError);
          }
        },
      )(req, res, next instanceof Function ? next : undefined);
    });
  }
}
