import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { OperationLog } from '@database/entities';

type RecordOperationLogInput = Omit<OperationLog, 'id' | 'createdAt'>;

@Injectable()
export class OperationLogsService {
  constructor(
    @InjectRepository(OperationLog)
    private readonly operationLogRepository: Repository<OperationLog>,
  ) {}

  async record(input: RecordOperationLogInput) {
    const log = this.operationLogRepository.create(input);
    return this.operationLogRepository.save(log);
  }

  async list(query: { page?: number; pageSize?: number; moduleName?: string; actionName?: string }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: FindOptionsWhere<OperationLog> = {};

    if (query.moduleName) {
      where.moduleName = query.moduleName;
    }

    if (query.actionName) {
      where.actionName = query.actionName;
    }

    const [items, total] = await this.operationLogRepository.findAndCount({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }
}