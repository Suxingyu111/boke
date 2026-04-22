import * as Joi from 'joi';

const WEAK_SUPER_ADMIN_PASSWORDS = new Set([
  'admin123456',
  'change_me_admin_password_strong',
  'change_me_super_admin_password_strong',
]);

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('Blog System'),
  APP_DESC: Joi.string(),
  CORS_ORIGINS: Joi.string().allow('').optional(),
  CORS_ALLOW_REQUESTS_WITHOUT_ORIGIN: Joi.boolean().optional(),
  CORS_ALLOWED_METHODS: Joi.string().allow('').optional(),
  CORS_ALLOWED_HEADERS: Joi.string().allow('').optional(),
  CORS_EXPOSED_HEADERS: Joi.string().allow('').optional(),
  CORS_MAX_AGE_SECONDS: Joi.number().integer().min(0).default(600),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(120),
  CACHE_ENABLED: Joi.boolean().default(true),
  CACHE_KEY_NAMESPACE: Joi.string().default('blog-api-cache'),
  CACHE_NULL_TTL_SECONDS: Joi.number().integer().min(5).default(30),
  CACHE_LOCK_TTL_MS: Joi.number().integer().min(500).default(5000),
  CACHE_WAIT_TIMEOUT_MS: Joi.number().integer().min(100).default(1200),
  CACHE_TTL_JITTER_SECONDS: Joi.number().integer().min(0).default(30),
  TRUST_PROXY: Joi.boolean().optional(),
  SECURITY_HSTS_ENABLED: Joi.boolean().optional(),

  // Database
  DB_TYPE: Joi.string().valid('mysql').default('mysql'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),
  DB_POOL_SIZE: Joi.number().integer().min(1).default(10),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(12).invalid('change_me_redis_password_strong').required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  REDIS_DB: Joi.number().default(0),

  // JWT
  JWT_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(32)
      .invalid(
        'your_jwt_secret_key_change_in_production',
        'change_me_to_a_32_plus_char_random_secret',
      )
      .required(),
    otherwise: Joi.string().required(),
  }),
  JWT_EXPIRATION: Joi.string().default('7d'),
  AUTH_COOKIE_NAME: Joi.string().trim().min(3).default('blog_auth_token'),
  AUTH_COOKIE_SECURE: Joi.boolean().optional(),
  AUTH_COOKIE_SAME_SITE: Joi.string().valid('strict', 'lax', 'none').default('strict'),
  AUTH_STEP_UP_COOKIE_NAME: Joi.string().trim().min(3).default('blog_admin_step_up'),
  AUTH_STEP_UP_COOKIE_PATH: Joi.string().pattern(/^\//).default('/api/admin'),
  AUTH_STEP_UP_TTL: Joi.string().default('10m'),
  AUTH_STEP_UP_WINDOW_MS: Joi.number().integer().min(60000).default(600000),
  SECURITY_CSP_REPORT_ONLY: Joi.boolean().optional(),
  SECURITY_ALERT_RECIPIENTS: Joi.string().allow('').optional(),
  SECURITY_ALERT_COOLDOWN_SECONDS: Joi.number().integer().min(60).default(300),
  SECURITY_REFERRER_POLICY: Joi.string()
    .valid(
      'no-referrer',
      'no-referrer-when-downgrade',
      'origin',
      'origin-when-cross-origin',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
      'unsafe-url',
    )
    .default('strict-origin-when-cross-origin'),
  SECURITY_PERMISSIONS_POLICY: Joi.string().trim().min(1).optional(),
  CLIENT_URL: Joi.string().uri().default('http://localhost:5173'),

  // OAuth（可选）
  GITHUB_CLIENT_ID: Joi.string().allow('').optional().default(''),
  GITHUB_CLIENT_SECRET: Joi.string().allow('').optional().default(''),
  GITHUB_CALLBACK_URL: Joi.string().uri().allow('').optional().default(''),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional().default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional().default(''),
  GOOGLE_CALLBACK_URL: Joi.string().uri().allow('').optional().default(''),

  // Super admin（推荐使用 SUPER_ADMIN_*；保留 ADMIN_* 作为兼容别名）
  SUPER_ADMIN_USERNAME: Joi.string().trim().allow('').optional(),
  SUPER_ADMIN_PASSWORD: Joi.string().trim().allow('').optional(),
  SUPER_ADMIN_EMAIL: Joi.string().email().optional(),
  SUPER_ADMIN_NICKNAME: Joi.string().trim().max(100).optional(),
  ADMIN_USERNAME: Joi.string().trim().allow('').optional(),
  ADMIN_PASSWORD: Joi.string().trim().allow('').optional(),

  // Elasticsearch（可选）
  ES_NODE: Joi.string().uri().optional().default('http://localhost:9200'),
  ES_USERNAME: Joi.string().allow('').optional().default(''),
  ES_PASSWORD: Joi.string().allow('').optional().default(''),

  // SMTP 邮件（可选）
  SMTP_HOST: Joi.string().allow('').optional().default(''),
  SMTP_PORT: Joi.number().optional().default(587),
  SMTP_USER: Joi.string().allow('').optional().default(''),
  SMTP_PASS: Joi.string().allow('').optional().default(''),
  SMTP_FROM: Joi.string().allow('').optional().default(''),
  REGISTRATION_CODE_TTL_SECONDS: Joi.number().integer().min(60).default(600),
  REGISTRATION_CODE_COOLDOWN_SECONDS: Joi.number().integer().min(10).default(60),
  REGISTRATION_MAX_VERIFY_ATTEMPTS: Joi.number().integer().min(1).max(10).default(5),
  REGISTRATION_VERIFICATION_TOKEN_TTL: Joi.string().default('30m'),
  REGISTRATION_EXPOSE_DEBUG_CODE: Joi.boolean().optional(),
  SWAGGER_ENABLED: Joi.boolean().optional(),
})
  .custom((value, helpers) => {
    const cookieSecure =
      value.AUTH_COOKIE_SECURE !== undefined
        ? value.AUTH_COOKIE_SECURE
        : value.NODE_ENV === 'production';
    if (value.AUTH_COOKIE_SAME_SITE === 'none' && !cookieSecure) {
      return helpers.error('any.custom', {
        message: 'AUTH_COOKIE_SAME_SITE=none requires AUTH_COOKIE_SECURE=true',
      });
    }

    if (value.NODE_ENV !== 'production') {
      return value;
    }

    const adminUsername = (value.SUPER_ADMIN_USERNAME || value.ADMIN_USERNAME || '').trim();
    const adminPassword = (value.SUPER_ADMIN_PASSWORD || value.ADMIN_PASSWORD || '').trim();

    if (!adminUsername) {
      return helpers.error('any.custom', {
        message: 'SUPER_ADMIN_USERNAME (or ADMIN_USERNAME) is required in production',
      });
    }

    if (!adminPassword) {
      return helpers.error('any.custom', {
        message: 'SUPER_ADMIN_PASSWORD (or ADMIN_PASSWORD) is required in production',
      });
    }

    if (adminUsername.length < 3) {
      return helpers.error('any.custom', {
        message: 'SUPER_ADMIN_USERNAME (or ADMIN_USERNAME) must be at least 3 characters long',
      });
    }

    if (adminPassword.length < 12) {
      return helpers.error('any.custom', {
        message: 'SUPER_ADMIN_PASSWORD (or ADMIN_PASSWORD) must be at least 12 characters long',
      });
    }

    if (WEAK_SUPER_ADMIN_PASSWORDS.has(adminPassword)) {
      return helpers.error('any.custom', {
        message: 'SUPER_ADMIN_PASSWORD (or ADMIN_PASSWORD) cannot use the default placeholder password',
      });
    }

    return value;
  }, 'production super admin validation')
  .messages({
    'any.custom': '{{#message}}',
  });
