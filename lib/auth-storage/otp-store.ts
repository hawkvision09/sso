export interface OtpStoreRecord {
  email: string;
  otp_code: string;
  expires_at: string;
  created_at: string;
}

export interface OtpStore {
  storeOTP(email: string, otp: string, expiresAtIso: string): Promise<void>;
  verifyOTP(email: string, otp: string): Promise<boolean>;
  cleanupExpiredOTPs(): Promise<void>;
}
