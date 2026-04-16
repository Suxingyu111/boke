import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const createHost = (json: jest.Mock, status: jest.Mock): ArgumentsHost =>
  ({
    switchToHttp: () => ({
      getResponse: () => ({
        status,
        json,
      }),
      getRequest: () => ({
        method: 'GET',
        url: '/api/articles',
      }),
    }),
  }) as ArgumentsHost;

describe('HttpExceptionFilter', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('不应向客户端暴露未知异常的原始错误信息', () => {
    process.env.NODE_ENV = 'production';

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const filter = new HttpExceptionFilter();

    filter.catch(
      new Error('database connection refused: root@localhost'),
      createHost(json, status),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '服务器内部错误，请稍后重试',
        errors: null,
      }),
    );
  });

  it('应保留 HttpException 的业务错误信息', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const filter = new HttpExceptionFilter();

    filter.catch(new HttpException('参数错误', HttpStatus.BAD_REQUEST), createHost(json, status));

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '参数错误',
      }),
    );
  });
});
