import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('Blog System'),
  APP_DESC: Joi.string(),
  CORS_ORIGINS: Joi.string().allow('').optional(),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(120),

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
  CLIENT_URL: Joi.string().uri().default('http://localhost:5173'),

  // OAuth（可选）
  GITHUB_CLIENT_ID: Joi.string().allow('').optional().default(''),
  GITHUB_CLIENT_SECRET: Joi.string().allow('').optional().default(''),
  GITHUB_CALLBACK_URL: Joi.string().uri().allow('').optional().default(''),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional().default(''),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional().default(''),
  GOOGLE_CALLBACK_URL: Joi.string().uri().allow('').optional().default(''),

  // Admin
  ADMIN_USERNAME: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().trim().min(3).required(),
    otherwise: Joi.string().optional(),
  }),
  ADMIN_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(12).invalid('admin123456', 'change_me_admin_password_strong').required(),
    otherwise: Joi.string().optional(),
  }),

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
});
