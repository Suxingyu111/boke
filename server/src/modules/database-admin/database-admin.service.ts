import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { CreateDatabaseTableRowDto } from './dto/create-database-table-row.dto';
import { DeleteDatabaseTableRowDto } from './dto/delete-database-table-row.dto';
import { ListDatabaseTableRowsDto } from './dto/list-database-table-rows.dto';
import { ListDatabaseTablesDto } from './dto/list-database-tables.dto';
import { UpdateDatabaseTableRowDto } from './dto/update-database-table-row.dto';

type DatabasePrimitiveValue = string | number | boolean | null;
type DatabaseCellValue =
  | DatabasePrimitiveValue
  | Array<DatabasePrimitiveValue | Record<string, unknown>>
  | Record<string, unknown>;

interface DatabaseSchemaRow {
  databaseName: string;
  charset: string | null;
  collation: string | null;
}

interface DatabaseAggregateRow {
  tableCount: string | number | null;
  estimatedRowCount: string | number | null;
  dataSize: string | number | null;
  indexSize: string | number | null;
}

interface DatabaseEngineRow {
  engine: string | null;
  tableCount: string | number | null;
  totalSize: string | number | null;
}

interface DatabaseTableRow {
  tableName: string;
  engine: string | null;
  estimatedRowCount: string | number | null;
  dataSize: string | number | null;
  indexSize: string | number | null;
  autoIncrement: string | number | null;
  collation: string | null;
  tableComment: string | null;
  createTime: string | Date | null;
  updateTime: string | Date | null;
}

interface DatabaseTableCountRow {
  total: string | number | null;
}

interface DatabaseColumnRow {
  columnName: string;
  ordinalPosition: string | number | null;
  columnType: string;
  dataType: string;
  columnDefault: string | null;
  isNullable: 'YES' | 'NO';
  columnKey: string | null;
  extra: string | null;
  columnComment: string | null;
  characterMaximumLength: string | number | null;
  numericPrecision: string | number | null;
  numericScale: string | number | null;
}

interface DatabaseIndexRow {
  indexName: string;
  nonUnique: string | number | null;
  seqInIndex: string | number | null;
  columnName: string;
  collation: string | null;
  subPart: string | number | null;
  indexType: string | null;
}

interface DatabaseForeignKeyRow {
  constraintName: string;
  columnName: string;
  referencedTableName: string;
  referencedColumnName: string;
  updateRule: string | null;
  deleteRule: string | null;
}

interface DatabaseWriteResult {
  affectedRows?: number;
  insertId?: number;
}

interface DatabaseTableContext {
  table: DatabaseTableRow;
  columns: DatabaseTableColumn[];
  primaryKeyColumns: string[];
  searchableColumns: string[];
  columnMap: Map<string, DatabaseTableColumn>;
}

export interface DatabaseEngineStat {
  engine: string;
  tableCount: number;
  totalSize: number;
}

export interface DatabaseOverview {
  databaseName: string;
  charset: string | null;
  collation: string | null;
  tableCount: number;
  estimatedRowCount: number;
  dataSize: number;
  indexSize: number;
  totalSize: number;
  typeormEntityCount: number;
  engineStats: DatabaseEngineStat[];
}

export interface DatabaseTableSummary {
  tableName: string;
  engine: string | null;
  estimatedRowCount: number;
  dataSize: number;
  indexSize: number;
  totalSize: number;
  autoIncrement: number | null;
  collation: string | null;
  tableComment: string | null;
  createTime: string | null;
  updateTime: string | null;
  managedByTypeOrm: boolean;
  entityName: string | null;
}

export interface DatabaseTableColumn {
  columnName: string;
  ordinalPosition: number;
  dataType: string;
  columnType: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  indexed: boolean;
  generated: boolean;
  creatable: boolean;
  editable: boolean;
  searchable: boolean;
  hasDefault: boolean;
  enumValues: string[];
  columnDefault: string | null;
  extra: string | null;
  columnComment: string | null;
  characterMaximumLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
}

export interface DatabaseTableIndexColumn {
  columnName: string;
  collation: string | null;
  subPart: number | null;
}

export interface DatabaseTableIndex {
  indexName: string;
  unique: boolean;
  primary: boolean;
  indexType: string;
  columns: DatabaseTableIndexColumn[];
}

export interface DatabaseTableForeignKey {
  constraintName: string;
  columns: string[];
  referencedTableName: string;
  referencedColumns: string[];
  updateRule: string | null;
  deleteRule: string | null;
}

