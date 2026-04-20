const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
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
  admin: {
    username: string | undefined;
    password: string | undefined;
  };
  cors: {
    origins: string[];
    allowRequestsWithoutOrigin: boolean;
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
  admin: {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  },
  cors: {
    origins: parseCorsOrigins(process.env.CORS_ORIGINS, process.env.NODE_ENV || 'development'),
    allowRequestsWithoutOrigin: (process.env.NODE_ENV || 'development') !== 'production',
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
