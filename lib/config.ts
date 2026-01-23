export const SERVICE_ACCOUNT_EMAIL = process.env.MASTER_SERVICE_ACCOUNT_EMAIL;
export const SPREADSHEET_ID = process.env.MASTER_SPREADSHEET_ID;
export const SERVICE_ACCOUNT_KEY = process.env.MASTER_SERVICE_ACCOUNT_PRIVATE_KEY
  ? process.env.MASTER_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;