export interface DatabaseTableDetail {
  table: DatabaseTableSummary;
  columnCount: number;
  indexCount: number;
  foreignKeyCount: number;
  primaryKeyColumns: string[];
  searchableColumns: string[];
  canCreateRows: boolean;
  canUpdateRows: boolean;
  canDeleteRows: boolean;
  columns: DatabaseTableColumn[];
  indexes: DatabaseTableIndex[];
  foreignKeys: DatabaseTableForeignKey[];
}

export interface DatabaseTableListResult {
  items: DatabaseTableSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DatabaseTableRowRecord {
  primaryKey: Record<string, DatabaseCellValue>;
  values: Record<string, DatabaseCellValue>;
}

export interface DatabaseTableRowsResult {
  tableName: string;
  primaryKeyColumns: string[];
  searchableColumns: string[];
  canCreateRows: boolean;
  canUpdateRows: boolean;
  canDeleteRows: boolean;
  items: DatabaseTableRowRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DatabaseRowMutationResult {
  message: string;
  primaryKey?: Record<string, DatabaseCellValue>;
}

const WRITE_DISALLOWED_TYPES = new Set([
  'binary',
  'varbinary',
  'blob',
  'tinyblob',
  'mediumblob',
  'longblob',
  'geometry',
  'point',
  'linestring',
  'polygon',
  'multipoint',
  'multilinestring',
  'multipolygon',
  'geometrycollection',
]);

const SEARCHABLE_TYPES = new Set([
  'char',
  'varchar',
  'text',
  'tinytext',
  'mediumtext',
  'longtext',
  'enum',
  'set',
  'json',
]);

@Injectable()
export class DatabaseAdminService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getOverview(): Promise<DatabaseOverview> {
    const databaseName = this.getCurrentDatabaseName();
    const entityMetadataMap = this.getEntityMetadataMap();
    const [schemaRows, aggregateRows, engineRows] = await Promise.all([
      this.dataSource.query(
        `
          SELECT
            s.SCHEMA_NAME AS databaseName,
            s.DEFAULT_CHARACTER_SET_NAME AS charset,
            s.DEFAULT_COLLATION_NAME AS collation
          FROM information_schema.SCHEMATA s
          WHERE s.SCHEMA_NAME = ?
        `,
        [databaseName],
      ) as Promise<DatabaseSchemaRow[]>,
      this.dataSource.query(
        `
          SELECT
            COUNT(*) AS tableCount,
            COALESCE(SUM(t.TABLE_ROWS), 0) AS estimatedRowCount,
            COALESCE(SUM(t.DATA_LENGTH), 0) AS dataSize,
            COALESCE(SUM(t.INDEX_LENGTH), 0) AS indexSize
          FROM information_schema.TABLES t
          WHERE t.TABLE_SCHEMA = ?
            AND t.TABLE_TYPE = 'BASE TABLE'
        `,
        [databaseName],
      ) as Promise<DatabaseAggregateRow[]>,
      this.dataSource.query(
        `
          SELECT
            COALESCE(t.ENGINE, 'UNKNOWN') AS engine,
            COUNT(*) AS tableCount,
            COALESCE(SUM(COALESCE(t.DATA_LENGTH, 0) + COALESCE(t.INDEX_LENGTH, 0)), 0) AS totalSize
          FROM information_schema.TABLES t
          WHERE t.TABLE_SCHEMA = ?
            AND t.TABLE_TYPE = 'BASE TABLE'
          GROUP BY t.ENGINE
          ORDER BY COUNT(*) DESC, engine ASC
        `,
        [databaseName],
      ) as Promise<DatabaseEngineRow[]>,
    ]);

    const schema = schemaRows[0];

    if (!schema) {
      throw new NotFoundException(`未找到数据库 ${databaseName} 的元数据`);
    }

    const aggregate = aggregateRows[0];
    const dataSize = this.toNumber(aggregate?.dataSize);
    const indexSize = this.toNumber(aggregate?.indexSize);

    return {
      databaseName: schema.databaseName,
      charset: schema.charset,
      collation: schema.collation,
      tableCount: this.toNumber(aggregate?.tableCount),
      estimatedRowCount: this.toNumber(aggregate?.estimatedRowCount),
      dataSize,
      indexSize,
      totalSize: dataSize + indexSize,
      typeormEntityCount: entityMetadataMap.size,
      engineStats: engineRows.map(item => ({
        engine: item.engine ?? 'UNKNOWN',
        tableCount: this.toNumber(item.tableCount),
        totalSize: this.toNumber(item.totalSize),
      })),
    };
  }

