import type { HelmetOptions } from 'helmet';

export type ReferrerPolicyValue =
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export const DEFAULT_PERMISSIONS_POLICY = [
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

interface BuildHelmetOptionsInput {
  allowedOrigins: string[];
  hstsEnabled: boolean;
  referrerPolicy: ReferrerPolicyValue;
  cspReportOnly: boolean;
}

const normalizeOrigins = (allowedOrigins: string[]): string[] => {
  return [...new Set(allowedOrigins.map(origin => origin.trim()).filter(Boolean))];
};

export const buildContentSecurityPolicyDirectives = (
  allowedOrigins: string[],
) => {
  const connectSrc = ["'self'", ...normalizeOrigins(allowedOrigins)];

  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    connectSrc,
    fontSrc: ["'self'", 'data:', 'https:'],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
    manifestSrc: ["'self'"],
    mediaSrc: ["'self'", 'blob:'],
    objectSrc: ["'none'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    workerSrc: ["'self'", 'blob:'],
  };
};

export const buildHelmetOptions = ({
  allowedOrigins,
  hstsEnabled,
  referrerPolicy,
  cspReportOnly,
}: BuildHelmetOptionsInput): HelmetOptions => {
  return {
    hsts: hstsEnabled,
    referrerPolicy: {
      policy: referrerPolicy,
    },
    contentSecurityPolicy: {
      useDefaults: false,
      directives: buildContentSecurityPolicyDirectives(allowedOrigins),
      reportOnly: cspReportOnly,
    },
  };
};
