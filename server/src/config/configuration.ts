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
  admin: {
    username: string | undefined;
    password: string | undefined;
  };
  cors: {
    origins: string[];
    allowRequestsWithoutOrigin: boolean;
  };
} => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 3000),
  app: {
    name: process.env.APP_NAME || 'Blog System',
    desc: process.env.APP_DESC || 'Personal Blog System API',
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
  admin: {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  },
  cors: {
    origins: parseCorsOrigins(process.env.CORS_ORIGINS, process.env.NODE_ENV || 'development'),
    allowRequestsWithoutOrigin: (process.env.NODE_ENV || 'development') !== 'production',
  },
});
