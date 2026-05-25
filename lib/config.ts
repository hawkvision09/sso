// Configuration module - centralized environment variable access
// NOTE: Google Sheets configuration has been deprecated. SSO now uses MongoDB + Redis.

export const JWT_SECRET = process.env.JWT_SECRET || '';

export const MONGODB_URI = process.env.MONGODB_URI || '';
export const MONGODB_DEFAULT_DB = process.env.MONGODB_DEFAULT_DB || 'sso';
export const CORE_AUTH_DB_NAME = process.env.CORE_AUTH_DB_NAME || 'core-auth';
export const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
export const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

export type AuthCoreBackend = 'sheets' | 'mongo';
const rawCoreBackend = (process.env.AUTH_CORE_BACKEND || 'sheets').toLowerCase();
export const AUTH_CORE_BACKEND: AuthCoreBackend = rawCoreBackend === 'mongo' ? 'mongo' : 'sheets';

export type AuthOtpBackend = 'sheets' | 'redis';
const rawOtpBackend = (process.env.AUTH_OTP_BACKEND || 'sheets').toLowerCase();
export const AUTH_OTP_BACKEND: AuthOtpBackend = rawOtpBackend === 'redis' ? 'redis' : 'sheets';

export type AuthCodeBackend = 'sheets' | 'redis';
const rawAuthCodeBackend = (process.env.AUTH_CODE_BACKEND || 'sheets').toLowerCase();
export const AUTH_CODE_BACKEND: AuthCodeBackend = rawAuthCodeBackend === 'redis' ? 'redis' : 'sheets';

export const RESEND_CONFIG = {
  apiKey: process.env.RESEND_API_KEY || '',
  fromEmail: process.env.RESEND_FROM_EMAIL || '',
  fromName: process.env.RESEND_FROM_NAME || process.env.APP_NAME || 'Woxin',
};

export const APP_CONFIG = {
  name: process.env.APP_NAME || 'Woxin',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  sessionDurationDays: parseInt(process.env.SESSION_DURATION_DAYS || '30'),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
  authCodeExpirySeconds: parseInt(process.env.AUTH_CODE_EXPIRY_SECONDS || '60'),
};

// Validate critical configuration on startup
export function validateConfig() {
  const required = {
    JWT_SECRET,
    RESEND_API_KEY: RESEND_CONFIG.apiKey,
    RESEND_FROM_EMAIL: RESEND_CONFIG.fromEmail,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function normalizeAppEnv(value: string | undefined): 'dev' | 'prd' {
  const normalized = (value || '').trim().toLowerCase();

  if (normalized === 'prd' || normalized === 'prod' || normalized === 'production') {
    return 'prd';
  }

  if (normalized === 'dev' || normalized === 'development') {
    return 'dev';
  }

  return 'dev';
}

// Environment: explicit APP_ENV wins; otherwise production runtime defaults to 'prd'.
export const APP_ENV = normalizeAppEnv(
  process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'prd' : 'dev')
);

export function dbNameWithEnv(baseName: string): string {
  return `${APP_ENV}-${baseName}`;
}
