import { HealthController } from '../src/modules/health/health.controller';
import { HealthService } from '../src/modules/health/health.service';

describe('HealthController', () => {
  it('应返回健康检查结果', async () => {
    const expectedResult = {
      status: 'ok',
      appName: 'Blog System',
      environment: 'development',
      checks: {
        database: 'up',
        redis: 'up',
      },
      timestamp: '2026-04-15T12:00:00.000Z',
    };

    const service = {
      check: jest.fn().mockResolvedValue(expectedResult),
    } as unknown as HealthService;

    const controller = new HealthController(service);

    await expect(controller.check()).resolves.toEqual(expectedResult);
  });
});
