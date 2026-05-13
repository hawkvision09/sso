import { APP_CONFIG } from '@/lib/config';
import { getRedisClient } from '@/lib/cache/redis';
import type { OtpStore, OtpStoreRecord } from './otp-store';

function otpKey(email: string): string {
  return `auth:otp:${email.toLowerCase()}`;
}

export class RedisOtpStore implements OtpStore {
  async storeOTP(email: string, otp: string, expiresAtIso: string): Promise<void> {
    const redis = getRedisClient();
    const key = otpKey(email);
    const expiresInSeconds = APP_CONFIG.otpExpiryMinutes * 60;

    const payload: OtpStoreRecord = {
      email,
      otp_code: otp,
      expires_at: expiresAtIso,
      created_at: new Date().toISOString(),
    };

    await redis.set(key, payload, { ex: expiresInSeconds });
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const redis = getRedisClient();
    const key = otpKey(email);
    const otpRecord = await redis.get<OtpStoreRecord>(key);

    if (!otpRecord) {
      return false;
    }

    if (otpRecord.otp_code !== otp) {
      return false;
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await redis.del(key);
      return false;
    }

    await redis.del(key);
    return true;
  }

  async cleanupExpiredOTPs(): Promise<void> {
    // Expired OTPs auto-evict via Redis TTL.
  }
}
