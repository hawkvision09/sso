import { MongoClient, type Db } from 'mongodb';
import { MONGODB_DEFAULT_DB, dbNameWithEnv } from '@/lib/config';

const MONGODB_URI = process.env.MONGODB_URI?.trim() || '';
const MONGODB_DEFAULT_DB_LOCAL = MONGODB_DEFAULT_DB?.trim() || 'sso';

let cachedClient: MongoClient | null = null;
let cachedPromise: Promise<MongoClient> | null = null;

function assertMongoConfig(): void {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }
}

export async function getMongoClient(): Promise<MongoClient> {
  if (cachedClient) {
    return cachedClient;
  }

  assertMongoConfig();

  if (!cachedPromise) {
    cachedPromise = MongoClient.connect(MONGODB_URI);
  }

  cachedClient = await cachedPromise;
  return cachedClient;
}

export async function getMongoDb(databaseName = MONGODB_DEFAULT_DB): Promise<Db> {
  const client = await getMongoClient();
  const finalDbName = dbNameWithEnv(databaseName || MONGODB_DEFAULT_DB_LOCAL);
  return client.db(finalDbName);
}
