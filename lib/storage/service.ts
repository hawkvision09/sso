import {
  appendRow,
  getSheets,
  deleteRowsByColumn,
  findRowByColumn,
  findRowsByColumn,
  findRowIndexByColumn,
  initializeSheets,
  SHEET_NAMES,
  updateRow,
} from '@/lib/sheets';
import { SPREADSHEET_ID } from '@/lib/config';
import { google } from 'googleapis';
import { decryptText, encryptText } from '@/lib/storage/crypto';
import { getGoogleProviderConfig } from '@/lib/storage/providerConfig';
import { getProvider } from '@/lib/storage/providers';
import type {
  StorageProviderName,
  UserStorageAppMapRecord,
  UserStorageRecord,
} from '@/lib/storage/types';

function nowIso() {
  return new Date().toISOString();
}

function isTokenExpired(expiresAt: string): boolean {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return true;

  // Refresh 2 minutes before expiry to avoid race-time failures.
  return Date.now() >= (expiry - 2 * 60 * 1000);
}

async function updateUserStorageRecord(record: UserStorageRecord): Promise<void> {
  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.USER_STORAGE, 'user_id', record.user_id);
  if (rowIndex === -1) {
    throw new Error('Failed to update existing storage row');
  }

  await updateRow(SHEET_NAMES.USER_STORAGE, `A${rowIndex + 1}`, [
    record.user_id,
    record.provider,
    record.access_token_enc,
    record.refresh_token_enc,
    record.token_expires_at,
    record.root_folder_id,
    record.status,
    record.created_at,
    record.updated_at,
  ]);
}

async function refreshGoogleAccessToken(record: UserStorageRecord): Promise<UserStorageRecord> {
  if (!record.refresh_token_enc) {
    throw new Error('Storage token expired and no refresh token is available. Reconnect storage in SSO.');
  }

  const refreshToken = decryptText(record.refresh_token_enc);
  const cfg = await getGoogleProviderConfig();
  const client = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
  client.setCredentials({ refresh_token: refreshToken });

  const refreshed = await client.refreshAccessToken();
  const newAccessToken = refreshed.credentials.access_token;

  if (!newAccessToken) {
    throw new Error('Failed to refresh Google access token. Reconnect storage in SSO.');
  }

  const nextExpiry = refreshed.credentials.expiry_date
    ? new Date(refreshed.credentials.expiry_date).toISOString()
    : new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const updated: UserStorageRecord = {
    ...record,
    access_token_enc: encryptText(newAccessToken),
    token_expires_at: nextExpiry,
    updated_at: nowIso(),
  };

  await updateUserStorageRecord(updated);
  return updated;
}

let storageSheetsChecked = false;

async function ensureStorageSheetsReady(): Promise<void> {
  if (storageSheetsChecked) return;

  try {
    // Probe storage sheets; if missing, Google Sheets API throws parse-range error.
    await findRowsByColumn(SHEET_NAMES.USER_STORAGE, 'user_id', '__probe__');
    await findRowsByColumn(SHEET_NAMES.USER_STORAGE_APPS, 'user_id', '__probe__');
  } catch {
    await initializeSheets();
  }

  storageSheetsChecked = true;
}

type SheetRow = Record<string, string>;

