import { v4 as uuidv4 } from 'uuid';
import { APP_CONFIG } from '@/lib/config';
import { getRedisClient } from '@/lib/cache/redis';
import type { AuthCodeStore, ValidateAuthCodeResult } from './auth-code-store';

interface RedisAuthCodeRecord {
  code: string;
  user_id: string;
  service_id: string;
  redirect_uri: string;
  expires_at: string;
  created_at: string;
}

function authCodeKey(code: string): string {
  return `auth:code:${code}`;
}

function authCodeIndexKey(userId: string, serviceId: string): string {
  return `auth:code:index:${userId}:${serviceId}`;
}

export class RedisAuthCodeStore implements AuthCodeStore {
  async createAuthCode(userId: string, serviceId: string, redirectUri: string): Promise<string> {
    const redis = getRedisClient();
    const indexKey = authCodeIndexKey(userId, serviceId);
    const existingCodes = (await redis.smembers<string[]>(indexKey)) || [];

    if (existingCodes.length > 0) {
      for (const existingCode of existingCodes) {
        await redis.del(authCodeKey(existingCode));
      }
      await redis.del(indexKey);
    }

    const code = uuidv4();
    const now = new Date();
    const expiresInSeconds = APP_CONFIG.authCodeExpirySeconds;
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000).toISOString();

    const payload: RedisAuthCodeRecord = {
      code,
      user_id: userId,
      service_id: serviceId,
      redirect_uri: redirectUri,
      expires_at: expiresAt,
      created_at: now.toISOString(),
    };

    await redis.set(authCodeKey(code), payload, { ex: expiresInSeconds });
    await redis.sadd(indexKey, code);
    await redis.expire(indexKey, expiresInSeconds);

    return code;
  }

  async validateAndConsumeAuthCode(code: string, serviceId: string, redirectUri: string): Promise<ValidateAuthCodeResult> {
    const redis = getRedisClient();
    const key = authCodeKey(code);
    const authCode = await redis.get<RedisAuthCodeRecord>(key);

    if (!authCode) {
      return { valid: false, error: 'Invalid authorization code' };
    }

    if (new Date(authCode.expires_at) < new Date()) {
      await redis.del(key);
      await redis.srem(authCodeIndexKey(authCode.user_id, authCode.service_id), code);
      return { valid: false, error: 'Authorization code expired' };
    }

    if (authCode.service_id !== serviceId) {
      return { valid: false, error: 'Service ID mismatch' };
    }

    if (authCode.redirect_uri !== redirectUri) {
      return { valid: false, error: 'Redirect URI mismatch' };
    }

    await redis.del(key);
    await redis.srem(authCodeIndexKey(authCode.user_id, authCode.service_id), code);

    return { valid: true, userId: authCode.user_id };
  }
}
