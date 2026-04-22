import 'reflect-metadata';
import helmet from 'helmet';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import {
  DEFAULT_PERMISSIONS_POLICY,
  buildHelmetOptions,
} from '../src/config/security-headers.config';

@Controller()
class SecurityHeaderProbeController {
  @Get('probe')
  getProbe() {
    return { ok: true };
  }
}

describe('security header configuration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SecurityHeaderProbeController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(
      helmet(
        buildHelmetOptions({
          allowedOrigins: ['https://blog.example.com'],
          hstsEnabled: true,
          referrerPolicy: 'strict-origin-when-cross-origin',
          cspReportOnly: false,
        }),
      ),
    );
    app.use((_request: Request, response: Response, next: NextFunction) => {
      response.setHeader('Permissions-Policy', DEFAULT_PERMISSIONS_POLICY);
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('应输出 CSP、Referrer-Policy、Permissions-Policy 与 HSTS', async () => {
    const response = await request(app.getHttpServer()).get('/probe').expect(200);

    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['content-security-policy']).toContain(
      "connect-src 'self' https://blog.example.com",
    );
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['permissions-policy']).toBe(DEFAULT_PERMISSIONS_POLICY);
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
  });

  it('应支持将 CSP 切换为 report-only', () => {
    const helmetOptions = buildHelmetOptions({
      allowedOrigins: ['https://blog.example.com'],
      hstsEnabled: false,
      referrerPolicy: 'strict-origin-when-cross-origin',
      cspReportOnly: true,
    });

    expect(helmetOptions.contentSecurityPolicy).toMatchObject({
      reportOnly: true,
    });
  });
});
