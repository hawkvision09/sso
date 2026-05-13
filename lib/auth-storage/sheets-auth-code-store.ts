import { v4 as uuidv4 } from 'uuid';
import {
  appendRow,
  getRows,
  deleteRow,
} from '@/lib/sheets';
import type { AuthCodeStore, ValidateAuthCodeResult } from './auth-code-store';

const SHEET_NAME = 'AuthCodes';

interface AuthCodeRecord {
  code: string;
  user_id: string;
  service_id: string;
  redirect_uri: string;
  expires_at: string;
  used: string;
  created_at: string;
}

async function deleteAuthCodesByUserAndService(userId: string, serviceId: string): Promise<void> {
  const rows = await getRows(SHEET_NAME);
  const matchingCodes = rows.filter((row) => row.user_id === userId && row.service_id === serviceId);

  for (const row of matchingCodes) {
    const allRows = await getRows(SHEET_NAME);
    const index = allRows.findIndex((x) => x.code === row.code);
    if (index !== -1) {
      await deleteRow(SHEET_NAME, index + 1);
    }
  }
}

export class SheetsAuthCodeStore implements AuthCodeStore {
  async createAuthCode(userId: string, serviceId: string, redirectUri: string): Promise<string> {
    await deleteAuthCodesByUserAndService(userId, serviceId);

    const code = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    await appendRow(SHEET_NAME, [
      code,
      userId,
      serviceId,
      redirectUri,
      expiresAt.toISOString(),
      'false',
      now.toISOString(),
    ]);

    return code;
  }

  async validateAndConsumeAuthCode(code: string, serviceId: string, redirectUri: string): Promise<ValidateAuthCodeResult> {
    const rows = await getRows(SHEET_NAME);
    const foundIndex = rows.findIndex((row) => row.code === code);
    const authCode = foundIndex === -1 ? null : (rows[foundIndex] as AuthCodeRecord);

    if (!authCode) {
      return { valid: false, error: 'Invalid authorization code' };
    }

    if (authCode.used === 'true') {
      return { valid: false, error: 'Authorization code already used' };
    }

    if (new Date(authCode.expires_at) < new Date()) {
      await deleteRow(SHEET_NAME, foundIndex + 1);
      return { valid: false, error: 'Authorization code expired' };
    }

    if (authCode.service_id !== serviceId) {
      return { valid: false, error: 'Service ID mismatch' };
    }

    if (authCode.redirect_uri !== redirectUri) {
      return { valid: false, error: 'Redirect URI mismatch' };
    }

    await deleteRow(SHEET_NAME, foundIndex + 1);
    return { valid: true, userId: authCode.user_id };
  }
}