  async listTables(query: ListDatabaseTablesDto): Promise<DatabaseTableListResult> {
    const databaseName = this.getCurrentDatabaseName();
    const entityMetadataMap = this.getEntityMetadataMap();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const keyword = query.keyword?.trim() ?? '';
    const engine = query.engine?.trim() ?? '';
    const keywordLike = keyword ? `%${keyword}%` : '';
    const offset = (page - 1) * pageSize;

    const [countRows, tableRows] = await Promise.all([
      this.dataSource.query(
        `
          SELECT COUNT(*) AS total
          FROM information_schema.TABLES t
          WHERE t.TABLE_SCHEMA = ?
            AND t.TABLE_TYPE = 'BASE TABLE'
            AND (? = '' OR t.TABLE_NAME LIKE ?)
            AND (? = '' OR t.ENGINE = ?)
        `,
        [databaseName, keyword, keywordLike, engine, engine],
      ) as Promise<DatabaseTableCountRow[]>,
      this.dataSource.query(
        `
          SELECT
            t.TABLE_NAME AS tableName,
            t.ENGINE AS engine,
            COALESCE(t.TABLE_ROWS, 0) AS estimatedRowCount,
            COALESCE(t.DATA_LENGTH, 0) AS dataSize,
            COALESCE(t.INDEX_LENGTH, 0) AS indexSize,
            t.AUTO_INCREMENT AS autoIncrement,
            t.TABLE_COLLATION AS collation,
            t.TABLE_COMMENT AS tableComment,
            t.CREATE_TIME AS createTime,
            t.UPDATE_TIME AS updateTime
          FROM information_schema.TABLES t
          WHERE t.TABLE_SCHEMA = ?
            AND t.TABLE_TYPE = 'BASE TABLE'
            AND (? = '' OR t.TABLE_NAME LIKE ?)
            AND (? = '' OR t.ENGINE = ?)
          ORDER BY t.TABLE_NAME ASC
          LIMIT ? OFFSET ?
        `,
        [databaseName, keyword, keywordLike, engine, engine, pageSize, offset],
      ) as Promise<DatabaseTableRow[]>,
    ]);

    const total = this.toNumber(countRows[0]?.total);

    return {
      items: tableRows.map(item => this.mapTableSummary(item, entityMetadataMap)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getTableDetail(tableName: string): Promise<DatabaseTableDetail> {
    const entityMetadataMap = this.getEntityMetadataMap();
    const context = await this.loadTableContext(tableName);
    const [indexRows, foreignKeyRows] = await Promise.all([
      this.queryTableIndexes(context.table.tableName),
      this.queryTableForeignKeys(context.table.tableName),
    ]);
    const indexes = this.groupIndexes(indexRows);
    const foreignKeys = this.groupForeignKeys(foreignKeyRows);

    return {
      table: this.mapTableSummary(context.table, entityMetadataMap),
      columnCount: context.columns.length,
      indexCount: indexes.length,
      foreignKeyCount: foreignKeys.length,
      primaryKeyColumns: context.primaryKeyColumns,
      searchableColumns: context.searchableColumns,
      canCreateRows: context.columns.some(column => column.creatable),
      canUpdateRows: context.primaryKeyColumns.length > 0 && context.columns.some(column => column.editable),
      canDeleteRows: context.primaryKeyColumns.length > 0,
      columns: context.columns,
      indexes,
      foreignKeys,
    };
  }

  async listTableRows(
    tableName: string,
    query: ListDatabaseTableRowsDto,
  ): Promise<DatabaseTableRowsResult> {
    const context = await this.loadTableContext(tableName);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const keyword = query.keyword?.trim() ?? '';
    const offset = (page - 1) * pageSize;
    const quotedTableName = this.quoteIdentifier(context.table.tableName);
    const whereParts: string[] = [];
    const whereParams: unknown[] = [];

    if (keyword && context.searchableColumns.length > 0) {
      const keywordLike = `%${keyword}%`;
      whereParts.push(
        `(${context.searchableColumns
          .map(columnName => `CAST(${this.quoteIdentifier(columnName)} AS CHAR) LIKE ?`)
          .join(' OR ')})`,
      );
      context.searchableColumns.forEach(() => whereParams.push(keywordLike));
    }

    const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const orderColumns = context.primaryKeyColumns.length > 0
      ? context.primaryKeyColumns
      : [context.columns[0]?.columnName ?? 'id'];
    const orderSql = orderColumns.map(columnName => `${this.quoteIdentifier(columnName)} ASC`).join(', ');

    const [countRows, dataRows] = await Promise.all([
      this.dataSource.query(
        `
          SELECT COUNT(*) AS total
          FROM ${quotedTableName}
          ${whereSql}
        `,
        whereParams,
      ) as Promise<DatabaseTableCountRow[]>,
      this.dataSource.query(
        `
          SELECT *
          FROM ${quotedTableName}
          ${whereSql}
          ORDER BY ${orderSql}
          LIMIT ? OFFSET ?
        `,
        [...whereParams, pageSize, offset],
      ) as Promise<Array<Record<string, unknown>>>,
    ]);

    const total = this.toNumber(countRows[0]?.total);

    return {
      tableName: context.table.tableName,
      primaryKeyColumns: context.primaryKeyColumns,
      searchableColumns: context.searchableColumns,
      canCreateRows: context.columns.some(column => column.creatable),
      canUpdateRows: context.primaryKeyColumns.length > 0 && context.columns.some(column => column.editable),
      canDeleteRows: context.primaryKeyColumns.length > 0,
      items: dataRows.map(row => this.mapDataRow(row, context)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async createTableRow(
    tableName: string,
    dto: CreateDatabaseTableRowDto,
  ): Promise<DatabaseRowMutationResult> {
    const context = await this.loadTableContext(tableName);
    const creatableColumns = context.columns.filter(column => column.creatable);

    if (creatableColumns.length === 0) {
      throw new BadRequestException(`数据表 ${context.table.tableName} 不支持新增记录`);
    }

    const payload = this.normalizePayloadMap(dto.values, context);
    const entries: Array<{ column: DatabaseTableColumn; value: unknown }> = [];

    for (const column of creatableColumns) {
      if (!(column.columnName in payload)) {
        continue;
      }

      entries.push({
        column,
        value: this.normalizeWriteValue(column, payload[column.columnName]),
      });
    }

    if (entries.length === 0) {
      throw new BadRequestException('没有可写入的字段');
    }

    const quotedTableName = this.quoteIdentifier(context.table.tableName);
    const sql = `
      INSERT INTO ${quotedTableName} (${entries
        .map(entry => this.quoteIdentifier(entry.column.columnName))
        .join(', ')})
      VALUES (${entries.map(() => '?').join(', ')})
    `;
    const result = await this.executeWriteQuery(sql, entries.map(entry => entry.value));
    const primaryKey = this.extractPrimaryKeyFromPayload(payload, context, result.insertId);

    return {
      message: `已向 ${context.table.tableName} 新增 1 条记录`,
      primaryKey,
    };
  }

  async updateTableRow(
    tableName: string,
    dto: UpdateDatabaseTableRowDto,
  ): Promise<DatabaseRowMutationResult> {
    const context = await this.loadTableContext(tableName);

    if (context.primaryKeyColumns.length === 0) {
      throw new BadRequestException(`数据表 ${context.table.tableName} 没有主键，无法更新记录`);
    }

    const payload = this.normalizePayloadMap(dto.values, context);
    const primaryKey = this.resolvePrimaryKey(dto.primaryKey, context);
    const editableColumns = context.columns.filter(column => column.editable);
    const entries: Array<{ column: DatabaseTableColumn; value: unknown }> = [];

    for (const column of editableColumns) {
      if (!(column.columnName in payload)) {
        continue;
      }

      entries.push({
        column,
        value: this.normalizeWriteValue(column, payload[column.columnName]),
      });
    }

    if (entries.length === 0) {
      throw new BadRequestException('没有可更新的字段');
    }

    const quotedTableName = this.quoteIdentifier(context.table.tableName);
    const setSql = entries
      .map(entry => `${this.quoteIdentifier(entry.column.columnName)} = ?`)
      .join(', ');
    const where = this.buildPrimaryKeyWhereClause(primaryKey);
    const result = await this.executeWriteQuery(
      `
        UPDATE ${quotedTableName}
        SET ${setSql}
        WHERE ${where.sql}
      `,
      [...entries.map(entry => entry.value), ...where.params],
    );

    if (!result.affectedRows) {
      throw new NotFoundException('要更新的记录不存在');
    }

    return {
      message: `已更新 ${context.table.tableName} 中的记录`,
      primaryKey,
    };
  }

  async deleteTableRow(
    tableName: string,
    dto: DeleteDatabaseTableRowDto,
  ): Promise<DatabaseRowMutationResult> {
    const context = await this.loadTableContext(tableName);

    if (context.primaryKeyColumns.length === 0) {
      throw new BadRequestException(`数据表 ${context.table.tableName} 没有主键，无法删除记录`);
    }

    const primaryKey = this.resolvePrimaryKey(dto.primaryKey, context);
    const where = this.buildPrimaryKeyWhereClause(primaryKey);
    const quotedTableName = this.quoteIdentifier(context.table.tableName);
    const result = await this.executeWriteQuery(
      `
        DELETE FROM ${quotedTableName}
        WHERE ${where.sql}
      `,
      where.params,
    );

    if (!result.affectedRows) {
      throw new NotFoundException('要删除的记录不存在');
    }

    return {
      message: `已删除 ${context.table.tableName} 中的记录`,
      primaryKey,
    };
  }

  private async loadTableContext(tableName: string): Promise<DatabaseTableContext> {
    const normalizedTableName = this.normalizeTableName(tableName);
    const [tableRows, columnRows] = await Promise.all([
      this.queryTable(normalizedTableName),
      this.queryTableColumns(normalizedTableName),
    ]);
    const table = tableRows[0];

    if (!table) {
      throw new NotFoundException(`数据表 ${normalizedTableName} 不存在`);
    }

    if (columnRows.length === 0) {
      throw new NotFoundException(`未找到数据表 ${normalizedTableName} 的字段信息`);
    }

    const columns = columnRows.map(item => this.mapColumn(item));
    const primaryKeyColumns = columns
      .filter(column => column.primaryKey)
      .sort((left, right) => left.ordinalPosition - right.ordinalPosition)
      .map(column => column.columnName);
    const searchableColumns = columns.filter(column => column.searchable).map(column => column.columnName);

    return {
      table,
      columns,
      primaryKeyColumns,
      searchableColumns,
      columnMap: new Map(columns.map(column => [column.columnName, column])),
    };
  }

  private async queryTable(tableName: string): Promise<DatabaseTableRow[]> {
    return this.dataSource.query(
      `
        SELECT
          t.TABLE_NAME AS tableName,
          t.ENGINE AS engine,
          COALESCE(t.TABLE_ROWS, 0) AS estimatedRowCount,
          COALESCE(t.DATA_LENGTH, 0) AS dataSize,
          COALESCE(t.INDEX_LENGTH, 0) AS indexSize,
          t.AUTO_INCREMENT AS autoIncrement,
          t.TABLE_COLLATION AS collation,
          t.TABLE_COMMENT AS tableComment,
          t.CREATE_TIME AS createTime,
          t.UPDATE_TIME AS updateTime
        FROM information_schema.TABLES t
        WHERE t.TABLE_SCHEMA = ?
          AND t.TABLE_TYPE = 'BASE TABLE'
          AND t.TABLE_NAME = ?
        LIMIT 1
      `,
      [this.getCurrentDatabaseName(), tableName],
    ) as Promise<DatabaseTableRow[]>;
  }

  private async queryTableColumns(tableName: string): Promise<DatabaseColumnRow[]> {
    return this.dataSource.query(
      `
        SELECT
          c.COLUMN_NAME AS columnName,
          c.ORDINAL_POSITION AS ordinalPosition,
          c.COLUMN_TYPE AS columnType,
          c.DATA_TYPE AS dataType,
          c.COLUMN_DEFAULT AS columnDefault,
          c.IS_NULLABLE AS isNullable,
          c.COLUMN_KEY AS columnKey,
          c.EXTRA AS extra,
          c.COLUMN_COMMENT AS columnComment,
          c.CHARACTER_MAXIMUM_LENGTH AS characterMaximumLength,
          c.NUMERIC_PRECISION AS numericPrecision,
          c.NUMERIC_SCALE AS numericScale
        FROM information_schema.COLUMNS c
        WHERE c.TABLE_SCHEMA = ?
          AND c.TABLE_NAME = ?
        ORDER BY c.ORDINAL_POSITION ASC
      `,
      [this.getCurrentDatabaseName(), tableName],
    ) as Promise<DatabaseColumnRow[]>;
  }

  private async queryTableIndexes(tableName: string): Promise<DatabaseIndexRow[]> {
    return this.dataSource.query(
      `
        SELECT
          s.INDEX_NAME AS indexName,
          s.NON_UNIQUE AS nonUnique,
          s.SEQ_IN_INDEX AS seqInIndex,
          s.COLUMN_NAME AS columnName,
          s.COLLATION AS collation,
          s.SUB_PART AS subPart,
          s.INDEX_TYPE AS indexType
        FROM information_schema.STATISTICS s
        WHERE s.TABLE_SCHEMA = ?
          AND s.TABLE_NAME = ?
        ORDER BY s.INDEX_NAME ASC, s.SEQ_IN_INDEX ASC
      `,
      [this.getCurrentDatabaseName(), tableName],
    ) as Promise<DatabaseIndexRow[]>;
  }

  private async queryTableForeignKeys(tableName: string): Promise<DatabaseForeignKeyRow[]> {
    return this.dataSource.query(
      `
        SELECT
          k.CONSTRAINT_NAME AS constraintName,
          k.COLUMN_NAME AS columnName,
          k.REFERENCED_TABLE_NAME AS referencedTableName,
          k.REFERENCED_COLUMN_NAME AS referencedColumnName,
          rc.UPDATE_RULE AS updateRule,
          rc.DELETE_RULE AS deleteRule
        FROM information_schema.KEY_COLUMN_USAGE k
        LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
          ON rc.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA
          AND rc.TABLE_NAME = k.TABLE_NAME
          AND rc.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        WHERE k.TABLE_SCHEMA = ?
          AND k.TABLE_NAME = ?
          AND k.REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY k.CONSTRAINT_NAME ASC, k.ORDINAL_POSITION ASC
      `,
      [this.getCurrentDatabaseName(), tableName],
    ) as Promise<DatabaseForeignKeyRow[]>;
  }

  private mapTableSummary(
    row: DatabaseTableRow,
    entityMetadataMap: Map<string, string>,
  ): DatabaseTableSummary {
    const dataSize = this.toNumber(row.dataSize);
    const indexSize = this.toNumber(row.indexSize);
    const entityName = entityMetadataMap.get(row.tableName) ?? null;

    return {
      tableName: row.tableName,
      engine: row.engine,
      estimatedRowCount: this.toNumber(row.estimatedRowCount),
      dataSize,
      indexSize,
      totalSize: dataSize + indexSize,
      autoIncrement:
        row.autoIncrement === null || row.autoIncrement === undefined
          ? null
          : this.toNumber(row.autoIncrement),
      collation: row.collation,
      tableComment: row.tableComment,
      createTime: this.toIsoString(row.createTime),
      updateTime: this.toIsoString(row.updateTime),
      managedByTypeOrm: Boolean(entityName),
      entityName,
    };
  }

  private mapColumn(row: DatabaseColumnRow): DatabaseTableColumn {
    const columnKey = row.columnKey ?? '';
    const extra = row.extra ?? '';
    const dataType = row.dataType.toLowerCase();
    const generated = extra.toLowerCase().includes('auto_increment') || extra.toLowerCase().includes('generated');
    const searchable = SEARCHABLE_TYPES.has(dataType);

    return {
      columnName: row.columnName,
      ordinalPosition: this.toNumber(row.ordinalPosition),
      dataType,
      columnType: row.columnType,
      nullable: row.isNullable === 'YES',
      primaryKey: columnKey === 'PRI',
      unique: columnKey === 'UNI' || columnKey === 'PRI',
      indexed: columnKey === 'PRI' || columnKey === 'UNI' || columnKey === 'MUL',
      generated,
      creatable: !generated && !WRITE_DISALLOWED_TYPES.has(dataType),
      editable: !generated && columnKey !== 'PRI' && !WRITE_DISALLOWED_TYPES.has(dataType),
      searchable,
      hasDefault: row.columnDefault !== null,
      enumValues: this.parseEnumValues(row.columnType),
      columnDefault: row.columnDefault,
      extra: row.extra,
      columnComment: row.columnComment,
      characterMaximumLength:
        row.characterMaximumLength === null ? null : this.toNumber(row.characterMaximumLength),
      numericPrecision: row.numericPrecision === null ? null : this.toNumber(row.numericPrecision),
      numericScale: row.numericScale === null ? null : this.toNumber(row.numericScale),
    };
  }

  private mapDataRow(
    row: Record<string, unknown>,
    context: DatabaseTableContext,
  ): DatabaseTableRowRecord {
    const values: Record<string, DatabaseCellValue> = {};

    for (const column of context.columns) {
      values[column.columnName] = this.normalizeReadValue(row[column.columnName], column);
    }

    const primaryKey = this.extractPrimaryKeyFromRow(values, context.primaryKeyColumns);

    return {
      primaryKey,
      values,
    };
  }

  private normalizeReadValue(
    value: unknown,
    column: DatabaseTableColumn,
  ): DatabaseCellValue {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Buffer.isBuffer(value)) {
      return value.toString('base64');
    }

    if (column.dataType === 'json' && typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, unknown> | Array<DatabasePrimitiveValue>;
      } catch {
        return value;
      }
    }

    if (typeof value === 'object') {
      return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      return value;
    }

    return String(value);
  }

  private groupIndexes(rows: DatabaseIndexRow[]): DatabaseTableIndex[] {
    const grouped = new Map<string, DatabaseTableIndex>();

    for (const row of rows) {
      const existing =
        grouped.get(row.indexName) ??
        {
          indexName: row.indexName,
          unique: this.toNumber(row.nonUnique) === 0,
          primary: row.indexName === 'PRIMARY',
          indexType: row.indexType ?? 'BTREE',
          columns: [],
        };

      existing.columns.push({
        columnName: row.columnName,
        collation: row.collation,
        subPart: row.subPart === null ? null : this.toNumber(row.subPart),
      });

      grouped.set(row.indexName, existing);
    }

    return Array.from(grouped.values());
  }

  private groupForeignKeys(rows: DatabaseForeignKeyRow[]): DatabaseTableForeignKey[] {
    const grouped = new Map<string, DatabaseTableForeignKey>();

    for (const row of rows) {
      const existing =
        grouped.get(row.constraintName) ??
        {
          constraintName: row.constraintName,
          columns: [],
          referencedTableName: row.referencedTableName,
          referencedColumns: [],
          updateRule: row.updateRule,
          deleteRule: row.deleteRule,
        };

      existing.columns.push(row.columnName);
      existing.referencedColumns.push(row.referencedColumnName);

      grouped.set(row.constraintName, existing);
    }

    return Array.from(grouped.values());
  }

  private normalizePayloadMap(
    values: Record<string, unknown>,
    context: DatabaseTableContext,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const [columnName, value] of Object.entries(values)) {
      const normalizedColumnName = this.normalizeTableName(columnName);
      const column = context.columnMap.get(normalizedColumnName);

      if (!column) {
        throw new BadRequestException(`字段 ${columnName} 不存在于数据表 ${context.table.tableName}`);
      }

      payload[normalizedColumnName] = value;
    }

    return payload;
  }

  private resolvePrimaryKey(
    value: Record<string, unknown>,
    context: DatabaseTableContext,
  ): Record<string, DatabaseCellValue> {
    if (context.primaryKeyColumns.length === 0) {
      throw new BadRequestException(`数据表 ${context.table.tableName} 没有主键`);
    }

    const payload = this.normalizePayloadMap(value, context);
    const primaryKey: Record<string, DatabaseCellValue> = {};

    for (const columnName of context.primaryKeyColumns) {
      if (!(columnName in payload)) {
        throw new BadRequestException(`缺少主键字段 ${columnName}`);
      }

      primaryKey[columnName] = this.normalizeWriteValue(
        context.columnMap.get(columnName)!,
        payload[columnName],
      ) as DatabaseCellValue;
    }

    return primaryKey;
  }

  private extractPrimaryKeyFromPayload(
    payload: Record<string, unknown>,
    context: DatabaseTableContext,
    insertId?: number,
  ): Record<string, DatabaseCellValue> | undefined {
    if (context.primaryKeyColumns.length === 0) {
      return undefined;
    }

    const primaryKey: Record<string, DatabaseCellValue> = {};

    for (const columnName of context.primaryKeyColumns) {
      const column = context.columnMap.get(columnName);
      const value = payload[columnName];

      if (value !== undefined) {
        primaryKey[columnName] = this.normalizeWriteValue(column!, value) as DatabaseCellValue;
        continue;
      }

      if (
        insertId !== undefined &&
        insertId > 0 &&
        context.primaryKeyColumns.length === 1 &&
        column?.generated
      ) {
        primaryKey[columnName] = insertId;
      }
    }

    return Object.keys(primaryKey).length > 0 ? primaryKey : undefined;
  }

  private extractPrimaryKeyFromRow(
    values: Record<string, DatabaseCellValue>,
    primaryKeyColumns: string[],
  ): Record<string, DatabaseCellValue> {
    const primaryKey: Record<string, DatabaseCellValue> = {};

    for (const columnName of primaryKeyColumns) {
      primaryKey[columnName] = values[columnName];
    }

    return primaryKey;
  }

  private buildPrimaryKeyWhereClause(primaryKey: Record<string, DatabaseCellValue>) {
    const entries = Object.entries(primaryKey);

    return {
      sql: entries.map(([columnName]) => `${this.quoteIdentifier(columnName)} = ?`).join(' AND '),
      params: entries.map(([, value]) => value),
    };
  }

  private normalizeWriteValue(column: DatabaseTableColumn, value: unknown): unknown {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      if (!column.nullable) {
        throw new BadRequestException(`字段 ${column.columnName} 不允许为 null`);
      }
      return null;
    }

    if (this.isBooleanColumn(column)) {
      if (typeof value === 'boolean') {
        return value ? 1 : 0;
      }

      if (typeof value === 'number') {
        return value === 0 ? 0 : 1;
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) {
          return 1;
        }
        if (['0', 'false', 'no', 'off'].includes(normalized)) {
          return 0;
        }
      }

      throw new BadRequestException(`字段 ${column.columnName} 必须为布尔值`);
    }

    if (this.isIntegerColumn(column)) {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed)) {
        throw new BadRequestException(`字段 ${column.columnName} 必须为整数`);
      }
      return parsed;
    }

