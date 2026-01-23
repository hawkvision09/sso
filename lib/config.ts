export const SERVICE_ACCOUNT_EMAIL = process.env.MASTER_SERVICE_ACCOUNT_EMAIL;
export const SPREADSHEET_ID = process.env.MASTER_SPREADSHEET_ID;

const rawKey = process.env.MASTER_SERVICE_ACCOUNT_PRIVATE_KEY;
let processedKey = rawKey;

if (processedKey) {
  console.log('Key processing debug: Start length', processedKey.length);
  // 1. Remove spaces from start/end
  processedKey = processedKey.trim();
  
  // 2. Remove outer quotes if present (double or single)
  if ((processedKey.startsWith('"') && processedKey.endsWith('"')) || 
      (processedKey.startsWith("'") && processedKey.endsWith("'"))) {
    processedKey = processedKey.slice(1, -1);
    console.log('Key processing debug: Removed outer quotes');
  }

  // 3. Handle literal escaped newlines (common in Vercel/Env vars)
  // We allow multiple passes just in case they are doubly escaped
  if (processedKey.includes('\\n')) {
     processedKey = processedKey.replace(/\\n/g, '\n');
     console.log('Key processing debug: Replaced literal newlines');
  }
  
  console.log('Key processing debug: Final length', processedKey.length);
  console.log('Key processing debug: First 20 chars', processedKey.substring(0, 20));
  console.log('Key processing debug: Last 20 chars', processedKey.substring(processedKey.length - 20));
}

export const SERVICE_ACCOUNT_KEY = processedKey;
