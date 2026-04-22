import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { SecurityAuditService } from '../operation-logs/security-audit.service';
import { BackupService } from './backup.service';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs') as typeof import('fs');

  return {
    ...actual,
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    statSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
});

describe('BackupService', () => {
  const configValues = {
    'database.host': 'db.internal',
    'database.port': 3307,
    'database.username': 'backup_user',
    'database.password': 'super-secret-password',
    'database.database': 'blog_system',
  };
  type RunDatabaseCommand = (
    executable: string,
    args: string[],
    options: { password: string; stdinFilePath?: string; stdoutFilePath?: string },
  ) => Promise<void>;
  const createAuditServiceMock = () =>
    ({
      recordBestEffort: jest.fn().mockResolvedValue(undefined),
    }) as unknown as SecurityAuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.MockedFunction<typeof fs.existsSync>).mockReturnValue(true);
    (fs.mkdirSync as jest.MockedFunction<typeof fs.mkdirSync>).mockImplementation(() => undefined);
    (fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>).mockImplementation(
      () => undefined,
    );
    (fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>).mockReturnValue('[]' as never);
  });

  it('创建备份时不应将数据库密码拼接进命令参数', async () => {
    const service = new BackupService({
      get: jest.fn().mockImplementation((key: string, fallback?: unknown) =>
        key in configValues ? configValues[key as keyof typeof configValues] : fallback,
      ),
    } as unknown as ConfigService, createAuditServiceMock());
    const internalService = service as unknown as { runDatabaseCommand: RunDatabaseCommand };
    const runSpy = jest
      .spyOn(internalService, 'runDatabaseCommand')
      .mockImplementation(async (...args: Parameters<RunDatabaseCommand>) => {
        void args;
        return undefined;
      });
    (fs.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({ size: 1024 } as fs.Stats);

    await service.createBackup();

    const [command, args, options] = runSpy.mock.calls[0] as [
      string,
      string[],
      { password: string; stdoutFilePath?: string },
    ];
    expect(command).toBe('mysqldump');
    expect(args).toEqual(
      expect.arrayContaining([
        '--host=db.internal',
        '--port=3307',
        '--user=backup_user',
        '--single-transaction',
        'blog_system',
      ]),
    );
    expect(args.some(arg => arg.includes('password'))).toBe(false);
    expect(options.password).toBe('super-secret-password');
    expect(options.stdoutFilePath).toContain('backup_blog_system_');
  });

  it('恢复备份时不应将数据库密码拼接进命令参数', async () => {
    const service = new BackupService({
      get: jest.fn().mockImplementation((key: string, fallback?: unknown) =>
        key in configValues ? configValues[key as keyof typeof configValues] : fallback,
      ),
    } as unknown as ConfigService, createAuditServiceMock());
    const internalService = service as unknown as { runDatabaseCommand: RunDatabaseCommand };
    const runSpy = jest
      .spyOn(internalService, 'runDatabaseCommand')
      .mockImplementation(async (...args: Parameters<RunDatabaseCommand>) => {
        void args;
        return undefined;
      });

    await service.restoreBackup('backup_blog_system_2026-04-20.sql');

    const [command, args, options] = runSpy.mock.calls[0] as [
      string,
      string[],
      { password: string; stdinFilePath?: string },
    ];
    expect(command).toBe('mysql');
    expect(args).toEqual(
      expect.arrayContaining([
        '--host=db.internal',
        '--port=3307',
        '--user=backup_user',
        'blog_system',
      ]),
    );
    expect(args.some(arg => arg.includes('password'))).toBe(false);
    expect(options.password).toBe('super-secret-password');
    expect(options.stdinFilePath).toContain('backup_blog_system_2026-04-20.sql');
  });

  it('应在错误输出中脱敏数据库口令', () => {
    const service = new BackupService({
      get: jest.fn().mockImplementation((key: string, fallback?: unknown) =>
        key in configValues ? configValues[key as keyof typeof configValues] : fallback,
      ),
    } as unknown as ConfigService, createAuditServiceMock());
    const sanitizeSensitiveText = (
      service as unknown as {
        ['sanitizeSensitiveText']: (message: string, password: string) => string;
      }
    )['sanitizeSensitiveText'];

    const sanitized = sanitizeSensitiveText(
      'mysqldump failed: MYSQL_PWD=super-secret-password super-secret-password',
      'super-secret-password',
    );

    expect(sanitized).not.toContain('super-secret-password');
    expect(sanitized).toContain('[REDACTED]');
  });

  it('恢复不存在的备份时应记录结构化审计事件', async () => {
    const auditService = {
      recordBestEffort: jest.fn().mockResolvedValue(undefined),
    };
    (fs.existsSync as jest.MockedFunction<typeof fs.existsSync>)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const service = new BackupService(
      {
        get: jest.fn().mockImplementation((key: string, fallback?: unknown) =>
          key in configValues ? configValues[key as keyof typeof configValues] : fallback,
        ),
      } as unknown as ConfigService,
      auditService as unknown as SecurityAuditService,
    );

    await expect(service.restoreBackup('backup_blog_system_2026-04-20.sql')).rejects.toThrow(
      '备份文件不存在：backup_blog_system_2026-04-20.sql',
    );
    expect(auditService.recordBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'backup.restore_failed',
        targetId: 'backup_blog_system_2026-04-20.sql',
        responseCode: 404,
      }),
    );
  });

  it('恢复演练成功时应输出 RTO/RPO 报告并写入历史', async () => {
    const auditService = {
      recordBestEffort: jest.fn().mockResolvedValue(undefined),
    };
    const service = new BackupService(
      {
        get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
          const values: Record<string, unknown> = {
            ...configValues,
            'backup.drillDatabase': 'blog_system_drill',
            'backup.drillCleanup': true,
            'backup.drillRtoSeconds': 900,
            'backup.drillRpoSeconds': 604800,
          };

          return key in values ? values[key] : fallback;
        }),
      } as unknown as ConfigService,
      auditService as unknown as SecurityAuditService,
    );
    const internalService = service as unknown as {
      runDatabaseCommand: (
        executable: string,
        args: string[],
        options: { password: string; stdinFilePath?: string; stdoutFilePath?: string; captureStdout?: boolean },
      ) => Promise<string>;
    };
    jest
      .spyOn(internalService, 'runDatabaseCommand')
      .mockImplementation(async (_executable, args) => {
        if (args.some(arg => arg.includes('SELECT COUNT(*)'))) {
          return '12';
        }

        return '';
      });
    (fs.statSync as jest.MockedFunction<typeof fs.statSync>).mockReturnValue({
      mtime: new Date('2026-04-20T10:00:00.000Z'),
    } as fs.Stats);

    const report = await service.runRecoveryDrill('backup_blog_system_2026-04-20.sql');

    expect(report).toEqual(
      expect.objectContaining({
        filename: 'backup_blog_system_2026-04-20.sql',
        targetDatabase: 'blog_system_drill',
        validatedTableCount: 12,
        cleanupPerformed: true,
        success: true,
      }),
    );
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(auditService.recordBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'backup.drill_succeeded',
      }),
    );
  });
});
