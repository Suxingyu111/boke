import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

const logger = new Logger('RedisModule');

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (
        configService: ConfigService,
      ): Promise<ReturnType<typeof createClient>> => {
        const client = createClient({
          socket: {
            host: configService.get<string>('redis.host', '127.0.0.1'),
            port: configService.get<number>('redis.port', 6379),
            reconnectStrategy: retries => Math.min(retries * 100, 5000),
          },
          password: configService.get<string>('redis.password') || undefined,
          database: configService.get<number>('redis.db', 0),
        });

        client.on('error', error => {
          logger.error('Redis 连接异常', error instanceof Error ? error.stack : String(error));
        });
        client.on('reconnecting', () => {
          logger.warn('Redis 正在重连');
        });
        client.on('ready', () => {
          logger.log('Redis 连接就绪');
        });

        try {
          await client.connect();
        } catch (error) {
          logger.error('Redis connection failed', error instanceof Error ? error.stack : undefined);
          throw error;
        }

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
