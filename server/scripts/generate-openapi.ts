import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { createSwaggerDocument } from '../src/common/swagger/swagger-document';

function applyDocsModeDefaults(): void {
  process.env.JWT_SECRET ||= 'docs-mode-jwt-secret';
  process.env.CLIENT_URL ||= 'http://localhost:5173';
  process.env.GITHUB_CLIENT_ID ||= 'docs-github-client-id';
  process.env.GITHUB_CLIENT_SECRET ||= 'docs-github-client-secret';
  process.env.GITHUB_CALLBACK_URL ||= 'http://localhost:3000/api/auth/github/callback';
  process.env.GOOGLE_CLIENT_ID ||= 'docs-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET ||= 'docs-google-client-secret';
  process.env.GOOGLE_CALLBACK_URL ||= 'http://localhost:3000/api/auth/google/callback';
}

async function generate(): Promise<void> {
  applyDocsModeDefaults();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    app.setGlobalPrefix('api');
    const configService = app.get(ConfigService);
    const document = createSwaggerDocument(app, configService);
    const outputDir = join(process.cwd(), 'docs');
    const outputPath = join(outputDir, 'openapi.json');

    mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf8');

    const pathCount = Object.keys(document.paths).length;
    console.log(`OpenAPI 文档已生成: ${outputPath}`);
    console.log(`已收录路径: ${pathCount}`);
  } finally {
    await app.close();
  }

  process.exit(0);
}

generate().catch(error => {
  console.error('生成 OpenAPI 文档失败');
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
