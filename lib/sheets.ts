import { getMongoDb } from '@/lib/db/mongo';

export const SHEET_NAMES = {
  USERS: 'Users',
  SESSIONS: 'Sessions',
  AUTH_TOKENS: 'AuthTokens',
  SERVICES: 'Services',
  ENTITLEMENTS: 'Entitlements',
  OTPS: 'OTPs',
  AUTH_CODES: 'AuthCodes',
  USER_STORAGE: 'UserStorage',
  USER_STORAGE_APPS: 'UserStorageApps',
  PROVIDER_CONFIG: 'ProviderConfig',
};

const HEADERS = {
  [SHEET_NAMES.USERS]: ['user_id', 'email', 'role', 'created_at', 'status'],
  [SHEET_NAMES.SESSIONS]: ['session_id', 'user_id', 'created_at', 'expires_at', 'last_active_at', 'last_login_at', 'devices_json'],
  [SHEET_NAMES.AUTH_TOKENS]: ['user_id', 'session_id', 'token_value', 'token_hash', 'status', 'issued_at', 'expires_at', 'created_at', 'updated_at'],
  [SHEET_NAMES.SERVICES]: ['service_id', 'name', 'description', 'redirect_url', 'free_tier_enabled', 'image_url'],
  [SHEET_NAMES.ENTITLEMENTS]: ['entitlement_id', 'user_id', 'service_id', 'tier_level', 'valid_until'],
  [SHEET_NAMES.OTPS]: ['email', 'otp_code', 'expires_at', 'created_at'],
  [SHEET_NAMES.AUTH_CODES]: ['code', 'user_id', 'service_id', 'expires_at', 'used'],
  [SHEET_NAMES.USER_STORAGE]: ['user_id', 'provider', 'access_token_enc', 'refresh_token_enc', 'token_expires_at', 'root_folder_id', 'status', 'created_at', 'updated_at'],
  [SHEET_NAMES.USER_STORAGE_APPS]: ['user_id', 'app_name', 'container_id', 'schema_version', 'created_at', 'updated_at'],
  [SHEET_NAMES.PROVIDER_CONFIG]: ['provider', 'enabled', 'client_id', 'client_secret', 'redirect_uri', 'scopes', 'root_folder', 'updated_at'],
};

// Map sheet names to Mongo collections. This adapter preserves the original
// `sheets.ts` function signatures but reads/writes from Mongo so we can
// remove any dependency on Google Sheets.

const SHEET_TO_COLLECTION: Record<string, string> = {
  [SHEET_NAMES.USERS]: 'users',
  [SHEET_NAMES.SESSIONS]: 'sessions',
  [SHEET_NAMES.AUTH_TOKENS]: 'auth_tokens',
  [SHEET_NAMES.SERVICES]: 'services',
  [SHEET_NAMES.ENTITLEMENTS]: 'entitlements',
  [SHEET_NAMES.USER_STORAGE]: 'user_storage',
  [SHEET_NAMES.USER_STORAGE_APPS]: 'user_storage_apps',
  [SHEET_NAMES.PROVIDER_CONFIG]: 'provider_config',
};

function rowArrayToDoc(sheetName: string, row: any[]): Record<string, any> {
  const headers = HEADERS[sheetName] || [];
  const doc: Record<string, any> = {};
  headers.forEach((h, i) => {
    doc[h] = row[i] ?? '';
  });
  return doc;
}

function docToRowObject(doc: any, sheetName: string) {
  const headers = HEADERS[sheetName] || [];
  const out: Record<string, any> = {};
  headers.forEach((h) => {
    out[h] = doc?.[h] ?? '';
  });
  if (doc && doc._id) out._id = String(doc._id);
  return out;
}

async function getCollectionForSheet(sheetName: string) {
  const collectionName = SHEET_TO_COLLECTION[sheetName];
  if (!collectionName) throw new Error(`Unsupported sheet: ${sheetName}`);
  const db = await getMongoDb();
  return db.collection(collectionName);
}

export const initializeSheets = async () => {
  const db = await getMongoDb();
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true }).catch(() => {}),
    db.collection('users').createIndex({ user_id: 1 }, { unique: true }).catch(() => {}),
    db.collection('sessions').createIndex({ session_id: 1 }, { unique: true }).catch(() => {}),
    db.collection('sessions').createIndex({ user_id: 1 }, { unique: true }).catch(() => {}),
    db.collection('sessions').createIndex({ expires_at: 1 }).catch(() => {}),
    db.collection('auth_tokens').createIndex({ user_id: 1 }, { unique: true }).catch(() => {}),
    db.collection('services').createIndex({ service_id: 1 }, { unique: true }).catch(() => {}),
    db.collection('entitlements').createIndex({ entitlement_id: 1 }, { unique: true }).catch(() => {}),
    db.collection('user_storage').createIndex({ user_id: 1 }, { unique: true }).catch(() => {}),
    db.collection('user_storage_apps').createIndex({ user_id: 1, app_name: 1 }, { unique: true }).catch(() => {}),
    db.collection('provider_config').createIndex({ provider: 1 }, { unique: true }).catch(() => {}),
  ]);
};

export const appendRow = async (sheetName: string, row: any[]) => {
  const collection = await getCollectionForSheet(sheetName);
  const doc = rowArrayToDoc(sheetName, row);
  await collection.insertOne(doc);
};

export const getRows = async (sheetName: string) => {
  const collection = await getCollectionForSheet(sheetName);
  const docs = await collection.find({}).sort({ _id: 1 }).toArray();
  return docs.map((d) => docToRowObject(d, sheetName));
};

export const updateRow = async (sheetName: string, range: string, row: any[]) => {
  const match = range.match(/A(\d+)/i);
  if (!match) throw new Error('Unsupported range format');
  const index = parseInt(match[1], 10) - 1;
  const collection = await getCollectionForSheet(sheetName);
  const docs = await collection.find({}).sort({ _id: 1 }).toArray();
  if (index < 0 || index >= docs.length) throw new Error('Row index out of range');
  const targetId = docs[index]._id;
  const doc = rowArrayToDoc(sheetName, row);
  await collection.updateOne({ _id: targetId }, { $set: doc });
};

export const deleteRow = async (sheetName: string, rowIndex: number) => {
  const collection = await getCollectionForSheet(sheetName);
  const docs = await collection.find({}).sort({ _id: 1 }).toArray();
  if (rowIndex < 0 || rowIndex >= docs.length) return;
  const targetId = docs[rowIndex]._id;
  await collection.deleteOne({ _id: targetId });
};

export const findRowByColumn = async (sheetName: string, columnName: string, value: string) => {
  const collection = await getCollectionForSheet(sheetName);
  const doc = await collection.findOne({ [columnName]: value });
  return doc ? docToRowObject(doc, sheetName) : null;
};

export const findRowsByColumn = async (sheetName: string, columnName: string, value: string) => {
  const collection = await getCollectionForSheet(sheetName);
  const docs = await collection.find({ [columnName]: value }).toArray();
  return docs.map((d) => docToRowObject(d, sheetName));
};

export const findRowIndexByColumn = async (sheetName: string, columnName: string, value: string) => {
  const collection = await getCollectionForSheet(sheetName);
  const docs = await collection.find({}).sort({ _id: 1 }).toArray();
  for (let i = 0; i < docs.length; i++) {
    if (String(docs[i][columnName]) === String(value)) return i;
  }
  return -1;
};

export const deleteRowsByColumn = async (sheetName: string, columnName: string, value: string) => {
  const collection = await getCollectionForSheet(sheetName);
  await collection.deleteMany({ [columnName]: value });
};
