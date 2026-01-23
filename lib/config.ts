export const SERVICE_ACCOUNT_EMAIL = process.env.MASTER_SERVICE_ACCOUNT_EMAIL;
export const SPREADSHEET_ID = process.env.MASTER_SPREADSHEET_ID;

const privateKey = process.env.MASTER_SERVICE_ACCOUNT_PRIVATE_KEY;
export const SERVICE_ACCOUNT_KEY = privateKey
  ? privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
  : undefined;
