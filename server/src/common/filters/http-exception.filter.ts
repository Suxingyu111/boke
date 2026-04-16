import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const INTERNAL_ERROR_MESSAGE = '服务器内部错误，请稍后重试';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = INTERNAL_ERROR_MESSAGE;
    let errors: string | string[] | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const objectResponse = exceptionResponse as {
          message?: string | string[];
          error?: string | string[];
        };
        if (status < HttpStatus.INTERNAL_SERVER_ERROR) {
          if (typeof objectResponse.message === 'string') {
            message = objectResponse.message;
          } else if (Array.isArray(objectResponse.message)) {
            message = objectResponse.message.join(', ');
          } else {
            message = exception.message;
          }
          errors = objectResponse.error ?? null;
        }
      } else {
        if (status < HttpStatus.INTERNAL_SERVER_ERROR) {
          message = exceptionResponse as string;
        }
      }
    }

    const logMessage =
      status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? `${request.method} ${request.url} -> ${status} InternalError`
        : `${request.method} ${request.url} -> ${status} ${message}`;

    this.logger.error(logMessage, exception instanceof Error ? exception.stack : '');

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }
}
