import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateDatabaseTableRowDto } from './dto/create-database-table-row.dto';
import { DeleteDatabaseTableRowDto } from './dto/delete-database-table-row.dto';
import { ListDatabaseTableRowsDto } from './dto/list-database-table-rows.dto';
import { ListDatabaseTablesDto } from './dto/list-database-tables.dto';
import { UpdateDatabaseTableRowDto } from './dto/update-database-table-row.dto';
import { DatabaseAdminService } from './database-admin.service';

@ApiTags('admin-database')
@ApiBearerAuth('bearer')
@Controller('admin/database')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class DatabaseAdminController {
  constructor(private readonly databaseAdminService: DatabaseAdminService) {}

  @Get('overview')
  @ApiOperation({ summary: '获取当前数据库库级概览信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getOverview() {
    return this.databaseAdminService.getOverview();
  }

  @Get('tables')
  @ApiOperation({ summary: '获取数据表列表' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'keyword', required: false, type: String, description: '按表名模糊搜索' })
  @ApiQuery({ name: 'engine', required: false, type: String, description: '按存储引擎筛选' })
  @ApiResponse({ status: 200, description: '获取成功' })
  listTables(@Query() query: ListDatabaseTablesDto) {
    return this.databaseAdminService.listTables(query);
  }

  @Get('tables/:tableName')
  @ApiOperation({ summary: '获取指定数据表详情（字段、索引、外键）' })
  @ApiParam({ name: 'tableName', description: '数据表名称', type: String })
  @ApiResponse({ status: 200, description: '获取成功' })
  getTableDetail(@Param('tableName') tableName: string) {
    return this.databaseAdminService.getTableDetail(tableName);
  }

  @Get('tables/:tableName/rows')
  @ApiOperation({ summary: '分页读取指定数据表的数据行' })
  @ApiParam({ name: 'tableName', description: '数据表名称', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'keyword', required: false, type: String, description: '按关键字搜索可检索字段' })
  @ApiResponse({ status: 200, description: '获取成功' })
  listTableRows(@Param('tableName') tableName: string, @Query() query: ListDatabaseTableRowsDto) {
    return this.databaseAdminService.listTableRows(tableName, query);
  }

  @Post('tables/:tableName/rows')
  @ApiOperation({ summary: '向指定数据表新增一行数据' })
  @ApiParam({ name: 'tableName', description: '数据表名称', type: String })
  @ApiResponse({ status: 201, description: '新增成功' })
  createTableRow(
    @Param('tableName') tableName: string,
    @Body() dto: CreateDatabaseTableRowDto,
  ) {
    return this.databaseAdminService.createTableRow(tableName, dto);
  }

  @Patch('tables/:tableName/rows')
  @ApiOperation({ summary: '更新指定数据表中的一行数据' })
  @ApiParam({ name: 'tableName', description: '数据表名称', type: String })
  @ApiResponse({ status: 200, description: '更新成功' })
  updateTableRow(
    @Param('tableName') tableName: string,
    @Body() dto: UpdateDatabaseTableRowDto,
  ) {
    return this.databaseAdminService.updateTableRow(tableName, dto);
  }

  @Post('tables/:tableName/rows/delete')
  @ApiOperation({ summary: '删除指定数据表中的一行数据' })
  @ApiParam({ name: 'tableName', description: '数据表名称', type: String })
  @ApiResponse({ status: 201, description: '删除成功' })
  deleteTableRow(
    @Param('tableName') tableName: string,
    @Body() dto: DeleteDatabaseTableRowDto,
  ) {
    return this.databaseAdminService.deleteTableRow(tableName, dto);
  }
}
