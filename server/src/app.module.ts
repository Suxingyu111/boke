import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TagsModule } from './modules/tags/tags.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { PagesModule } from './modules/pages/pages.module';
import { SettingsModule } from './modules/settings/settings.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ArchivesModule } from './modules/archives/archives.module';
import { SearchModule } from './modules/search/search.module';
import { CollaborationModule } from './modules/collaboration/collaboration.module';
import { PaidContentModule } from './modules/paid-content/paid-content.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // 配置模块 - 必须首先加载
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // 速率限制
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttle.ttl', 60000),
          limit: configService.get<number>('throttle.limit', 120),
        },
      ],
    }),

    // 数据库模块
    DatabaseModule,

    // Redis 模块
    RedisModule,

    // 健康检查模块
    HealthModule,

    // 认证模块
    AuthModule,

    // 分类模块
    CategoriesModule,

    // 标签模块
    TagsModule,

    // 文章模块
    ArticlesModule,

    // 页面模块
    PagesModule,

    // 站点设置模块
    SettingsModule,

    // 仪表盘模块
    DashboardModule,

    // 文章归档模块
    ArchivesModule,

    // 全文搜索模块 (Elasticsearch)
    SearchModule,

    // 草稿协作模块
    CollaborationModule,

    // 付费内容模块
    PaidContentModule,

    // 邮件通知模块
    NotificationsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
