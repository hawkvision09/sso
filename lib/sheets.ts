import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

import { SERVICE_ACCOUNT_EMAIL, SERVICE_ACCOUNT_KEY, SPREADSHEET_ID } from '@/lib/config';

// Removed process.env.MASTER_SPREADSHEET_ID check as we use config now, 
// but we keep the checks for robustness or fallback if you want, 
// but here we simply replace the logic.

export const getAuthClient = async () => {
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_KEY) {
    throw new Error('Missing Service Account Credentials in config');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT_EMAIL,
      private_key: SERVICE_ACCOUNT_KEY,
    },
    scopes: SCOPES,
  });

  return auth.getClient();
};

export const getSheets = async () => {
  const auth = await getAuthClient();
  // @ts-ignore
  return google.sheets({ version: 'v4', auth });
};

export const SHEET_NAMES = {
  USERS: 'Users',
  SESSIONS: 'Sessions',
  SERVICES: 'Services',
  ENTITLEMENTS: 'Entitlements',
  OTPS: 'OTPs',
  AUTH_CODES: 'AuthCodes',
};

const HEADERS = {
  [SHEET_NAMES.USERS]: ['user_id', 'email', 'role', 'created_at', 'status'],
  [SHEET_NAMES.SESSIONS]: ['session_id', 'user_id', 'device_info', 'created_at', 'expires_at', 'last_active_at', 'ip_address'],
  [SHEET_NAMES.SERVICES]: ['service_id', 'name', 'description', 'redirect_url', 'free_tier_enabled'],
  [SHEET_NAMES.ENTITLEMENTS]: ['entitlement_id', 'user_id', 'service_id', 'tier_level', 'valid_until'],
  [SHEET_NAMES.OTPS]: ['email', 'otp_code', 'expires_at', 'created_at'],
  [SHEET_NAMES.AUTH_CODES]: ['code', 'user_id', 'service_id', 'expires_at', 'used'],
};

export const initializeSheets = async () => {
  const sheets = await getSheets();
  
  try {
    const { data } = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingSheets = data.sheets?.map(s => s.properties?.title) || [];

    const requests = [];

    // Create missing sheets
    for (const sheetName of Object.values(SHEET_NAMES)) {
      if (!existingSheets.includes(sheetName)) {
        requests.push({
          addSheet: {
            properties: { title: sheetName },
          },
        });
      }
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests },
      });
      console.log('Created missing sheets.');
    }

    // Check headers
    // Note: This matches headers simply by rewriting the first row. A bit bruteforce but safe for now.
    for (const [sheetName, headers] of Object.entries(HEADERS)) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
            values: [headers]
        }
      });
    }

  } catch (error) {
    console.error('Error initializing sheets:', error);
    throw error;
  }
};

// Data Access Helpers

export const appendRow = async (sheetName: string, row: any[]) => {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row],
    },
  });
};

export const getRows = async (sheetName: string) => {
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName, // Fetches all data
  });
  
  const rows = response.data.values || [];
  const headers = rows[0];
  const data = rows.slice(1);
  
  return data.map(row => {
    const obj: any = {};
    headers.forEach((header: string, index: number) => {
      obj[header] = row[index];
    });
    return obj;
  });
};

export const updateRow = async (sheetName: string, range: string, row: any[]) => {
    const sheets = await getSheets();
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!${range}`,
        valueInputOption: 'RAW',
        requestBody: {
            values: [row]
        }
    });
}

// Simple lookup helper
export const findRowByColumn = async (sheetName: string, columnName: string, value: string) => {
    const rows = await getRows(sheetName);
    return rows.find(r => r[columnName] === value);
}

// Find multiple rows
export const findRowsByColumn = async (sheetName: string, columnName: string, value: string) => {
    const rows = await getRows(sheetName);
    return rows.filter(r => r[columnName] === value);
}

// Find row index (1-based because Sheets is 1-based)
export const findRowIndexByColumn = async (sheetName: string, columnName: string, value: string) => {
    const sheets = await getSheets();
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return -1;

    const headers = rows[0];
    const colIndex = headers.indexOf(columnName);
    
    if (colIndex === -1) return -1;

    // Search through rows (start from index 1 to skip header)
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][colIndex] === value) {
            return i + 1; // Return 1-based index
        }
    }
    return -1;
}