    if (this.isDecimalColumn(column)) {
      const parsed = Number.parseFloat(String(value));
      if (!Number.isFinite(parsed)) {
        throw new BadRequestException(`字段 ${column.columnName} 必须为数字`);
      }
      return parsed;
    }

    if (column.dataType === 'json') {
      try {
        if (typeof value === 'string') {
          return JSON.stringify(JSON.parse(value));
        }

        return JSON.stringify(value);
      } catch {
        throw new BadRequestException(`字段 ${column.columnName} 必须为合法 JSON`);
      }
    }

    if (this.isTemporalColumn(column)) {
      if (value instanceof Date) {
        return this.toMySqlDateTime(value.toISOString());
      }

      if (typeof value === 'string') {
        const normalized = this.toMySqlDateTime(value);
        if (!normalized) {
          throw new BadRequestException(`字段 ${column.columnName} 时间格式不正确`);
        }
        return normalized;
      }

      throw new BadRequestException(`字段 ${column.columnName} 必须为时间字符串`);
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    throw new BadRequestException(`字段 ${column.columnName} 的值类型不支持写入`);
  }

  private async executeWriteQuery(sql: string, params: unknown[]): Promise<DatabaseWriteResult> {
    try {
      return (await this.dataSource.query(sql, params)) as DatabaseWriteResult;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw this.mapWriteError(error);
      }
      throw error;
    }
  }

