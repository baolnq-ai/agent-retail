import { createHash, randomBytes } from 'node:crypto';

export const sessionCookieName = 'retail_session';
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const prefix = `${name}=`;
  return header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

export function buildSessionCookie(token: string, nodeEnv: string): string {
  return [
    `${sessionCookieName}=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${sessionMaxAgeSeconds}`,
    nodeEnv === 'production' ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

export function buildExpiredSessionCookie(): string {
  return `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
