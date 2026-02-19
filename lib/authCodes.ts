import { appendRow, getRows, updateRow, findRowIndexByColumn } from './sheets';
import { v4 as uuidv4 } from 'uuid';

const SHEET_NAME = 'AuthCodes';

export interface AuthCode {
  code: string;
  user_id: string;
  service_id: string;
  redirect_uri: string;
  expires_at: string;
  used: string;
  created_at: string;
}

/**
 * Generate a new authorization code
 * Deletes ALL existing codes for the same user+service combination (used or unused)
 */
export async function createAuthCode(
  userId: string,
  serviceId: string,
  redirectUri: string
): Promise<string> {
  // First, delete ALL existing codes for this user+service (used or unused)
  await deleteAuthCodesByUserAndService(userId, serviceId);
  
  // Now create the new code
  const code = uuidv4(); // Generate unique code
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

  await appendRow(SHEET_NAME, [
    code,
    userId,
    serviceId,
    redirectUri,
    expiresAt.toISOString(),
    'false', // not used yet
    now.toISOString()
  ]);

  return code;
}

/**
 * Delete ALL auth codes for a specific user+service combination
 */
async function deleteAuthCodesByUserAndService(userId: string, serviceId: string): Promise<void> {
  const { getSheets } = await import('./sheets');
  const { SPREADSHEET_ID } = await import('./config');
  
  const sheets = getSheets();
  
  // Get raw rows from sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAME,
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return; // No data rows (only header or empty)

  // Find all row indices for this user+service (in reverse order for safe deletion)
  const indicesToDelete: number[] = [];
  
  for (let i = 1; i < rows.length; i++) { // Start from 1 to skip header
    const row = rows[i];
    const rowUserId = row[1];    // user_id column
    const rowServiceId = row[2]; // service_id column
    
    // Match user_id AND service_id
    if (rowUserId === userId && rowServiceId === serviceId) {
      indicesToDelete.push(i); // Store 0-based index (where header is 0)
    }
  }
  
  // Delete rows in reverse order to maintain correct indices
  const { deleteRow } = await import('./sheets');
  for (let i = indicesToDelete.length - 1; i >= 0; i--) {
    await deleteRow(SHEET_NAME, indicesToDelete[i]);
  }
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
  try {
    const { getSheets } = await import('./sheets');
    const { SPREADSHEET_ID } = await import('./config');
    
    const sheets = getSheets();
    
    // Get raw rows from sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_NAME,
    });

    const rows = response.data.values || [];
    
    if (rows.length <= 1) {
      return { valid: false, error: 'Invalid authorization code' };
    }

    // Find the code (skip header row)
    let foundIndex = -1;
    let authCode: AuthCode | null = null;
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === code) {
        foundIndex = i;
        authCode = {
          code: rows[i][0],
          user_id: rows[i][1],
          service_id: rows[i][2],
          redirect_uri: rows[i][3],
          expires_at: rows[i][4],
          used: rows[i][5],
          created_at: rows[i][6],
        };
        break;
      }
    }
    
    if (foundIndex === -1 || !authCode) {
      return { valid: false, error: 'Invalid authorization code' };
    }

    // Check if already used
    if (authCode.used === 'true') {
      return { valid: false, error: 'Authorization code already used' };
    }

    // Check if expired
    const expiresAt = new Date(authCode.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, error: 'Authorization code expired' };
    }

    // Validate service_id
    if (authCode.service_id !== serviceId) {
      return { valid: false, error: 'Service ID mismatch' };
    }

    // Validate redirect_uri
    if (authCode.redirect_uri !== redirectUri) {
      return { valid: false, error: 'Redirect URI mismatch' };
    }

    // ✅ DELETE the code immediately after successful validation
    const { deleteRow } = await import('./sheets');
    await deleteRow(SHEET_NAME, foundIndex);

    return { valid: true, userId: authCode.user_id };
  } catch (error) {
    console.error('Error validating auth code:', error);
    return { valid: false, error: 'Internal server error' };
  }
}
