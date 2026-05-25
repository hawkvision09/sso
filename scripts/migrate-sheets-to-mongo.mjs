import dotenv from 'dotenv';
import { google } from 'googleapis';
import { MongoClient } from 'mongodb';
import { Redis } from '@upstash/redis';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const SHEETS = {
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

const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
function normalizeAppEnv(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'prd' || normalized === 'prod' || normalized === 'production') {
    return 'prd';
  }

  if (normalized === 'dev' || normalized === 'development') {
    return 'dev';
  }

  return 'dev';
}

const APP_ENV = normalizeAppEnv(process.env.APP_ENV || (process.env.NODE_ENV === 'production' ? 'prd' : 'dev'));
const DRY_RUN = !process.argv.includes('--execute');

const MONGODB_URI = process.env.MONGODB_URI?.trim() || '';
const MONGODB_CORE_DB = `${APP_ENV}-core-auth`;
const MONGODB_SSO_DB = `${APP_ENV}-sso`;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.trim() || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || '';

const sheetsId = process.env.SPREADSHEET_ID?.trim() || '';
const serviceAccountEmail = process.env.SERVICE_ACCOUNT_EMAIL?.trim() || '';
const serviceAccountKey = normalizeServiceAccountKey(process.env.SERVICE_ACCOUNT_KEY || '');

function normalizeServiceAccountKey(rawKey) {
  let key = String(rawKey || '').trim();

  if (!key) {
    return '';
  }

  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

function parseBooleanString(value) {
  return String(value || '').trim().toLowerCase();
}

function toSecondsUntil(isoValue) {
  if (!isoValue) return 0;

  const expiry = new Date(isoValue).getTime();
  if (Number.isNaN(expiry)) return 0;

  return Math.floor((expiry - Date.now()) / 1000);
}

function isExpired(isoValue) {
  return toSecondsUntil(isoValue) <= 0;
}

function sheetToObjects(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }

  const [headers, ...rows] = values;
  return rows.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row?.[index] ?? '';
    });
    return record;
  });
}

function requireConfig() {
  const missing = [];

  if (!MONGODB_URI) missing.push('MONGODB_URI');
  if (!redisUrl) missing.push('UPSTASH_REDIS_REST_URL');
  if (!redisToken) missing.push('UPSTASH_REDIS_REST_TOKEN');
  if (!sheetsId) missing.push('SPREADSHEET_ID');
  if (!serviceAccountEmail) missing.push('SERVICE_ACCOUNT_EMAIL');
  if (!serviceAccountKey) missing.push('SERVICE_ACCOUNT_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: serviceAccountKey,
    scopes: GOOGLE_SCOPES,
  });

  return google.sheets({ version: 'v4', auth });
}

async function readSheet(sheetName) {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetsId,
    range: sheetName,
  });

  return sheetToObjects(response.data.values || []);
}

function mongoIdSummary(doc, keys) {
  return keys.map((key) => `${key}=${doc?.[key] || ''}`).join(', ');
}

async function replaceCollection(collection, documents, uniqueKeys, label) {
  console.log(`Mongo ${label}: ${documents.length} row(s)`);

  if (DRY_RUN) {
    return;
  }

  await collection.deleteMany({});

  if (documents.length === 0) {
    return;
  }

  await collection.insertMany(documents, { ordered: false });
  console.log(`Mongo ${label}: inserted ${documents.length} document(s)`);
}

function buildRedisOtpKey(email) {
  return `auth:otp:${String(email || '').toLowerCase()}`;
}

function buildRedisAuthCodeKey(code) {
  return `auth:code:${code}`;
}

function buildRedisAuthCodeIndexKey(userId, serviceId) {
  return `auth:code:index:${userId}:${serviceId}`;
}

