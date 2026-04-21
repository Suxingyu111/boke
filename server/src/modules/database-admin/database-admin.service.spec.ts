import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseAdminService } from './database-admin.service';

type QueryMock = jest.Mock<Promise<unknown>, [string, unknown[]?]>;

interface DataSourceMock {
  query: QueryMock;
  options: {
    database: string;
  };
  entityMetadatas: Array<{
    tableName: string;
    name: string;
  }>;
}

const createDataSourceMock = (): DataSourceMock => ({
  query: jest.fn<Promise<unknown>, [string, unknown[]?]>(),
  options: {
    database: 'blog_system',
  },
  entityMetadatas: [
    { tableName: 'users', name: 'User' },
    { tableName: 'articles', name: 'Article' },
  ],
});

describe('DatabaseAdminService', () => {
  let service: DatabaseAdminService;
  let dataSource: DataSourceMock;

  beforeEach(() => {
    dataSource = createDataSourceMock();
    service = new DatabaseAdminService(dataSource as unknown as DataSource);
  });

  it('应返回数据库概览并将数值字段转换为 number', async () => {
    dataSource.query
      .mockResolvedValueOnce([
        {
          databaseName: 'blog_system',
          charset: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci',
        },
      ])
      .mockResolvedValueOnce([
        {
          tableCount: '2',
          estimatedRowCount: '160',
          dataSize: '3072',
          indexSize: '1024',
        },
      ])
      .mockResolvedValueOnce([
        {
          engine: 'InnoDB',
          tableCount: '2',
          totalSize: '4096',
        },
      ]);

    const result = await service.getOverview();

    expect(result).toEqual({
      databaseName: 'blog_system',
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
      tableCount: 2,
      estimatedRowCount: 160,
      dataSize: 3072,
      indexSize: 1024,
      totalSize: 4096,
      typeormEntityCount: 2,
      engineStats: [
        {
          engine: 'InnoDB',
          tableCount: 2,
          totalSize: 4096,
        },
      ],
    });
  });

  it('应返回带分页信息的表列表，并标记 TypeORM 管理表', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ total: '2' }])
      .mockResolvedValueOnce([
        {
          tableName: 'articles',
          engine: 'InnoDB',
          estimatedRowCount: '120',
          dataSize: '2048',
          indexSize: '512',
          autoIncrement: '8',
          collation: 'utf8mb4_unicode_ci',
          tableComment: '文章表',
          createTime: '2026-04-20T00:00:00.000Z',
          updateTime: '2026-04-20T12:00:00.000Z',
        },
        {
          tableName: 'custom_logs',
          engine: 'InnoDB',
          estimatedRowCount: '40',
          dataSize: '1024',
          indexSize: '128',
          autoIncrement: null,
          collation: 'utf8mb4_unicode_ci',
          tableComment: '自定义日志',
          createTime: null,
          updateTime: null,
        },
      ]);

    const result = await service.listTables({
      page: 1,
      pageSize: 10,
      keyword: 'art',
    });

    expect(dataSource.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT COUNT(*) AS total'),
      ['blog_system', 'art', '%art%', '', ''],
    );
    expect(result).toEqual({
      items: [
        {
          tableName: 'articles',
          engine: 'InnoDB',
          estimatedRowCount: 120,
          dataSize: 2048,
          indexSize: 512,
          totalSize: 2560,
          autoIncrement: 8,
          collation: 'utf8mb4_unicode_ci',
          tableComment: '文章表',
          createTime: '2026-04-20T00:00:00.000Z',
          updateTime: '2026-04-20T12:00:00.000Z',
          managedByTypeOrm: true,
          entityName: 'Article',
        },
        {
          tableName: 'custom_logs',
          engine: 'InnoDB',
          estimatedRowCount: 40,
          dataSize: 1024,
          indexSize: 128,
          totalSize: 1152,
          autoIncrement: null,
          collation: 'utf8mb4_unicode_ci',
          tableComment: '自定义日志',
          createTime: null,
          updateTime: null,
          managedByTypeOrm: false,
          entityName: null,
        },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  it('应聚合字段、索引和外键信息形成表详情，并给出行管理能力', async () => {
    dataSource.query
      .mockResolvedValueOnce([
        {
          tableName: 'articles',
          engine: 'InnoDB',
          estimatedRowCount: '120',
          dataSize: '2048',
          indexSize: '512',
          autoIncrement: '8',
          collation: 'utf8mb4_unicode_ci',
          tableComment: '文章表',
          createTime: '2026-04-20T00:00:00.000Z',
          updateTime: '2026-04-20T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          columnName: 'id',
          ordinalPosition: '1',
          columnType: 'int(11)',
          dataType: 'int',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: 'PRI',
          extra: 'auto_increment',
          columnComment: '',
          characterMaximumLength: null,
          numericPrecision: '10',
          numericScale: '0',
        },
        {
          columnName: 'title',
          ordinalPosition: '2',
          columnType: "varchar(255)",
          dataType: 'varchar',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: '',
          extra: '',
          columnComment: '标题',
          characterMaximumLength: '255',
          numericPrecision: null,
          numericScale: null,
        },
        {
          columnName: 'status',
          ordinalPosition: '3',
          columnType: "enum('draft','published')",
          dataType: 'enum',
          columnDefault: 'draft',
          isNullable: 'NO',
          columnKey: '',
          extra: '',
          columnComment: '',
          characterMaximumLength: null,
          numericPrecision: null,
          numericScale: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          indexName: 'PRIMARY',
          nonUnique: '0',
          seqInIndex: '1',
          columnName: 'id',
          collation: 'A',
          subPart: null,
          indexType: 'BTREE',
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.getTableDetail('articles');

    expect(result.primaryKeyColumns).toEqual(['id']);
    expect(result.searchableColumns).toEqual(['title', 'status']);
    expect(result.canCreateRows).toBe(true);
    expect(result.canUpdateRows).toBe(true);
    expect(result.canDeleteRows).toBe(true);
    expect(result.columns[0]).toEqual(
      expect.objectContaining({
        columnName: 'id',
        primaryKey: true,
        generated: true,
        creatable: false,
        editable: false,
      }),
    );
    expect(result.columns[2]).toEqual(
      expect.objectContaining({
        columnName: 'status',
        enumValues: ['draft', 'published'],
        searchable: true,
      }),
    );
  });

  it('应分页返回表数据行，并拆分主键与值对象', async () => {
    dataSource.query
      .mockResolvedValueOnce([
        {
          tableName: 'articles',
          engine: 'InnoDB',
          estimatedRowCount: '120',
          dataSize: '2048',
          indexSize: '512',
          autoIncrement: '8',
          collation: 'utf8mb4_unicode_ci',
          tableComment: '文章表',
          createTime: '2026-04-20T00:00:00.000Z',
          updateTime: '2026-04-20T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          columnName: 'id',
          ordinalPosition: '1',
          columnType: 'int(11)',
          dataType: 'int',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: 'PRI',
          extra: 'auto_increment',
          columnComment: '',
          characterMaximumLength: null,
          numericPrecision: '10',
          numericScale: '0',
        },
        {
          columnName: 'title',
          ordinalPosition: '2',
          columnType: 'varchar(255)',
          dataType: 'varchar',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: '',
          extra: '',
          columnComment: '',
          characterMaximumLength: '255',
          numericPrecision: null,
          numericScale: null,
        },
      ])
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([{ id: 1, title: 'Hello DB' }]);

    const result = await service.listTableRows('articles', {
      page: 1,
      pageSize: 10,
      keyword: 'Hello',
    });

    expect(result.items).toEqual([
      {
        primaryKey: { id: 1 },
        values: {
          id: 1,
          title: 'Hello DB',
        },
      },
    ]);
    expect(result.totalPages).toBe(1);
    expect(dataSource.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SELECT COUNT(*) AS total'),
      ['%Hello%'],
    );
  });

  it('应支持新增、更新和删除数据行', async () => {
    dataSource.query
      .mockResolvedValueOnce([
        {
          tableName: 'articles',
          engine: 'InnoDB',
          estimatedRowCount: '120',
          dataSize: '2048',
          indexSize: '512',
          autoIncrement: '8',
          collation: 'utf8mb4_unicode_ci',
          tableComment: '文章表',
          createTime: '2026-04-20T00:00:00.000Z',
          updateTime: '2026-04-20T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          columnName: 'id',
          ordinalPosition: '1',
          columnType: 'int(11)',
          dataType: 'int',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: 'PRI',
          extra: 'auto_increment',
          columnComment: '',
          characterMaximumLength: null,
          numericPrecision: '10',
          numericScale: '0',
        },
        {
          columnName: 'title',
          ordinalPosition: '2',
          columnType: 'varchar(255)',
          dataType: 'varchar',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: '',
          extra: '',
          columnComment: '',
          characterMaximumLength: '255',
          numericPrecision: null,
          numericScale: null,
        },
      ])
      .mockResolvedValueOnce({ affectedRows: 1, insertId: 9 });

    const createResult = await service.createTableRow('articles', {
      values: { title: 'New article' },
    });

    expect(createResult).toEqual({
      message: '已向 articles 新增 1 条记录',
      primaryKey: { id: 9 },
    });

    dataSource.query.mockReset();
    dataSource.query
      .mockResolvedValueOnce([
        {
          tableName: 'articles',
          engine: 'InnoDB',
          estimatedRowCount: '120',
          dataSize: '2048',
          indexSize: '512',
          autoIncrement: '8',
          collation: 'utf8mb4_unicode_ci',
          tableComment: '文章表',
          createTime: '2026-04-20T00:00:00.000Z',
          updateTime: '2026-04-20T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          columnName: 'id',
          ordinalPosition: '1',
          columnType: 'int(11)',
          dataType: 'int',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: 'PRI',
          extra: 'auto_increment',
          columnComment: '',
          characterMaximumLength: null,
          numericPrecision: '10',
          numericScale: '0',
        },
        {
          columnName: 'title',
          ordinalPosition: '2',
          columnType: 'varchar(255)',
          dataType: 'varchar',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: '',
          extra: '',
          columnComment: '',
          characterMaximumLength: '255',
          numericPrecision: null,
          numericScale: null,
        },
      ])
      .mockResolvedValueOnce({ affectedRows: 1 });

    const updateResult = await service.updateTableRow('articles', {
      primaryKey: { id: 9 },
      values: { title: 'Updated article' },
    });

    expect(updateResult).toEqual({
      message: '已更新 articles 中的记录',
      primaryKey: { id: 9 },
    });

    dataSource.query.mockReset();
    dataSource.query
      .mockResolvedValueOnce([
        {
          tableName: 'articles',
          engine: 'InnoDB',
          estimatedRowCount: '120',
          dataSize: '2048',
          indexSize: '512',
          autoIncrement: '8',
          collation: 'utf8mb4_unicode_ci',
          tableComment: '文章表',
          createTime: '2026-04-20T00:00:00.000Z',
          updateTime: '2026-04-20T12:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          columnName: 'id',
          ordinalPosition: '1',
          columnType: 'int(11)',
          dataType: 'int',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: 'PRI',
          extra: 'auto_increment',
          columnComment: '',
          characterMaximumLength: null,
          numericPrecision: '10',
          numericScale: '0',
        },
        {
          columnName: 'title',
          ordinalPosition: '2',
          columnType: 'varchar(255)',
          dataType: 'varchar',
          columnDefault: null,
          isNullable: 'NO',
          columnKey: '',
          extra: '',
          columnComment: '',
          characterMaximumLength: '255',
          numericPrecision: null,
          numericScale: null,
        },
      ])
      .mockResolvedValueOnce({ affectedRows: 1 });

    const deleteResult = await service.deleteTableRow('articles', {
      primaryKey: { id: 9 },
    });

    expect(deleteResult).toEqual({
      message: '已删除 articles 中的记录',
      primaryKey: { id: 9 },
    });
  });

  it('应拒绝非法表名参数', async () => {
    await expect(service.getTableDetail('articles;drop')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
