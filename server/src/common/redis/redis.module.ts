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
          },
          password: configService.get<string>('redis.password') || undefined,
          database: configService.get<number>('redis.db', 0),
        });

        try {
          await client.connect();
          logger.log('Redis connected successfully');
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
