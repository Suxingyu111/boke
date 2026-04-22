import { validationSchema } from '../src/config/validation';

describe('validationSchema', () => {
  const baseEnv = {
    NODE_ENV: 'development',
    PORT: 3000,
    APP_NAME: 'Blog System',
    DB_HOST: 'localhost',
    DB_PORT: 3306,
    DB_USERNAME: 'root',
    DB_PASSWORD: 'root123456789',
    DB_DATABASE: 'blog_system',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: '',
    JWT_SECRET: 'test-jwt-secret',
  };

  it('应仅允许 mysql 作为当前项目数据库类型', () => {
    const { error } = validationSchema.validate({
      ...baseEnv,
      DB_TYPE: 'postgres',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('DB_TYPE');
  });

  it('生产环境应拒绝示例占位密钥和弱管理员密码', () => {
    const { error } = validationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'production',
      REDIS_PASSWORD: 'prod_redis_password',
      JWT_SECRET: 'change_me_to_a_32_plus_char_random_secret',
      SUPER_ADMIN_USERNAME: 'rootmaster',
      SUPER_ADMIN_PASSWORD: 'change_me_super_admin_password_strong',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('JWT_SECRET');
  });

  it('生产环境应要求管理员账号和 Redis 密码', () => {
    const { error } = validationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'production',
      REDIS_PASSWORD: '',
      JWT_SECRET: 'prod_jwt_secret_value_with_more_than_32_chars',
      SUPER_ADMIN_PASSWORD: 'prod_super_admin_password',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('REDIS_PASSWORD');
  });

  it('生产环境在 Redis 密码合法时应要求管理员账号', () => {
    const { error } = validationSchema.validate({
      ...baseEnv,
      NODE_ENV: 'production',
      REDIS_PASSWORD: 'prod_redis_password',
      JWT_SECRET: 'prod_jwt_secret_value_with_more_than_32_chars',
      SUPER_ADMIN_PASSWORD: 'prod_super_admin_password',
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('SUPER_ADMIN_USERNAME');
  });

  it('开发环境应忽略未启用的旧 ADMIN_* 弱口令配置', () => {
    const { error } = validationSchema.validate({
      ...baseEnv,
      ADMIN_USERNAME: 'ad',
      ADMIN_PASSWORD: 'admin',
    });

    expect(error).toBeUndefined();
  });

  it('AUTH_COOKIE_SAME_SITE=none 时必须同时启用安全 Cookie', () => {
    const { error } = validationSchema.validate({
      ...baseEnv,
      AUTH_COOKIE_SAME_SITE: 'none',
      AUTH_COOKIE_SECURE: false,
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('AUTH_COOKIE_SAME_SITE=none');
  });
});
