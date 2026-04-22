import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

interface BuildCorsOptionsInput {
  allowedOrigins: string[];
  allowRequestsWithoutOrigin: boolean;
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAgeSeconds: number;
}

export const buildCorsOptions = ({
  allowedOrigins,
  allowRequestsWithoutOrigin,
  allowedMethods,
  allowedHeaders,
  exposedHeaders,
  maxAgeSeconds,
}: BuildCorsOptionsInput): CorsOptions => {
  const allowedOriginSet = new Set(allowedOrigins.map(origin => origin.trim()).filter(Boolean));

  return {
    credentials: true,
    methods: allowedMethods,
    allowedHeaders,
    exposedHeaders,
    maxAge: maxAgeSeconds,
    optionsSuccessStatus: 204,
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ): void => {
      if (!origin) {
        callback(null, allowRequestsWithoutOrigin);
        return;
      }

      if (allowedOriginSet.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
  };
};
