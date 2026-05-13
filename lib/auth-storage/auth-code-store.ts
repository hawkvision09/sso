export interface ValidateAuthCodeResult {
  valid: boolean;
  userId?: string;
  error?: string;
}

export interface AuthCodeStore {
  createAuthCode(userId: string, serviceId: string, redirectUri: string): Promise<string>;
  validateAndConsumeAuthCode(code: string, serviceId: string, redirectUri: string): Promise<ValidateAuthCodeResult>;
}