function mapStorageRow(row: SheetRow): UserStorageRecord {
  return {
    user_id: row.user_id,
    provider: row.provider as StorageProviderName,
    access_token_enc: row.access_token_enc || '',
    refresh_token_enc: row.refresh_token_enc || '',
    token_expires_at: row.token_expires_at || '',
    root_folder_id: row.root_folder_id || '',
    status: (row.status || 'connected') as 'connected' | 'disconnected',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

function mapAppRow(row: SheetRow): UserStorageAppMapRecord {
  return {
    user_id: row.user_id,
    app_name: row.app_name,
    container_id: row.container_id || '',
    schema_version: row.schema_version || 'v1',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

const appEnsureLocks = new Map<string, Promise<UserStorageAppMapRecord>>();

async function findAppMappingRowIndex(userId: string, appName: string): Promise<number> {
  await ensureStorageSheetsReady();

  const sheets = getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_NAMES.USER_STORAGE_APPS,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return -1;

  const headers = rows[0];
  const userIdCol = headers.indexOf('user_id');
  const appNameCol = headers.indexOf('app_name');

  if (userIdCol === -1 || appNameCol === -1) return -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][userIdCol] === userId && rows[i][appNameCol] === appName) {
      return i;
    }
  }

  return -1;
}

export async function getUserStorage(userId: string): Promise<UserStorageRecord | null> {
  await ensureStorageSheetsReady();
  const row = await findRowByColumn(SHEET_NAMES.USER_STORAGE, 'user_id', userId);
  return row ? mapStorageRow(row) : null;
}

export async function getUserStorageStatus(userId: string) {
  const record = await getUserStorage(userId);

  if (!record || record.status !== 'connected') {
    return {
      connected: false,
      provider: null,
    };
  }

  return {
    connected: true,
    provider: record.provider,
    linkedAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export async function assertProviderCanConnect(userId: string, provider: StorageProviderName): Promise<void> {
  const record = await getUserStorage(userId);

  if (record && record.status === 'connected') {
    throw new Error(`Storage already connected with provider '${record.provider}'. Disconnect first.`);
  }

  // onedrive is planned but intentionally not implemented yet.
  getProvider(provider);
}

export async function connectProvider(params: {
  userId: string;
  provider: StorageProviderName;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
}): Promise<UserStorageRecord> {
  const { userId, provider, accessToken, refreshToken, tokenExpiresAt } = params;
  const now = nowIso();
  const providerImpl = getProvider(provider);

  const rootFolderId = await providerImpl.ensureRootContainer(accessToken);
  const existing = await getUserStorage(userId);

  const record: UserStorageRecord = {
    user_id: userId,
    provider,
    access_token_enc: encryptText(accessToken),
    refresh_token_enc: refreshToken ? encryptText(refreshToken) : '',
    token_expires_at: tokenExpiresAt,
    root_folder_id: rootFolderId,
    status: 'connected',
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  if (!existing) {
    await appendRow(SHEET_NAMES.USER_STORAGE, [
      record.user_id,
      record.provider,
      record.access_token_enc,
      record.refresh_token_enc,
      record.token_expires_at,
      record.root_folder_id,
      record.status,
      record.created_at,
      record.updated_at,
    ]);

    return record;
  }

  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.USER_STORAGE, 'user_id', userId);
  if (rowIndex === -1) {
    throw new Error('Failed to update existing storage row');
  }

  await updateRow(SHEET_NAMES.USER_STORAGE, `A${rowIndex + 1}`, [
    record.user_id,
    record.provider,
    record.access_token_enc,
    record.refresh_token_enc,
    record.token_expires_at,
    record.root_folder_id,
    record.status,
    record.created_at,
    record.updated_at,
  ]);

  return record;
}

export async function disconnectProvider(userId: string): Promise<void> {
  await ensureStorageSheetsReady();
  const existing = await getUserStorage(userId);
  if (!existing || existing.status !== 'connected') {
    return;
  }

  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.USER_STORAGE, 'user_id', userId);
  if (rowIndex !== -1) {
    const now = nowIso();
    await updateRow(SHEET_NAMES.USER_STORAGE, `A${rowIndex + 1}`, [
      existing.user_id,
      existing.provider,
      '',
      '',
      '',
      '',
      'disconnected',
      existing.created_at || now,
      now,
    ]);
  }

  await deleteRowsByColumn(SHEET_NAMES.USER_STORAGE_APPS, 'user_id', userId);
}

export async function getLinkedProviderAccessToken(userId: string): Promise<{ provider: StorageProviderName; accessToken: string; rootFolderId: string } | null> {
  let record = await getUserStorage(userId);

  if (!record || record.status !== 'connected') {
    return null;
  }

  if (record.provider === 'google' && isTokenExpired(record.token_expires_at)) {
    record = await refreshGoogleAccessToken(record);
  }

  const accessToken = decryptText(record.access_token_enc);
  return {
    provider: record.provider,
    accessToken,
    rootFolderId: record.root_folder_id,
  };
}

export async function getAppContainer(userId: string, appName: string): Promise<UserStorageAppMapRecord | null> {
  await ensureStorageSheetsReady();
  const rows = await findRowsByColumn(SHEET_NAMES.USER_STORAGE_APPS, 'user_id', userId);
  const found = rows.find((r) => (r as SheetRow).app_name === appName) as SheetRow | undefined;
  return found ? mapAppRow(found) : null;
}

export async function ensureAppContainer(userId: string, appName: string): Promise<UserStorageAppMapRecord> {
  const normalizedAppName = appName.trim().toLowerCase();
  if (!normalizedAppName) {
    throw new Error('appName is required');
  }

  const lockKey = `${userId}:${normalizedAppName}`;
  const inFlight = appEnsureLocks.get(lockKey);
  if (inFlight) {
    return inFlight;
  }

  const ensurePromise = (async () => {
    const linked = await getLinkedProviderAccessToken(userId);
    if (!linked) {
      throw new Error('Storage provider is not connected');
    }

    const provider = getProvider(linked.provider);
    const containerId = await provider.ensureAppContainer(
      linked.accessToken,
      linked.rootFolderId,
      normalizedAppName
    );

    const existing = await getAppContainer(userId, normalizedAppName);
    const now = nowIso();

    if (existing) {
      const updated: UserStorageAppMapRecord = {
        user_id: existing.user_id,
        app_name: existing.app_name,
        container_id: containerId,
        schema_version: existing.schema_version || 'v1',
        created_at: existing.created_at || now,
        updated_at: now,
      };

      const rowIndex = await findAppMappingRowIndex(userId, normalizedAppName);
      if (rowIndex !== -1) {
        await updateRow(SHEET_NAMES.USER_STORAGE_APPS, `A${rowIndex + 1}`, [
          updated.user_id,
          updated.app_name,
          updated.container_id,
          updated.schema_version,
          updated.created_at,
          updated.updated_at,
        ]);
        return updated;
      }

      // Fallback for inconsistent sheet state: append a fresh row.
      await appendRow(SHEET_NAMES.USER_STORAGE_APPS, [
        updated.user_id,
        updated.app_name,
        updated.container_id,
        updated.schema_version,
        updated.created_at,
        updated.updated_at,
      ]);
      return updated;
    }

    const record: UserStorageAppMapRecord = {
      user_id: userId,
      app_name: normalizedAppName,
      container_id: containerId,
      schema_version: 'v1',
      created_at: now,
      updated_at: now,
    };

    await appendRow(SHEET_NAMES.USER_STORAGE_APPS, [
      record.user_id,
      record.app_name,
      record.container_id,
      record.schema_version,
      record.created_at,
      record.updated_at,
    ]);

    return record;
  })();

  appEnsureLocks.set(lockKey, ensurePromise);

  try {
    return await ensurePromise;
  } finally {
    appEnsureLocks.delete(lockKey);
  }
}
