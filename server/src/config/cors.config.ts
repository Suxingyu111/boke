import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

interface BuildCorsOptionsInput {
  allowedOrigins: string[];
  allowRequestsWithoutOrigin: boolean;
}

export const buildCorsOptions = ({
  allowedOrigins,
  allowRequestsWithoutOrigin,
}: BuildCorsOptionsInput): CorsOptions => {
  const allowedOriginSet = new Set(
    allowedOrigins.map(origin => origin.trim()).filter(Boolean),
  );

  return {
    credentials: true,
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