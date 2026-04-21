import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';
import { User, UserRoleEntity, VerificationCode } from '@database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { OperationLogsModule } from '../operation-logs/operation-logs.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { StepUpGuard } from './guards/step-up.guard';
import { SuperAdminBootstrapService } from './super-admin-bootstrap.service';
import { GithubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    OperationLogsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([User, UserRoleEntity, VerificationCode]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('jwt.expiresIn', '7d');
        const secret = configService.get<string>('jwt.secret');

        if (!secret) {
          throw new Error('JWT_SECRET 未配置');
        }

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GithubStrategy,
    GoogleStrategy,
    RolesGuard,
    StepUpGuard,
    SuperAdminBootstrapService,
  ],
  exports: [AuthService, StepUpGuard],
})
export class AuthModule {}
