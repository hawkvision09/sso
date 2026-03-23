export type StorageProviderName = 'google' | 'onedrive';

export interface UserStorageRecord {
  user_id: string;
  provider: StorageProviderName;
  access_token_enc: string;
  refresh_token_enc: string;
  token_expires_at: string;
  root_folder_id: string;
  status: 'connected' | 'disconnected';
  created_at: string;
  updated_at: string;
}

export interface UserStorageAppMapRecord {
  user_id: string;
  app_name: string;
  container_id: string;
  schema_version: string;
  created_at: string;
  updated_at: string;
}

export interface OAuthCallbackResult {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
}

export interface StorageProvider {
  name: StorageProviderName;
  getConnectUrl(state: string): Promise<string>;
  exchangeCode(code: string): Promise<OAuthCallbackResult>;
  ensureRootContainer(accessToken: string): Promise<string>;
  ensureAppContainer(accessToken: string, rootFolderId: string, appName: string): Promise<string>;
}
