import type { Request } from 'express';

export interface ClientMeta {
  ipAddress: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
}

export function parseClientMeta(req: Request): ClientMeta {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress = (
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : Array.isArray(forwarded) ? forwarded[0] : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  ).replace(/^::ffff:/, '');

  const ua = (req.headers['user-agent'] as string) || '';

  // Simple, fast heuristic UA parsing
  let browser = 'Unknown Browser';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/')) browser = 'Google Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Postman')) browser = 'Postman';

  let os = 'Unknown OS';
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  let device = 'Desktop';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
    device = 'Mobile';
  } else if (ua.includes('iPad') || ua.includes('Tablet')) {
    device = 'Tablet';
  }

  return {
    ipAddress,
    userAgent: ua.slice(0, 500),
    browser,
    os,
    device,
  };
}
