import { AUTH_CODE_BACKEND, AUTH_OTP_BACKEND } from '@/lib/config';
import { RedisAuthCodeStore } from './redis-auth-code-store';
import { RedisOtpStore } from './redis-otp-store';
import { SheetsAuthCodeStore } from './sheets-auth-code-store';
import { SheetsOtpStore } from './sheets-otp-store';
import type { AuthCodeStore } from './auth-code-store';
import type { OtpStore } from './otp-store';

let otpStore: OtpStore | null = null;
let authCodeStore: AuthCodeStore | null = null;

export function getOtpStore(): OtpStore {
  if (otpStore) {
    return otpStore;
  }

  otpStore = AUTH_OTP_BACKEND === 'redis' ? new RedisOtpStore() : new SheetsOtpStore();
  return otpStore;
}

export function getAuthCodeStore(): AuthCodeStore {
  if (authCodeStore) {
    return authCodeStore;
  }

  authCodeStore = AUTH_CODE_BACKEND === 'redis' ? new RedisAuthCodeStore() : new SheetsAuthCodeStore();
  return authCodeStore;
}
