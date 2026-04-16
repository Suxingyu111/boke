import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HealthService } from '../src/modules/health/health.service';

describe('HealthService', () => {
  const createService = (options?: {
    isDatabaseHealthy?: boolean;
    isRedisHealthy?: boolean;
  }): HealthService => {
    const dataSource = {
      query: jest.fn().mockImplementation(async () => {
        if (options?.isDatabaseHealthy === false) {
          throw new Error('db down');
        }

        return [{ now: '2026-04-15 20:00:00' }];
      }),
    } as unknown as DataSource;

    const redisClient = {
      ping: jest.fn().mockImplementation(async () => {
        if (options?.isRedisHealthy === false) {
          throw new Error('redis down');
        }

        return 'PONG';
      }),
    };

    const configService = {
      get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
        if (key === 'app.name') {
          return 'Blog System';
        }

        if (key === 'nodeEnv') {
          return 'development';
        }

        return fallback;
      }),
    } as unknown as ConfigService;

    return new HealthService(dataSource, redisClient as never, configService);
  };

  it('应返回应用、数据库和 Redis 的健康状态', async () => {
    const service = createService();

    await expect(service.check()).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        appName: 'Blog System',
        environment: 'development',
        checks: {
          database: 'up',
          redis: 'up',
        },
      }),
    );
  });

  it('当依赖异常时应返回 degraded 状态', async () => {
    const service = createService({ isDatabaseHealthy: false });

    await expect(service.check()).resolves.toEqual(
      expect.objectContaining({
        status: 'degraded',
        checks: expect.objectContaining({
          database: 'down',
        }),
      }),
    );
  });
});
