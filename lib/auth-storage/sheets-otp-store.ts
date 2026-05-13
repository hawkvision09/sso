import {
  SHEET_NAMES,
  appendRow,
  findRowByColumn,
  deleteRowsByColumn,
  getRows,
} from '@/lib/sheets';
import type { OtpStore } from './otp-store';

export class SheetsOtpStore implements OtpStore {
  async storeOTP(email: string, otp: string, expiresAtIso: string): Promise<void> {
    await deleteRowsByColumn(SHEET_NAMES.OTPS, 'email', email);

    await appendRow(SHEET_NAMES.OTPS, [
      email,
      otp,
      expiresAtIso,
      new Date().toISOString(),
    ]);
  }

  async verifyOTP(email: string, otp: string): Promise<boolean> {
    const otpRecord = await findRowByColumn(SHEET_NAMES.OTPS, 'email', email);

    if (!otpRecord) {
      return false;
    }

    if (otpRecord.otp_code !== otp) {
      return false;
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await deleteRowsByColumn(SHEET_NAMES.OTPS, 'email', email);
      return false;
    }

    await deleteRowsByColumn(SHEET_NAMES.OTPS, 'email', email);
    return true;
  }

  async cleanupExpiredOTPs(): Promise<void> {
    const otps = await getRows(SHEET_NAMES.OTPS);

    const now = new Date();
    for (const otp of otps) {
      if (new Date(otp.expires_at) < now) {
        await deleteRowsByColumn(SHEET_NAMES.OTPS, 'email', otp.email);
      }
    }
  }
}
