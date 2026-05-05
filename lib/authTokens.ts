import { createHmac, timingSafeEqual } from 'crypto';
import { JWT_SECRET } from '@/lib/config';
import {
  appendRow,
  deleteRowsByColumn,
  findRowByColumn,
  findRowIndexByColumn,
  initializeSheets,
  SHEET_NAMES,
  updateRow,
} from '@/lib/sheets';
import type { DeviceContext } from '@/lib/device';

export interface AuthTokenRecord {
  user_id: string;
  session_id: string;
  token_hash: string;
  status: 'active' | 'revoked';
  issued_at: string;
  expires_at: string;
  device_id: string;
  ip_address: string;
  device_type: string;
  os_name: string;
  os_version: string;
  browser_name: string;
  browser_version: string;
  user_agent: string;
  metadata_hash: string;
  created_at: string;
  updated_at: string;
}

let authTokenSheetsChecked = false;

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
    token_hash: row.token_hash || '',
    status: (row.status || 'active') as 'active' | 'revoked',
    issued_at: row.issued_at || row.created_at || '',
    expires_at: row.expires_at || '',
    device_id: row.device_id || '',
    ip_address: row.ip_address || '',
    device_type: row.device_type || '',
    os_name: row.os_name || '',
    os_version: row.os_version || '',
    browser_name: row.browser_name || '',
    browser_version: row.browser_version || '',
    user_agent: row.user_agent || '',
    metadata_hash: row.metadata_hash || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

function toRow(record: AuthTokenRecord): any[] {
  return [
    record.user_id,
    record.session_id,
    record.token_hash,
    record.status,
    record.issued_at,
    record.expires_at,
    record.device_id,
    record.ip_address,
    record.device_type,
    record.os_name,
    record.os_version,
    record.browser_name,
    record.browser_version,
    record.user_agent,
    record.metadata_hash,
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

function isWeakMetadataValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === '' || normalized === 'unknown' || normalized === 'n/a' || normalized === 'na';
}

function preferExistingMetadata(existingValue: string, incomingValue: string): string {
  if (isWeakMetadataValue(incomingValue) && !isWeakMetadataValue(existingValue)) {
    return existingValue;
  }

  return incomingValue || existingValue || '';
}

export function hashAuthToken(token: string): string {
  return createHmac('sha256', JWT_SECRET).update(token).digest('hex');
}

export async function getActiveAuthTokenByUserId(userId: string): Promise<AuthTokenRecord | null> {
  await ensureAuthTokenSheetsReady();
  const row = await findRowByColumn(SHEET_NAMES.AUTH_TOKENS, 'user_id', userId);
  return row ? mapAuthTokenRow(row) : null;
}

export async function persistAuthTokenRecord(params: {
  userId: string;
  sessionId: string;
  token: string;
  expiresAt: string;
  device: DeviceContext;
}): Promise<AuthTokenRecord> {
  await ensureAuthTokenSheetsReady();

  const now = nowIso();
  const existing = await getActiveAuthTokenByUserId(params.userId);
  const existingTokenHash = existing?.token_hash || '';
  const record: AuthTokenRecord = {
    user_id: params.userId,
    session_id: params.sessionId,
    token_hash: hashAuthToken(params.token),
    status: 'active',
    issued_at: now,
    expires_at: params.expiresAt,
    device_id: preferExistingMetadata(existing?.device_id || '', params.device.deviceId),
    ip_address: preferExistingMetadata(existing?.ip_address || '', params.device.ipAddress),
    device_type: preferExistingMetadata(existing?.device_type || '', params.device.deviceType),
    os_name: preferExistingMetadata(existing?.os_name || '', params.device.osName),
    os_version: preferExistingMetadata(existing?.os_version || '', params.device.osVersion),
    browser_name: preferExistingMetadata(existing?.browser_name || '', params.device.browserName),
    browser_version: preferExistingMetadata(existing?.browser_version || '', params.device.browserVersion),
    user_agent: preferExistingMetadata(existing?.user_agent || '', params.device.userAgent),
    metadata_hash: preferExistingMetadata(existing?.metadata_hash || '', params.device.metadataHash),
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.AUTH_TOKENS, 'user_id', params.userId);
  if (rowIndex === -1) {
    await appendRow(SHEET_NAMES.AUTH_TOKENS, toRow(record));
    return record;
  }

  if (existingTokenHash && existingTokenHash === record.token_hash) {
    record.created_at = existing.created_at || record.created_at;
  }

  await updateRow(SHEET_NAMES.AUTH_TOKENS, `A${rowIndex + 1}`, toRow(record));
  return record;
}

export async function revokeAuthTokensByUserId(userId: string): Promise<void> {
  await ensureAuthTokenSheetsReady();
  await deleteRowsByColumn(SHEET_NAMES.AUTH_TOKENS, 'user_id', userId);
}

export async function revokeAuthTokensBySessionId(sessionId: string): Promise<void> {
  await ensureAuthTokenSheetsReady();
  await deleteRowsByColumn(SHEET_NAMES.AUTH_TOKENS, 'session_id', sessionId);
}

export async function validateAuthTokenAgainstStore(params: {
  userId: string;
  sessionId: string;
  token: string;
}): Promise<AuthTokenRecord | null> {
  await ensureAuthTokenSheetsReady();

  const record = await getActiveAuthTokenByUserId(params.userId);
  if (!record || record.status !== 'active') return null;
  if (record.session_id !== params.sessionId) return null;
  if (record.expires_at && new Date(record.expires_at).getTime() <= Date.now()) return null;

  const expectedHash = hashAuthToken(params.token);
  if (!safeEqual(record.token_hash, expectedHash)) return null;

  return record;
}