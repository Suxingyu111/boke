import { Request } from 'express';

export const extractClientIp = (request: Request): string | null => {
  const forwardedForHeader = request.headers['x-forwarded-for'];
  const forwardedForValue = Array.isArray(forwardedForHeader)
    ? forwardedForHeader[0]
    : forwardedForHeader;
  const forwardedIp = typeof forwardedForValue === 'string' ? forwardedForValue.split(',')[0]?.trim() : '';
  const ipAddress = forwardedIp || (typeof request.ip === 'string' ? request.ip.trim() : '');
  return ipAddress ? ipAddress.slice(0, 45) : null;
};

export const extractUserAgent = (request: Request): string | null => {
  const headerValue = request.headers['user-agent'];
  const userAgent = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const normalizedValue = typeof userAgent === 'string' ? userAgent.trim() : '';
  return normalizedValue ? normalizedValue.slice(0, 500) : null;
};
