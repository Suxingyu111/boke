import 'reflect-metadata';
import { CanActivate, ExecutionContext, INestApplication, StreamableFile, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { BackupController } from '../src/modules/backup/backup.controller';
import { BackupService } from '../src/modules/backup/backup.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { User } from '../src/database/entities';

const now = new Date('2026-04-20T11:00:00.000Z');

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: User;
    }>();

    const role = request.headers['x-test-role'];
    if (!role) {
      return false;
    }

    request.user = {
      id: request.headers['x-test-user-id'] ?? 'admin-1',
      username: request.headers['x-test-username'] ?? 'admin',
      email: request.headers['x-test-email'] ?? 'admin@example.com',
      phone: null,
      password: '',
      nickname: '管理员',
      registrationType: 'email',
      emailVerifiedAt: new Date('2026-04-18T00:00:00.000Z'),
      phoneVerifiedAt: null,
      avatar: null,
      bio: null,
      isActive: true,
      role: role as User['role'],
      oauthProvider: null,
      oauthProviderId: null,
      lastLoginAt: null,
      passwordChangedAt: new Date('2026-04-18T00:00:00.000Z'),
      createdAt: now,
      updatedAt: now,
    };

    return true;
  }
}

describe('Backup integration', () => {
  let app: INestApplication;

  const backupService = {
    createBackup: jest.fn().mockResolvedValue({
      filename: 'backup_blog_system_2026-04-20.sql',
      size: 2048,
      createdAt: '2026-04-20T11:00:00.000Z',
    }),
    listBackups: jest.fn().mockResolvedValue([
      {
        filename: 'backup_blog_system_2026-04-20.sql',
        size: 2048,
        createdAt: '2026-04-20T11:00:00.000Z',
      },
      {
        filename: 'backup_blog_system_2026-04-19.sql',
        size: 1024,
        createdAt: '2026-04-19T11:00:00.000Z',
      },
    ]),
    downloadBackup: jest.fn().mockImplementation((filename: string) => {
      return new StreamableFile(Readable.from([`-- ${filename}\nSELECT 1;`]), {
        type: 'application/sql',
        disposition: `attachment; filename="${filename}"`,
      });
    }),
    restoreBackup: jest.fn().mockImplementation(async (filename: string) => {
      return { message: `数据库已从备份 ${filename} 恢复` };
    }),
    deleteBackup: jest.fn().mockImplementation(async (filename: string) => {
      return { message: `备份文件 ${filename} 已删除` };
    }),
  };

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [BackupController],
      providers: [
        RolesGuard,
        {
          provide: BackupService,
          useValue: backupService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new MockJwtAuthGuard());

    const moduleRef: TestingModule = await moduleBuilder.compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('应支持管理员创建、查看、恢复和删除备份', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/admin/backup')
      .set('x-test-role', 'admin')
      .expect(201);

    expect(createResponse.body.data).toEqual({
      filename: 'backup_blog_system_2026-04-20.sql',
      size: 2048,
      createdAt: '2026-04-20T11:00:00.000Z',
    });
    expect(backupService.createBackup).toHaveBeenCalledTimes(1);

    const listResponse = await request(app.getHttpServer())
      .get('/api/admin/backup')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(listResponse.body.data).toHaveLength(2);
    expect(backupService.listBackups).toHaveBeenCalledTimes(1);

    const restoreResponse = await request(app.getHttpServer())
      .post('/api/admin/backup/backup_blog_system_2026-04-20.sql/restore')
      .set('x-test-role', 'admin')
      .expect(201);

    expect(restoreResponse.body.data).toEqual({
      message: '数据库已从备份 backup_blog_system_2026-04-20.sql 恢复',
    });
    expect(backupService.restoreBackup).toHaveBeenCalledWith(
      'backup_blog_system_2026-04-20.sql',
    );

    const deleteResponse = await request(app.getHttpServer())
      .delete('/api/admin/backup/backup_blog_system_2026-04-20.sql')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(deleteResponse.body.data).toEqual({
      message: '备份文件 backup_blog_system_2026-04-20.sql 已删除',
    });
    expect(backupService.deleteBackup).toHaveBeenCalledWith(
      'backup_blog_system_2026-04-20.sql',
    );
  });

  it('应支持管理员下载备份，并设置正确响应头', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/admin/backup/backup_blog_system_2026-04-20.sql/download')
      .set('x-test-role', 'admin')
      .expect(200);

    expect(response.headers['content-type']).toContain('application/sql');
    expect(response.headers['content-disposition']).toContain(
      'attachment; filename="backup_blog_system_2026-04-20.sql"',
    );
    expect(response.text).toContain('SELECT 1;');
    expect(backupService.downloadBackup).toHaveBeenCalledWith(
      'backup_blog_system_2026-04-20.sql',
    );
  });

  it('应拒绝普通用户访问备份接口', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/backup')
      .set('x-test-role', 'user')
      .expect(403);
  });
});
