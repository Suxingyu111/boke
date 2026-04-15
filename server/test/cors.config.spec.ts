import { buildCorsOptions } from '../src/config/cors.config';

describe('buildCorsOptions', () => {
  it('应只允许白名单来源携带凭证访问', () => {
    const options = buildCorsOptions({
      allowedOrigins: ['http://localhost:5173'],
      allowRequestsWithoutOrigin: true,
    });

    expect(options.credentials).toBe(true);
    expect(options.origin).toEqual(expect.any(Function));

    const originDelegate = options.origin as (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => void;

    const allowed = jest.fn();
    originDelegate('http://localhost:5173', allowed);
    expect(allowed).toHaveBeenCalledWith(null, true);

    const denied = jest.fn();
    originDelegate('https://evil.example.com', denied);
    expect(denied).toHaveBeenCalledWith(null, false);
  });

  it('应支持按环境关闭无 Origin 请求放行', () => {
    const options = buildCorsOptions({
      allowedOrigins: ['http://localhost:5173'],
      allowRequestsWithoutOrigin: false,
    });

    const originDelegate = options.origin as (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => void;

    const denied = jest.fn();
    originDelegate(undefined, denied);
    expect(denied).toHaveBeenCalledWith(null, false);
  });
});