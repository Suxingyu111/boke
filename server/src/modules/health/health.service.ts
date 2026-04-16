import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisClientType } from 'redis';
import { DataSource } from 'typeorm';

type DependencyStatus = 'up' | 'down';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  appName: string;
  environment: string;
  checks: {
    database: DependencyStatus;
    redis: DependencyStatus;
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Pick<RedisClientType, 'ping'>,
    private readonly configService: ConfigService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const [databaseStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const status = databaseStatus === 'up' && redisStatus === 'up' ? 'ok' : 'degraded';

    return {
      status,
      appName: this.configService.get<string>('app.name', 'Blog System'),
      environment: this.configService.get<string>('nodeEnv', 'development'),
      checks: {
        database: databaseStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<DependencyStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      await this.redisClient.ping();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
