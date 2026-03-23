import { findRowByColumn, initializeSheets, SHEET_NAMES } from '@/lib/sheets';
import type { StorageProviderName } from '@/lib/storage/types';

interface ProviderConfigRow {
  provider: string;
  enabled: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string;
  root_folder: string;
  updated_at: string;
}

export interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  rootFolder: string;
}

async function readProviderConfig(provider: StorageProviderName): Promise<ProviderConfigRow | null> {
  try {
    const row = await findRowByColumn(SHEET_NAMES.PROVIDER_CONFIG, 'provider', provider);
    return (row as ProviderConfigRow) || null;
  } catch {
    // If sheet does not exist yet, initialize schema once and retry.
    await initializeSheets();
    const row = await findRowByColumn(SHEET_NAMES.PROVIDER_CONFIG, 'provider', provider);
    return (row as ProviderConfigRow) || null;
  }
}

function parseEnabled(value: string): boolean {
  return String(value || '').trim().toLowerCase() === 'true';
}

function parseScopes(rawScopes: string): string[] {
  if (!rawScopes?.trim()) {
    return [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets',
    ];
  }

  return rawScopes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getGoogleProviderConfig(): Promise<GoogleProviderConfig> {
  const config = await readProviderConfig('google');

  if (!config) {
    throw new Error('Missing ProviderConfig row for google');
  }

  if (!parseEnabled(config.enabled)) {
    throw new Error('Google provider is disabled in ProviderConfig');
  }

  if (!config.client_id || !config.client_secret || !config.redirect_uri) {
    throw new Error('ProviderConfig for google is missing client_id/client_secret/redirect_uri');
  }

  return {
    clientId: config.client_id,
    clientSecret: config.client_secret,
    redirectUri: config.redirect_uri,
    scopes: parseScopes(config.scopes),
    rootFolder: config.root_folder?.trim() || 'MyAppData',
  };
}
