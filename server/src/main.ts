import 'reflect-metadata';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ResponseCacheInterceptor } from './common/security/response-cache.interceptor';
import { ResponseSecurityInterceptor } from './common/security/response-security.interceptor';
import {
  createSwaggerDocument,
  getSwaggerUiPath,
  setupSwagger,
} from './common/swagger/swagger-document';
import { buildCorsOptions } from './config/cors.config';

const bootstrapLogger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');
  const corsOrigins = configService.get<string[]>('cors.origins', []);
  const allowRequestsWithoutOrigin = configService.get<boolean>(
    'cors.allowRequestsWithoutOrigin',
    true,
  );
  const trustProxy = configService.get<boolean>('security.trustProxy', false);
  const hstsEnabled = configService.get<boolean>('security.hstsEnabled', nodeEnv === 'production');
  const swaggerEnabledValue = configService.get<string | boolean>('SWAGGER_ENABLED');
  const swaggerEnabled =
    typeof swaggerEnabledValue === 'boolean'
      ? swaggerEnabledValue
      : swaggerEnabledValue !== undefined
        ? swaggerEnabledValue === 'true'
        : nodeEnv !== 'production';

  app.use(
    helmet({
      hsts: hstsEnabled,
    }),
  );
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  if (trustProxy) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  // 全局请求体限制为 1MB，文件上传由 multer 在具体路由单独控制。
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // 启用 CORS
  app.enableCors(
    buildCorsOptions({
      allowedOrigins: corsOrigins,
      allowRequestsWithoutOrigin,
    }),
  );

  // 全局前缀
  app.setGlobalPrefix('api');

  // 全局验证管道
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

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局响应拦截器
  app.useGlobalInterceptors(
    app.get(ResponseSecurityInterceptor),
    new ResponseInterceptor(),
    app.get(ResponseCacheInterceptor),
  );

  if (swaggerEnabled) {
    const document = createSwaggerDocument(app, configService);
    setupSwagger(app, document);
    bootstrapLogger.log(`Swagger 文档已启用: /${getSwaggerUiPath()}`);
  }

  const port = configService.get<number>('port', 3000);
  const appName = configService.get<string>('app.name', 'Blog System');

  await app.listen(port);
  bootstrapLogger.log(`${appName} 已启动: http://localhost:${port}`);
}

bootstrap().catch(err => {
  bootstrapLogger.error('应用启动失败', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
