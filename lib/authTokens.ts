import { createHmac, timingSafeEqual } from 'crypto';
import { AUTH_CORE_BACKEND, CORE_AUTH_DB_NAME, JWT_SECRET } from '@/lib/config';
import {
  appendRow,
  deleteRowsByColumn,
  findRowByColumn,
  findRowIndexByColumn,
  initializeSheets,
  SHEET_NAMES,
  updateRow,
} from '@/lib/sheets';
import { getMongoDb } from '@/lib/db/mongo';

export interface AuthTokenRecord {
  user_id: string;
  session_id: string;
  token_value: string;
  token_hash: string;
  status: 'active' | 'revoked';
  issued_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

let authTokenSheetsChecked = false;
let mongoIndexesReady = false;

async function getAuthTokenCollection() {
  const db = await getMongoDb(CORE_AUTH_DB_NAME);
  const collection = db.collection<AuthTokenRecord>('auth_tokens');

  if (!mongoIndexesReady) {
    await Promise.all([
      collection.createIndex({ user_id: 1 }, { unique: true }),
      collection.createIndex({ session_id: 1 }),
      collection.createIndex({ expires_at: 1 }),
    ]);
    mongoIndexesReady = true;
  }

  return collection;
}

function nowIso() {
  return new Date().toISOString();
}

async function ensureAuthTokenSheetsReady(): Promise<void> {
  if (authTokenSheetsChecked) return;

  try {
    await findRowByColumn(SHEET_NAMES.AUTH_TOKENS, 'user_id', '__probe__');
  } catch {
    await initializeSheets();
  }

  authTokenSheetsChecked = true;
}

function mapAuthTokenRow(row: Record<string, string>): AuthTokenRecord {
  return {
    user_id: row.user_id,
    session_id: row.session_id || '',
    token_value: row.token_value || '',
    token_hash: row.token_hash || '',
    status: (row.status || 'active') as 'active' | 'revoked',
    issued_at: row.issued_at || row.created_at || '',
    expires_at: row.expires_at || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

function toRow(record: AuthTokenRecord): any[] {
  return [
    record.user_id,
    record.session_id,
    record.token_value,
    record.token_hash,
    record.status,
    record.issued_at,
    record.expires_at,
    record.created_at,
    record.updated_at,
  ];
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a || '');
  const right = Buffer.from(b || '');

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

export function hashAuthToken(token: string): string {
  return createHmac('sha256', JWT_SECRET).update(token).digest('hex');
}

export async function getActiveAuthTokenByUserId(userId: string): Promise<AuthTokenRecord | null> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const collection = await getAuthTokenCollection();
    return await collection.findOne({ user_id: userId, status: 'active' });
  }

  await ensureAuthTokenSheetsReady();
  const row = await findRowByColumn(SHEET_NAMES.AUTH_TOKENS, 'user_id', userId);
  return row ? mapAuthTokenRow(row) : null;
}

export async function getReusableAuthToken(params: {
  userId: string;
  sessionId: string;
}): Promise<string | null> {
  const record = await getActiveAuthTokenByUserId(params.userId);

  if (!record || record.status !== 'active') return null;
  if (record.session_id !== params.sessionId) return null;
  if (!record.token_value) return null;
  if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) return null;

  return record.token_value;
}

export async function persistAuthTokenRecord(params: {
  userId: string;
  sessionId: string;
  token: string;
  expiresAt: string;
}): Promise<AuthTokenRecord> {
  const now = nowIso();
  const existing = await getActiveAuthTokenByUserId(params.userId);
  const existingTokenHash = existing?.token_hash || '';
  const record: AuthTokenRecord = {
    user_id: params.userId,
    session_id: params.sessionId,
    token_value: params.token,
    token_hash: hashAuthToken(params.token),
    status: 'active',
    issued_at: now,
    expires_at: params.expiresAt,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  if (AUTH_CORE_BACKEND === 'mongo') {
    const collection = await getAuthTokenCollection();
    if (existingTokenHash && existingTokenHash === record.token_hash) {
      record.created_at = existing?.created_at || record.created_at;
    }

    await collection.replaceOne(
      { user_id: params.userId },
      record,
      { upsert: true }
    );
    return record;
  }

  await ensureAuthTokenSheetsReady();

  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.AUTH_TOKENS, 'user_id', params.userId);
  if (rowIndex === -1) {
    await appendRow(SHEET_NAMES.AUTH_TOKENS, toRow(record));
    return record;
  }

  if (existingTokenHash && existingTokenHash === record.token_hash) {
    record.created_at = existing?.created_at || record.created_at;
  }

  await updateRow(SHEET_NAMES.AUTH_TOKENS, `A${rowIndex + 1}`, toRow(record));
  return record;
}

export async function revokeAuthTokensByUserId(userId: string): Promise<void> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const collection = await getAuthTokenCollection();
    await collection.deleteMany({ user_id: userId });
    return;
  }

  await ensureAuthTokenSheetsReady();
  await deleteRowsByColumn(SHEET_NAMES.AUTH_TOKENS, 'user_id', userId);
}

export async function revokeAuthTokensBySessionId(sessionId: string): Promise<void> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const collection = await getAuthTokenCollection();
    await collection.deleteMany({ session_id: sessionId });
    return;
  }

  await ensureAuthTokenSheetsReady();
  await deleteRowsByColumn(SHEET_NAMES.AUTH_TOKENS, 'session_id', sessionId);
}

export async function validateAuthTokenAgainstStore(params: {
  userId: string;
  sessionId: string;
  token: string;
}): Promise<AuthTokenRecord | null> {
  const record = await getActiveAuthTokenByUserId(params.userId);
  if (!record || record.status !== 'active') return null;
  if (record.session_id !== params.sessionId) return null;
  if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) return null;

  const expectedHash = hashAuthToken(params.token);
  if (!safeEqual(record.token_hash, expectedHash)) return null;

  return record;
}
