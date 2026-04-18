import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListOperationLogsDto } from './dto/list-operation-logs.dto';
import { OperationLogsService } from './operation-logs.service';

@Controller('admin/operation-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminOperationLogsController {
  constructor(private readonly operationLogsService: OperationLogsService) {}

  @Get()
  findList(@Query() query: ListOperationLogsDto) {
    return this.operationLogsService.list(query);
  }
}