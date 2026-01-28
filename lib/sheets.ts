import { google } from 'googleapis';
import { SERVICE_ACCOUNT_EMAIL, SERVICE_ACCOUNT_KEY, SPREADSHEET_ID } from '@/lib/config';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// EXACT same pattern as working coupons app
export const getAuthClient = () => {
  if (!SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_KEY) {
    throw new Error('Missing Service Account Credentials in config');
  }

  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: SERVICE_ACCOUNT_KEY,
    scopes: SCOPES,
  });

  return auth;
};

export const getSheets = () => {
  const auth = getAuthClient();
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
  const sheets = getSheets();
  
  try {
    const { data } = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const existingSheets = data.sheets?.map(s => s.properties?.title) || [];
    const validSheetNames = Object.values(SHEET_NAMES);

    const requests = [];

    // Delete extra sheets that aren't part of the SSO system
    for (const sheet of data.sheets || []) {
      const sheetName = sheet.properties?.title;
      const sheetId = sheet.properties?.sheetId;
      
      if (sheetName && sheetId !== undefined && !validSheetNames.includes(sheetName)) {
        console.log(`Deleting extra sheet: ${sheetName}`);
        requests.push({
          deleteSheet: {
            sheetId: sheetId,
          },
        });
      }
    }

    // Create missing sheets
    for (const sheetName of validSheetNames) {
      if (!existingSheets.includes(sheetName)) {
        console.log(`Creating missing sheet: ${sheetName}`);
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
      console.log('Sheet structure updated.');
    }

    // Initialize headers for all sheets
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

    console.log('Sheets initialized successfully');
  } catch (error) {
    console.error('Error initializing sheets:', error);
    throw error;
  }
};

// Data Access Helpers

export const appendRow = async (sheetName: string, row: any[]) => {
  const sheets = getSheets();
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
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) return [];
  
  const headers = rows[0];
  const data = rows.slice(1);
  
  return data.map(row => {
    const obj: any = {};
    headers.forEach((header: string, index: number) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
};

export const updateRow = async (sheetName: string, range: string, row: any[]) => {
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${range}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [row]
    }
  });
};

export const deleteRow = async (sheetName: string, rowIndex: number) => {
  const sheets = getSheets();
  
  // Get sheet ID
  const { data } = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  
  const sheet = data.sheets?.find(s => s.properties?.title === sheetName);
  if (!sheet || !sheet.properties?.sheetId) {
    throw new Error(`Sheet ${sheetName} not found`);
  }
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          }
        }
      }]
    }
  });
};

// Simple lookup helper
export const findRowByColumn = async (sheetName: string, columnName: string, value: string) => {
  const rows = await getRows(sheetName);
  return rows.find(r => r[columnName] === value);
};

// Find multiple rows
export const findRowsByColumn = async (sheetName: string, columnName: string, value: string) => {
  const rows = await getRows(sheetName);
  return rows.filter(r => r[columnName] === value);
};

// Find row index (0-based for data rows, but we return 1-based for Sheets API)
export const findRowIndexByColumn = async (sheetName: string, columnName: string, value: string) => {
  const sheets = getSheets();
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
      return i; // Return 0-based index (header is at 0, first data row is at 1)
    }
  }
  return -1;
};

// Delete rows by column value
export const deleteRowsByColumn = async (sheetName: string, columnName: string, value: string) => {
  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return;

  const headers = rows[0];
  const colIndex = headers.indexOf(columnName);
  
  if (colIndex === -1) return;

  // Find all matching row indices (in reverse order to delete from bottom to top)
  const indicesToDelete: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colIndex] === value) {
      indicesToDelete.push(i);
    }
  }

  // Delete rows in reverse order
  for (const rowIndex of indicesToDelete.reverse()) {
    await deleteRow(sheetName, rowIndex);
  }
};
