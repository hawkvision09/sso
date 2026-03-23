import { google } from 'googleapis';
import type { OAuthCallbackResult, StorageProvider } from '@/lib/storage/types';
import { getGoogleProviderConfig } from '@/lib/storage/providerConfig';

type DriveFile = {
  id?: string | null;
  name?: string | null;
  createdTime?: string | null;
};

async function getClient() {
  const cfg = await getGoogleProviderConfig();
  return {
    cfg,
    client: new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri),
  };
}

async function findFolderByName(drive: ReturnType<typeof google.drive>, name: string, parentId?: string): Promise<string | null> {
  const queryParts = [
    `name='${name.replace(/'/g, "\\'")}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    'trashed=false',
  ];

  if (parentId) {
    queryParts.push(`'${parentId}' in parents`);
  }

  const res = await drive.files.list({
    q: queryParts.join(' and '),
    fields: 'files(id,name,createdTime)',
    orderBy: 'createdTime asc',
    pageSize: 50,
  });

  const files = (res.data.files || []) as DriveFile[];
  return files[0]?.id || null;
}

async function createFolder(drive: ReturnType<typeof google.drive>, name: string, parentId?: string): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });

  if (!res.data.id) {
    throw new Error(`Failed to create folder: ${name}`);
  }

  return res.data.id;
}

function getSpreadsheetNamePrefix(): string {
  const raw = (process.env.STORAGE_APP_SHEET_PREFIX || 'woxin').trim().toLowerCase();
  // Keep only safe characters for predictable file naming.
  const sanitized = raw.replace(/[^a-z0-9_-]/g, '');
  return sanitized || 'woxin';
}

export const googleDriveProvider: StorageProvider = {
  name: 'google',

  async getConnectUrl(state: string): Promise<string> {
    const { client, cfg } = await getClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: cfg.scopes,
      state,
    });
  },

  async exchangeCode(code: string): Promise<OAuthCallbackResult> {
    const { client } = await getClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('Google OAuth did not return access_token');
    }

    const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000);

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      tokenExpiresAt: expiresAt.toISOString(),
    };
  },

  async ensureRootContainer(accessToken: string): Promise<string> {
    const { client, cfg } = await getClient();
    client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: client });

    const existing = await findFolderByName(drive, cfg.rootFolder);
    if (existing) return existing;

    return createFolder(drive, cfg.rootFolder);
  },

  async ensureAppContainer(accessToken: string, rootFolderId: string, appName: string): Promise<string> {
    const { client } = await getClient();
    client.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: 'v3', auth: client });

    const appFolderName = appName.trim();
    const existingAppFolder = await findFolderByName(drive, appFolderName, rootFolderId);
    const appFolderId = existingAppFolder || (await createFolder(drive, appFolderName, rootFolderId));

    // Keep a predictable spreadsheet name per app.
    // Preferred naming is app-specific; legacy data_v1 remains supported.
    const prefix = getSpreadsheetNamePrefix();
    const preferredSheetName = `${prefix}_${appFolderName.toLowerCase()}`;
    const legacySheetName = 'data_v1';

    const findSpreadsheetByName = async (name: string): Promise<string | null> => {
      const query = [
        `name='${name}'`,
        `mimeType='application/vnd.google-apps.spreadsheet'`,
        `'${appFolderId}' in parents`,
        'trashed=false',
      ].join(' and ');

      const existing = await drive.files.list({
        q: query,
        fields: 'files(id,name,createdTime)',
        orderBy: 'createdTime asc',
        pageSize: 50,
      });

      const files = (existing.data.files || []) as DriveFile[];
      return files[0]?.id || null;
    };

    const preferredExistingId = await findSpreadsheetByName(preferredSheetName);
    if (preferredExistingId) {
      return preferredExistingId;
    }

    const legacyExistingId = await findSpreadsheetByName(legacySheetName);
    if (legacyExistingId) {
      return legacyExistingId;
    }

    const created = await drive.files.create({
      requestBody: {
        name: preferredSheetName,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [appFolderId],
      },
      fields: 'id',
    });

    if (!created.data.id) {
      throw new Error(`Failed to create spreadsheet for app: ${appName}`);
    }

    return created.data.id;
  },
};
