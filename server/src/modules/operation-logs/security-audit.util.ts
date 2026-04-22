const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REDACTED_KEYWORDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'credential',
  'session',
  'otp',
  'code',
  'signature',
  'buffer',
];
const MASKED_KEYWORDS = ['email', 'phone', 'mobile', 'contact', 'account'];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const shouldRedact = (key: string): boolean => {
  const normalizedKey = key.toLowerCase();
  return REDACTED_KEYWORDS.some(keyword => normalizedKey.includes(keyword));
};

const shouldMask = (key: string): boolean => {
  const normalizedKey = key.toLowerCase();
  return MASKED_KEYWORDS.some(keyword => normalizedKey.includes(keyword));
};

const maskEmail = (value: string): string => {
  const [localPart, domain] = value.split('@');
  if (!localPart || !domain) {
    return value;
  }

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  const hidden = '*'.repeat(Math.max(localPart.length - visible.length, 2));
  return `${visible}${hidden}@${domain}`;
};

const maskPhone = (value: string): string => {
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length <= 4) {
    return '*'.repeat(digits.length || 1);
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
  }

  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
};

export const maskAuditIdentifier = (value: string): string => {
  if (!value) {
    return value;
  }

  if (EMAIL_PATTERN.test(value)) {
    return maskEmail(value);
  }

  const digits = value.replace(/[^\d]/g, '');
  if (digits.length >= 7) {
    return maskPhone(value);
  }

  if (value.length <= 2) {
    return '*'.repeat(value.length);
  }

  return `${value.slice(0, 1)}***${value.slice(-1)}`;
};

const sanitizeScalar = (key: string, value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  if (shouldRedact(key)) {
    return '[REDACTED]';
  }

  if (shouldMask(key)) {
    return maskAuditIdentifier(value);
  }

  if (value.length > 2048) {
    return `${value.slice(0, 2048)}...[TRUNCATED]`;
  }

  return value;
};

const sanitizeObject = (value: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  for (const [key, currentValue] of Object.entries(value)) {
    if (shouldRedact(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (Array.isArray(currentValue)) {
      sanitized[key] = currentValue.map(item =>
        isPlainObject(item) ? sanitizeObject(item) : sanitizeScalar(key, item),
      );
      continue;
    }

    if (isPlainObject(currentValue)) {
      sanitized[key] = sanitizeObject(currentValue);
      continue;
    }

    sanitized[key] = sanitizeScalar(key, currentValue);
  }

  return sanitized;
};

export const sanitizeAuditPayload = (
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null => {
  if (!value || !isPlainObject(value)) {
    return null;
  }

  const sanitized = sanitizeObject(value);
  return Object.keys(sanitized).length > 0 ? sanitized : null;
};
