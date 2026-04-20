import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { NoStoreResponse } from '@common/security/decorators/no-store-response.decorator';
import { HealthCheckResult, HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
@NoStoreResponse()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
