import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { SecurityModule } from './common/security/security.module';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
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
import { SeoModule } from './modules/seo/seo.module';
import { BackupModule } from './modules/backup/backup.module';
import { DatabaseAdminModule } from './modules/database-admin/database-admin.module';
import { I18nModule } from './modules/i18n/i18n.module';
import { UsersModule } from './modules/users/users.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { UserNotificationsModule } from './modules/user-notifications/user-notifications.module';
import { VisitorStatsModule } from './modules/visitor-stats/visitor-stats.module';
import { GuestbookModule } from './modules/guestbook/guestbook.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { CommentsModule } from './modules/comments/comments.module';
import { MediaAssetsModule } from './modules/media-assets/media-assets.module';
import { ArticleSeriesModule } from './modules/article-series/article-series.module';
import { OperationLogsModule } from './modules/operation-logs/operation-logs.module';
import { FeedModule } from './modules/feed/feed.module';
import { OperationLogInterceptor } from './modules/operation-logs/operation-log.interceptor';

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

    // 安全与缓存模块
    SecurityModule,

    // 健康检查模块
    HealthModule,

    // 订阅源模块
    FeedModule,

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

    // SEO 优化模块
    SeoModule,

    // 备份与恢复模块
    BackupModule,

    // 数据库元数据管理模块
    DatabaseAdminModule,

    // 多语言支持模块
    I18nModule,

    // 用户中心模块
    UsersModule,

    // 文章收藏模块
    FavoritesModule,

    // 站内通知模块
    UserNotificationsModule,

    // 访客统计模块
    VisitorStatsModule,

    // 留言板模块
    GuestbookModule,

    // 评论模块
    CommentsModule,

    // 媒体库模块
    MediaAssetsModule,

    // 系列文章模块
    ArticleSeriesModule,

    // 操作日志模块
    OperationLogsModule,

    // 公告栏模块
    AnnouncementsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
    {
      provide: APP_PIPE,
      useClass: SanitizePipe,
    },
  ],
})
export class AppModule {}
