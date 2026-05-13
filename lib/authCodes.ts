import { getAuthCodeStore } from '@/lib/auth-storage';

/**
 * Generate a new authorization code.
 */
export async function createAuthCode(
  userId: string,
  serviceId: string,
  redirectUri: string
): Promise<string> {
  return getAuthCodeStore().createAuthCode(userId, serviceId, redirectUri);
}

/**
 * Validate and consume an authorization code
 * Deletes the code immediately after successful validation
 */
export async function validateAndConsumeAuthCode(
  code: string,
  serviceId: string,
  redirectUri: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  return getAuthCodeStore().validateAndConsumeAuthCode(code, serviceId, redirectUri);
}
