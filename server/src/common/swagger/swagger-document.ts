import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerCustomOptions,
  SwaggerDocumentOptions,
  SwaggerModule,
} from '@nestjs/swagger';

const SWAGGER_UI_PATH = 'api/docs';
const SWAGGER_JSON_PATH = 'api/docs-json';
const SWAGGER_YAML_PATH = 'api/docs-yaml';
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

type OperationMethod = (typeof HTTP_METHODS)[number];

function deriveTag(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const pathSegments = segments[0] === 'api' ? segments.slice(1) : segments;

  if (pathSegments[0] === 'admin' && pathSegments[1]) {
    return `admin/${pathSegments[1]}`;
  }

  return pathSegments[0] ?? 'default';
}

function buildOperationSummary(method: OperationMethod, pathname: string): string {
  return `${method.toUpperCase()} ${pathname}`;
}

function buildOperationId(method: OperationMethod, pathname: string): string {
  const normalizedPath = pathname
    .replace(/[{}]/g, '')
    .split('/')
    .filter(Boolean)
    .join('_')
    .replace(/[^a-zA-Z0-9_]/g, '_');

  return `${method}_${normalizedPath || 'root'}`;
}

function enrichSwaggerDocument(document: OpenAPIObject): OpenAPIObject {
  const tagSet = new Set((document.tags ?? []).map(tag => tag.name));

  for (const [pathname, pathItem] of Object.entries(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }

      if (!operation.tags || operation.tags.length === 0) {
        operation.tags = [deriveTag(pathname)];
      }

      if (!operation.summary) {
        operation.summary = buildOperationSummary(method, pathname);
      }

      if (!operation.operationId) {
        operation.operationId = buildOperationId(method, pathname);
      }

      operation.tags.forEach(tag => tagSet.add(tag));
    }
  }

  document.tags = [...tagSet]
    .sort((left, right) => left.localeCompare(right))
    .map(name => ({ name }));

  return document;
}

export function createSwaggerDocument(
  app: INestApplication,
  configService: ConfigService,
): OpenAPIObject {
  const appName = configService.get<string>('app.name', 'Blog System');
  const appDesc = configService.get<string>('app.desc', 'Personal Blog System API');

  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription(`${appDesc} - 自动生成的后端接口文档`)
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'bearer',
    )
    .build();

  const documentOptions: SwaggerDocumentOptions = {
    deepScanRoutes: true,
  };

  return enrichSwaggerDocument(
    SwaggerModule.createDocument(app, swaggerConfig, documentOptions),
  );
}

export function getSwaggerUiPath(): string {
  return SWAGGER_UI_PATH;
}

export function setupSwagger(app: INestApplication, document: OpenAPIObject): void {
  const customOptions: SwaggerCustomOptions = {
    customSiteTitle: 'Blog API Docs',
    explorer: true,
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    yamlDocumentUrl: SWAGGER_YAML_PATH,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  };

  SwaggerModule.setup(SWAGGER_UI_PATH, app, document, customOptions);
}
