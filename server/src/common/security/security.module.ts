import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@common/redis/redis.module';
import { ResponseCacheInterceptor } from './response-cache.interceptor';
import { ResponseCacheService } from './response-cache.service';
import { ResponseSecurityInterceptor } from './response-security.interceptor';

@Global()
@Module({
  imports: [ConfigModule, RedisModule],
  providers: [ResponseCacheService, ResponseSecurityInterceptor, ResponseCacheInterceptor],
  exports: [ResponseCacheService, ResponseSecurityInterceptor, ResponseCacheInterceptor],
})
export class SecurityModule {}
