import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SearchService } from './search.service';

@Controller('admin/search')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSearchController {
  constructor(private readonly searchService: SearchService) {}

  /** 全量重建 ES 索引 */
  @Post('rebuild-index')
  rebuildIndex() {
    return this.searchService.rebuildIndex();
  }
}