  private mapWriteError(error: QueryFailedError): BadRequestException | ConflictException {
    const driverError = (
      error as QueryFailedError & {
        driverError?: {
          errno?: number;
          code?: string;
          sqlMessage?: string;
          message?: string;
        };
      }
    ).driverError;
    const errno = driverError?.errno;
    const message = driverError?.sqlMessage ?? driverError?.message ?? error.message;

    if (errno === 1062) {
      return new ConflictException(`写入失败，存在唯一键冲突：${message}`);
    }

    if (errno === 1451 || errno === 1452) {
      return new ConflictException(`写入失败，外键约束不满足：${message}`);
    }

    if (errno === 1048 || errno === 1364) {
      return new BadRequestException(`写入失败，必填字段缺失：${message}`);
    }

    if (errno === 1265 || errno === 1292) {
      return new BadRequestException(`写入失败，字段值格式不正确：${message}`);
    }

    return new BadRequestException(`写入失败：${message}`);
  }

  private getCurrentDatabaseName(): string {
    const databaseName = this.dataSource.options.database;

    if (typeof databaseName === 'string' && databaseName.trim()) {
      return databaseName.trim();
    }

    throw new InternalServerErrorException('数据库连接未配置库名');
  }

  private getEntityMetadataMap(): Map<string, string> {
    const metadataMap = new Map<string, string>();

    for (const metadata of this.dataSource.entityMetadatas) {
      if (!metadata.tableName || metadataMap.has(metadata.tableName)) {
        continue;
      }

      metadataMap.set(metadata.tableName, metadata.name);
    }

    return metadataMap;
  }

