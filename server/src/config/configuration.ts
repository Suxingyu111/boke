type CookieSameSiteValue = 'strict' | 'lax' | 'none';

const DEFAULT_CORS_METHODS = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'];
const DEFAULT_CORS_ALLOWED_HEADERS = [
  'Accept',
  'Authorization',
  'Content-Type',
  'Origin',
  'X-CSRF-Token',
  'X-Requested-With',
];
const DEFAULT_CORS_EXPOSED_HEADERS = ['Content-Disposition', 'X-Cache'];
const DEFAULT_PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
};

const parseStringList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value || value.trim().length === 0) {
    return [...fallback];
  }

  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

const parseCookieSameSite = (
  value: string | undefined,
  fallback: CookieSameSiteValue,
): CookieSameSiteValue => {
  const normalizedValue = value?.trim().toLowerCase();
  if (normalizedValue === 'strict' || normalizedValue === 'lax' || normalizedValue === 'none') {
    return normalizedValue;
  }

  return fallback;
};

const parseCorsOrigins = (value: string | undefined, nodeEnv: string): string[] => {
  if (value && value.trim().length > 0) {
    return value
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
  }

  if (nodeEnv === 'production') {
    return [];
  }

  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:4173',
  ];
};

export const configuration = (): {
  nodeEnv: string;
  port: number;
  app: { name: string; desc: string };
  throttle: {
    ttl: number;
    limit: number;
  };
  cache: {
    enabled: boolean;
    keyNamespace: string;
    nullTtlSeconds: number;
    lockTtlMs: number;
    waitTimeoutMs: number;
    ttlJitterSeconds: number;
  };
  security: {
    trustProxy: boolean;
    hstsEnabled: boolean;
    cookieSecure: boolean;
    cookieSameSite: CookieSameSiteValue;
    referrerPolicy: string;
    permissionsPolicy: string;
    cspReportOnly: boolean;
  };
  database: {
    type: string;
    host: string | undefined;
    port: number;
    username: string | undefined;
    password: string | undefined;
    database: string | undefined;
    synchronize: boolean;
    logging: boolean;
  };
  redis: {
    host: string | undefined;
    port: number;
    password: string;
    db: number;
  };
  jwt: {
    secret: string | undefined;
    expiresIn: string;
  };
  auth: {
    cookieName: string;
    stepUpCookieName: string;
    stepUpCookiePath: string;
    stepUpTtl: string;
    stepUpWindowMs: number;
  };
  oauth: {
    clientUrl: string;
    github: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
    google: {
      clientId: string;
      clientSecret: string;
      callbackUrl: string;
    };
  };
  superAdmin: {
    username: string | undefined;
    password: string | undefined;
    email: string | undefined;
    nickname: string | undefined;
  };
  cors: {
    origins: string[];
    allowRequestsWithoutOrigin: boolean;
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAgeSeconds: number;
  };
  elasticsearch: {
    node: string;
    username: string;
    password: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  registration: {
    codeTtlSeconds: number;
    codeCooldownSeconds: number;
    maxVerifyAttempts: number;
    verificationTokenTtl: string;
    exposeDebugCode: boolean;
  };
} => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 3000),
  app: {
    name: process.env.APP_NAME || 'Blog System',
    desc: process.env.APP_DESC || 'Personal Blog System API',
  },
  throttle: {
    ttl: parseNumber(process.env.THROTTLE_TTL, 60000),
    limit: parseNumber(process.env.THROTTLE_LIMIT, 120),
  },
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    keyNamespace: process.env.CACHE_KEY_NAMESPACE || 'blog-api-cache',
    nullTtlSeconds: parseNumber(process.env.CACHE_NULL_TTL_SECONDS, 30),
    lockTtlMs: parseNumber(process.env.CACHE_LOCK_TTL_MS, 5000),
    waitTimeoutMs: parseNumber(process.env.CACHE_WAIT_TIMEOUT_MS, 1200),
    ttlJitterSeconds: parseNumber(process.env.CACHE_TTL_JITTER_SECONDS, 30),
  },
  security: {
    trustProxy:
      process.env.TRUST_PROXY !== undefined
        ? process.env.TRUST_PROXY === 'true'
        : (process.env.NODE_ENV || 'development') === 'production',
    hstsEnabled:
      process.env.SECURITY_HSTS_ENABLED !== undefined
        ? process.env.SECURITY_HSTS_ENABLED === 'true'
        : (process.env.NODE_ENV || 'development') === 'production',
    cookieSecure: parseBoolean(
      process.env.AUTH_COOKIE_SECURE,
      (process.env.NODE_ENV || 'development') === 'production',
    ),
    cookieSameSite: parseCookieSameSite(process.env.AUTH_COOKIE_SAME_SITE, 'strict'),
    referrerPolicy:
      process.env.SECURITY_REFERRER_POLICY || 'strict-origin-when-cross-origin',
    permissionsPolicy:
      process.env.SECURITY_PERMISSIONS_POLICY || DEFAULT_PERMISSIONS_POLICY,
    cspReportOnly: parseBoolean(
      process.env.SECURITY_CSP_REPORT_ONLY,
      (process.env.NODE_ENV || 'development') !== 'production',
    ),
  },
  database: {
    type: process.env.DB_TYPE || 'mysql',
    host: process.env.DB_HOST,
    port: parseNumber(process.env.DB_PORT, 3306),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || '',
    db: parseNumber(process.env.REDIS_DB, 0),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '7d',
  },
  auth: {
    cookieName: process.env.AUTH_COOKIE_NAME || 'blog_auth_token',
    stepUpCookieName: process.env.AUTH_STEP_UP_COOKIE_NAME || 'blog_admin_step_up',
    stepUpCookiePath: process.env.AUTH_STEP_UP_COOKIE_PATH || '/api/admin',
    stepUpTtl: process.env.AUTH_STEP_UP_TTL || '10m',
    stepUpWindowMs: parseNumber(process.env.AUTH_STEP_UP_WINDOW_MS, 10 * 60 * 1000),
  },
  oauth: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackUrl: process.env.GITHUB_CALLBACK_URL || '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || '',
    },
  },
  superAdmin: {
    username: process.env.SUPER_ADMIN_USERNAME || process.env.ADMIN_USERNAME,
    password: process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
    email: process.env.SUPER_ADMIN_EMAIL,
    nickname: process.env.SUPER_ADMIN_NICKNAME,
  },
  cors: {
    origins: parseCorsOrigins(process.env.CORS_ORIGINS, process.env.NODE_ENV || 'development'),
    allowRequestsWithoutOrigin: parseBoolean(
      process.env.CORS_ALLOW_REQUESTS_WITHOUT_ORIGIN,
      (process.env.NODE_ENV || 'development') !== 'production',
    ),
    allowedMethods: parseStringList(process.env.CORS_ALLOWED_METHODS, DEFAULT_CORS_METHODS),
    allowedHeaders: parseStringList(
      process.env.CORS_ALLOWED_HEADERS,
      DEFAULT_CORS_ALLOWED_HEADERS,
    ),
    exposedHeaders: parseStringList(
      process.env.CORS_EXPOSED_HEADERS,
      DEFAULT_CORS_EXPOSED_HEADERS,
    ),
    maxAgeSeconds: parseNumber(process.env.CORS_MAX_AGE_SECONDS, 600),
  },
  elasticsearch: {
    node: process.env.ES_NODE || 'http://localhost:9200',
    username: process.env.ES_USERNAME || '',
    password: process.env.ES_PASSWORD || '',
  },
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@blog.local',
  },
  registration: {
    codeTtlSeconds: parseNumber(process.env.REGISTRATION_CODE_TTL_SECONDS, 600),
    codeCooldownSeconds: parseNumber(process.env.REGISTRATION_CODE_COOLDOWN_SECONDS, 60),
    maxVerifyAttempts: parseNumber(process.env.REGISTRATION_MAX_VERIFY_ATTEMPTS, 5),
    verificationTokenTtl: process.env.REGISTRATION_VERIFICATION_TOKEN_TTL || '30m',
    exposeDebugCode:
      process.env.REGISTRATION_EXPOSE_DEBUG_CODE !== undefined
        ? process.env.REGISTRATION_EXPOSE_DEBUG_CODE === 'true'
        : (process.env.NODE_ENV || 'development') !== 'production',
  },
});