async function migrate() {
  requireConfig();

  const [users, sessions, authTokens, services, entitlements, otps, authCodes, userStorage, userStorageApps, providerConfig] = await Promise.all([
    readSheet(SHEETS.USERS),
    readSheet(SHEETS.SESSIONS),
    readSheet(SHEETS.AUTH_TOKENS),
    readSheet(SHEETS.SERVICES),
    readSheet(SHEETS.ENTITLEMENTS),
    readSheet(SHEETS.OTPS),
    readSheet(SHEETS.AUTH_CODES),
    readSheet(SHEETS.USER_STORAGE),
    readSheet(SHEETS.USER_STORAGE_APPS),
    readSheet(SHEETS.PROVIDER_CONFIG),
  ]);

  const mongoClient = new MongoClient(MONGODB_URI);
  const redis = new Redis({ url: redisUrl, token: redisToken });

  try {
    await mongoClient.connect();
    const coreAuthDb = mongoClient.db(MONGODB_CORE_DB);
    const ssoDb = mongoClient.db(MONGODB_SSO_DB);

    const serviceById = new Map();
    for (const row of services) {
      if (row.service_id) {
        serviceById.set(row.service_id, row);
      }
    }

    const usersDocs = users
      .filter((row) => row.user_id && row.email)
      .map((row) => ({
        user_id: row.user_id,
        email: row.email,
        roles: typeof row.role === 'string' && row.role.trim()
          ? row.role.split(',').map((role) => role.trim()).filter(Boolean)
          : ['user'],
        created_at: row.created_at || '',
        status: (row.status || 'active'),
      }));

    const sessionsDocs = sessions
      .filter((row) => row.session_id && row.user_id)
      .map((row) => ({
        session_id: row.session_id,
        user_id: row.user_id,
        created_at: row.created_at || '',
        expires_at: row.expires_at || '',
        last_active_at: row.last_active_at || '',
        last_login_at: row.last_login_at || row.created_at || '',
        devices_json: row.devices_json || '[]',
      }));

    const authTokenDocs = authTokens
      .filter((row) => row.user_id)
      .map((row) => ({
        user_id: row.user_id,
        session_id: row.session_id || '',
        token_value: row.token_value || '',
        token_hash: row.token_hash || '',
        status: row.status || 'active',
        issued_at: row.issued_at || row.created_at || '',
        expires_at: row.expires_at || '',
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
      }));

    const servicesDocs = services
      .filter((row) => row.service_id)
      .map((row) => ({
        service_id: row.service_id,
        name: row.name || '',
        description: row.description || '',
        redirect_url: row.redirect_url || '',
        free_tier_enabled: row.free_tier_enabled || 'false',
        image_url: row.image_url || '',
      }));

    const entitlementsDocs = entitlements
      .filter((row) => row.entitlement_id)
      .map((row) => ({
        entitlement_id: row.entitlement_id,
        user_id: row.user_id || '',
        service_id: row.service_id || '',
        tier_level: row.tier_level || 'free',
        valid_until: row.valid_until || '',
      }));

    const userStorageDocs = userStorage
      .filter((row) => row.user_id)
      .map((row) => ({
        user_id: row.user_id,
        provider: row.provider || 'google',
        access_token_enc: row.access_token_enc || '',
        refresh_token_enc: row.refresh_token_enc || '',
        token_expires_at: row.token_expires_at || '',
        root_folder_id: row.root_folder_id || '',
        status: row.status || 'connected',
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
      }));

    const userStorageAppDocs = userStorageApps
      .filter((row) => row.user_id && row.app_name)
      .map((row) => ({
        user_id: row.user_id,
        app_name: row.app_name,
        container_id: row.container_id || '',
        schema_version: row.schema_version || 'v1',
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
      }));

    const providerConfigDocs = providerConfig
      .filter((row) => row.provider)
      .map((row) => ({
        provider: row.provider,
        enabled: row.enabled || 'false',
        client_id: row.client_id || '',
        client_secret: row.client_secret || '',
        redirect_uri: row.redirect_uri || '',
        scopes: row.scopes || '',
        root_folder: row.root_folder || '',
        updated_at: row.updated_at || '',
      }));

    await replaceCollection(coreAuthDb.collection('users'), usersDocs, ['user_id'], 'users');
    await replaceCollection(coreAuthDb.collection('sessions'), sessionsDocs, ['session_id'], 'sessions');
    await replaceCollection(coreAuthDb.collection('auth_tokens'), authTokenDocs, ['user_id'], 'auth_tokens');

    await replaceCollection(ssoDb.collection('services'), servicesDocs, ['service_id'], 'services');
    await replaceCollection(ssoDb.collection('entitlements'), entitlementsDocs, ['entitlement_id'], 'entitlements');
    await replaceCollection(ssoDb.collection('user_storage'), userStorageDocs, ['user_id'], 'user_storage');
    await replaceCollection(ssoDb.collection('user_storage_apps'), userStorageAppDocs, ['user_id', 'app_name'], 'user_storage_apps');
    await replaceCollection(ssoDb.collection('provider_config'), providerConfigDocs, ['provider'], 'provider_config');

    const activeOtps = otps.filter((row) => row.email && row.otp_code && !isExpired(row.expires_at));
    const activeAuthCodes = authCodes.filter((row) => row.code && row.user_id && row.service_id && row.used !== 'true' && !isExpired(row.expires_at));

    console.log(`Redis OTPs: ${activeOtps.length} row(s)`);
    console.log(`Redis auth codes: ${activeAuthCodes.length} row(s)`);

    if (!DRY_RUN) {
      for (const row of activeOtps) {
        const ttl = Math.max(1, toSecondsUntil(row.expires_at));
        await redis.set(buildRedisOtpKey(row.email), {
          email: row.email,
          otp_code: row.otp_code,
          expires_at: row.expires_at || '',
          created_at: row.created_at || '',
        }, { ex: ttl });
      }

      for (const row of activeAuthCodes) {
        const service = serviceById.get(row.service_id);
        const redirectUri = row.redirect_uri || service?.redirect_url || '';
        const ttl = Math.max(1, toSecondsUntil(row.expires_at));
        const payload = {
          code: row.code,
          user_id: row.user_id,
          service_id: row.service_id,
          redirect_uri: redirectUri,
          expires_at: row.expires_at || '',
          created_at: row.created_at || '',
        };

        if (!redirectUri) {
          console.warn(`Auth code ${row.code} is missing redirect_uri; keeping blank for traceability.`);
        }

        await redis.set(buildRedisAuthCodeKey(row.code), payload, { ex: ttl });
        const indexKey = buildRedisAuthCodeIndexKey(row.user_id, row.service_id);
        await redis.sadd(indexKey, row.code);
        await redis.expire(indexKey, ttl);
      }
    }

    await Promise.all([
      coreAuthDb.collection('users').createIndex({ email: 1 }, { unique: true }),
      coreAuthDb.collection('users').createIndex({ user_id: 1 }, { unique: true }),
      coreAuthDb.collection('sessions').createIndex({ session_id: 1 }, { unique: true }),
      coreAuthDb.collection('sessions').createIndex({ user_id: 1 }, { unique: true }),
      coreAuthDb.collection('sessions').createIndex({ expires_at: 1 }),
      coreAuthDb.collection('auth_tokens').createIndex({ user_id: 1 }, { unique: true }),
      coreAuthDb.collection('auth_tokens').createIndex({ session_id: 1 }),
      ssoDb.collection('services').createIndex({ service_id: 1 }, { unique: true }),
      ssoDb.collection('entitlements').createIndex({ entitlement_id: 1 }, { unique: true }),
      ssoDb.collection('entitlements').createIndex({ user_id: 1 }),
      ssoDb.collection('entitlements').createIndex({ service_id: 1 }),
      ssoDb.collection('user_storage').createIndex({ user_id: 1 }, { unique: true }),
      ssoDb.collection('user_storage_apps').createIndex({ user_id: 1, app_name: 1 }, { unique: true }),
      ssoDb.collection('provider_config').createIndex({ provider: 1 }, { unique: true }),
    ]);

    if (DRY_RUN) {
      console.log('Dry run complete. Re-run with --execute to write data.');
      return;
    }

    console.log('Migration completed successfully.');
    console.log(`Mongo DBs updated: ${MONGODB_CORE_DB}, ${MONGODB_SSO_DB}`);
  } finally {
    await mongoClient.close();
  }
}

migrate().catch((error) => {
  console.error('Migration failed:');
  console.error(error);
  process.exitCode = 1;
});