  private normalizeTableName(tableName: string): string {
    const normalizedTableName = tableName.trim();

    if (
      !normalizedTableName ||
      normalizedTableName.length > 64 ||
      !/^[A-Za-z0-9_]+$/.test(normalizedTableName)
    ) {
      throw new BadRequestException('数据表名称不合法');
    }

    return normalizedTableName;
  }

  private quoteIdentifier(identifier: string): string {
    return `\`${this.normalizeTableName(identifier)}\``;
  }

  private parseEnumValues(columnType: string): string[] {
    const normalized = columnType.trim();
    if (!normalized.startsWith('enum(')) {
      return [];
    }

    const values: string[] = [];
    const matcher = /'((?:[^'\\]|\\.)*)'/g;
    let match: RegExpExecArray | null = null;

    while ((match = matcher.exec(normalized)) !== null) {
      values.push(match[1].replace(/\\'/g, "'"));
    }

    return values;
  }

  private isBooleanColumn(column: DatabaseTableColumn): boolean {
    return column.dataType === 'boolean' || column.columnType === 'tinyint(1)';
  }

  private isIntegerColumn(column: DatabaseTableColumn): boolean {
    return ['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint'].includes(column.dataType);
  }

  private isDecimalColumn(column: DatabaseTableColumn): boolean {
    return ['decimal', 'numeric', 'float', 'double', 'real'].includes(column.dataType);
  }

  private isTemporalColumn(column: DatabaseTableColumn): boolean {
    return ['date', 'datetime', 'timestamp', 'time', 'year'].includes(column.dataType);
  }

  private toMySqlDateTime(value: string): string | null {
    if (!value.trim()) {
      return null;
    }

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    const normalized = value.trim().replace('T', ' ');
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return normalized;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
      return `${normalized}:00`;
    }
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
      return normalized;
    }
    if (/^\d{2}:\d{2}$/.test(normalized)) {
      return `${normalized}:00`;
    }
    if (/^\d{2}:\d{2}:\d{2}$/.test(normalized)) {
      return normalized;
    }

    return null;
  }

  private toNumber(value: string | number | null | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const parsed = Number.parseInt(String(value ?? '0'), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toIsoString(value: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}
