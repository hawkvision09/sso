// Configuration module - centralized environment variable access

export const SPREADSHEET_ID = process.env.SPREADSHEET_ID ?? '';
export const SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL ?? '';

const rawKey = process.env.SERVICE_ACCOUNT_KEY;
let processedKey = rawKey;

if (processedKey) {
  console.log('Key processing debug: Start length', processedKey.length);
  // 1. Remove spaces from start/end
  processedKey = processedKey.trim();
  
  // 2. Remove outer quotes if present (double or single)
  if ((processedKey.startsWith('"') && processedKey.endsWith('"')) || 
      (processedKey.startsWith("'") && processedKey.endsWith("'"))) {
    processedKey = processedKey.slice(1, -1);
    console.log('Key processing debug: Removed outer quotes');
  }

  // 3. Handle literal escaped newlines (common in Vercel/Env vars)
  // We allow multiple passes just in case they are doubly escaped
  if (processedKey.includes('\\n')) {
     processedKey = processedKey.replace(/\\n/g, '\n');
     console.log('Key processing debug: Replaced literal newlines');
  }
  
  console.log('Key processing debug: Final length', processedKey.length);
  console.log('Key processing debug: First 20 chars', processedKey.substring(0, 20));
  console.log('Key processing debug: Last 20 chars', processedKey.substring(processedKey.length - 20));
}

export const SERVICE_ACCOUNT_KEY = processedKey;

export const JWT_SECRET = process.env.JWT_SECRET || '';

export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
};

export const APP_CONFIG = {
  name: process.env.APP_NAME || 'HawkVision SSO',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  sessionDurationDays: parseInt(process.env.SESSION_DURATION_DAYS || '30'),
  otpExpiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '10'),
  authCodeExpirySeconds: parseInt(process.env.AUTH_CODE_EXPIRY_SECONDS || '60'),
};

// Validate critical configuration on startup
export function validateConfig() {
  const required = {
    SPREADSHEET_ID,
    SERVICE_ACCOUNT_EMAIL,
    SERVICE_ACCOUNT_KEY,
    JWT_SECRET,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
