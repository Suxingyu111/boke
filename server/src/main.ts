import 'reflect-metadata';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { buildCorsOptions } from './config/cors.config';

const bootstrapLogger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const corsOrigins = configService.get<string[]>('cors.origins', []);
  const allowRequestsWithoutOrigin = configService.get<boolean>(
    'cors.allowRequestsWithoutOrigin',
    true,
  );

  app.use(helmet());

  // 允许最大 50 MB 的 JSON / urlencoded 请求体（multipart 由 multer 单独控制）
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

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
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = configService.get<number>('port', 3000);
  const appName = configService.get<string>('app.name', 'Blog System');

  await app.listen(port);
  bootstrapLogger.log(`${appName} 已启动: http://localhost:${port}`);
}

bootstrap().catch(err => {
  bootstrapLogger.error('应用启动失败', err instanceof Error ? err.stack : String(err));
  process.exit(1);
});
