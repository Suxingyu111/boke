import { buildCorsOptions } from '../src/config/cors.config';

describe('buildCorsOptions', () => {
  it('应只允许白名单来源携带凭证访问', () => {
    const options = buildCorsOptions({
      allowedOrigins: ['http://localhost:5173'],
      allowRequestsWithoutOrigin: true,
      allowedMethods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Accept', 'Content-Type', 'X-CSRF-Token'],
      exposedHeaders: ['Content-Disposition', 'X-Cache'],
      maxAgeSeconds: 600,
    });

    expect(options.credentials).toBe(true);
    expect(options.methods).toEqual(['GET', 'POST', 'OPTIONS']);
    expect(options.allowedHeaders).toEqual(['Accept', 'Content-Type', 'X-CSRF-Token']);
    expect(options.exposedHeaders).toEqual(['Content-Disposition', 'X-Cache']);
    expect(options.maxAge).toBe(600);
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
      allowedMethods: ['GET'],
      allowedHeaders: ['Accept'],
      exposedHeaders: [],
      maxAgeSeconds: 0,
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
