import jwt from 'jsonwebtoken';
import { JWT_SECRET, APP_CONFIG, AUTH_CORE_BACKEND, CORE_AUTH_DB_NAME } from '@/lib/config';
import { v4 as uuidv4 } from 'uuid';
import { 
  SHEET_NAMES, 
  appendRow, 
  findRowByColumn, 
  findRowIndexByColumn, 
  updateRow,
  deleteRowsByColumn,
  findRowsByColumn
} from '@/lib/sheets';
import { initializeSheets } from '@/lib/sheets';
import type { DeviceContext } from '@/lib/device';
import { revokeAuthTokensBySessionId } from '@/lib/authTokens';
import { getMongoDb } from '@/lib/db/mongo';
import { defaultThemeName, resolveThemeName, type ThemeName } from '@/lib/theme';

export interface User {
  user_id: string;
  email: string;
  roles: string[]; // Changed from single role to array
  created_at: string;
  status: 'active' | 'suspended';
  theme: ThemeName;
}

export interface Session {
  session_id: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
  last_login_at: string;
  devices_json: string;
}

export interface ActiveDevice {
  device_id: string;
  browser_name: string;
  browser_version: string;
  os_name: string;
  os_version: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_seen_at: string;
}

export interface JWTPayload {
  session_id: string;
  user_id: string;
  email: string;
  roles: string[]; // Changed from single role to array
}

let sessionSheetsChecked = false;
let mongoIndexesReady = false;

async function getCoreAuthCollections() {
  const db = await getMongoDb(CORE_AUTH_DB_NAME);
  const users = db.collection<User>('users');
  const sessions = db.collection<Session>('sessions');

  if (!mongoIndexesReady) {
    await Promise.all([
      users.createIndex({ email: 1 }, { unique: true }),
      users.createIndex({ user_id: 1 }, { unique: true }),
      sessions.createIndex({ session_id: 1 }, { unique: true }),
      sessions.createIndex({ user_id: 1 }, { unique: true }),
      sessions.createIndex({ expires_at: 1 }),
    ]);
    mongoIndexesReady = true;
  }

  return { users, sessions };
}

function mapMongoUser(doc: any): User {
  const roles = Array.isArray(doc?.roles)
    ? doc.roles
    : (typeof doc?.role === 'string' ? doc.role.split(',').map((r: string) => r.trim()) : ['user']);

  return {
    user_id: doc?.user_id || '',
    email: doc?.email || '',
    roles,
    created_at: doc?.created_at || '',
    status: (doc?.status || 'active') as 'active' | 'suspended',
    theme: resolveThemeName(doc?.theme),
  };
}

function mapMongoSession(doc: any): Session {
  return {
    session_id: doc?.session_id || '',
    user_id: doc?.user_id || '',
    created_at: doc?.created_at || '',
    expires_at: doc?.expires_at || '',
    last_active_at: doc?.last_active_at || '',
    last_login_at: doc?.last_login_at || doc?.created_at || '',
    devices_json: doc?.devices_json || '[]',
  };
}

async function ensureSessionSheetsReady(): Promise<void> {
  if (sessionSheetsChecked) return;

  try {
    await findRowsByColumn(SHEET_NAMES.SESSIONS, 'session_id', '__probe__');
  } catch {
    await initializeSheets();
  }

  sessionSheetsChecked = true;
}

function mapSessionRow(session: Record<string, string>): Session {
  return {
    session_id: session.session_id || '',
    user_id: session.user_id || '',
    created_at: session.created_at || '',
    expires_at: session.expires_at || '',
    last_active_at: session.last_active_at || '',
    last_login_at: session.last_login_at || session.created_at || '',
    devices_json: session.devices_json || '[]',
  };
}

function sessionToRow(session: Session): any[] {
  return [
    session.session_id,
    session.user_id,
    session.created_at,
    session.expires_at,
    session.last_active_at,
    session.last_login_at,
    session.devices_json,
  ];
}

function parseDevicesJson(devicesJson: string | undefined): ActiveDevice[] {
  if (!devicesJson?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(devicesJson);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((device): device is Partial<ActiveDevice> & { device_id: string } => (
        Boolean(device && typeof device === 'object' && typeof device.device_id === 'string' && device.device_id.trim())
      ))
      .map((device) => ({
        device_id: device.device_id.trim(),
        browser_name: typeof device.browser_name === 'string' ? device.browser_name : '',
        browser_version: typeof device.browser_version === 'string' ? device.browser_version : '',
        os_name: typeof device.os_name === 'string' ? device.os_name : '',
        os_version: typeof device.os_version === 'string' ? device.os_version : '',
        user_agent: typeof device.user_agent === 'string' ? device.user_agent : '',
        ip_address: typeof device.ip_address === 'string' ? device.ip_address : '',
        created_at: typeof device.created_at === 'string' ? device.created_at : '',
        last_seen_at: typeof device.last_seen_at === 'string' ? device.last_seen_at : '',
      }));
  } catch {
    return [];
  }
}

function serializeDevices(devices: ActiveDevice[]): string {
  return JSON.stringify(devices);
}

function createActiveDevice(device: Partial<DeviceContext>, nowIso: string): ActiveDevice | null {
  const deviceId = device.deviceId?.trim();
  if (!deviceId) {
    return null;
  }

  return {
    device_id: deviceId,
    browser_name: device.browserName || '',
    browser_version: device.browserVersion || '',
    os_name: device.osName || '',
    os_version: device.osVersion || '',
    user_agent: device.userAgent || '',
    ip_address: device.ipAddress || '',
    created_at: nowIso,
    last_seen_at: nowIso,
  };
}

function upsertActiveDevice(existingDevices: ActiveDevice[], incomingDevice: ActiveDevice): ActiveDevice[] {
  const existingIndex = existingDevices.findIndex((device) => device.device_id === incomingDevice.device_id);

  if (existingIndex === -1) {
    return [...existingDevices, incomingDevice];
  }

  const existing = existingDevices[existingIndex];
  const updated: ActiveDevice = {
    ...existing,
    ...incomingDevice,
    created_at: existing.created_at || incomingDevice.created_at,
    last_seen_at: incomingDevice.last_seen_at,
  };

  return existingDevices.map((device, index) => (
    index === existingIndex ? updated : device
  ));
}

function removeActiveDevice(existingDevices: ActiveDevice[], deviceId: string): ActiveDevice[] {
  return existingDevices.filter((device) => device.device_id !== deviceId);
}

function getUpdatedDevicesJson(
  currentDevicesJson: string,
  deviceMetadata: Partial<DeviceContext>,
  nowIso: string,
): string {
  const currentDevices = parseDevicesJson(currentDevicesJson);
  const nextDevice = createActiveDevice(deviceMetadata, nowIso);

  if (!nextDevice) {
    return serializeDevices(currentDevices);
  }

  return serializeDevices(upsertActiveDevice(currentDevices, nextDevice));
}

export async function getAllUsers(): Promise<User[]> {
  const { users } = await getCoreAuthCollections();
  const allUsersDocs = await users.find({}).toArray();
  return allUsersDocs.map(mapMongoUser);
}

export async function updateUserRole(userId: string, role: string, action: 'add' | 'remove'): Promise<User> {
  const { users } = await getCoreAuthCollections();
  const targetUser = await users.findOne({ user_id: userId });
  
  if (!targetUser) {
    throw new Error('User not found');
  }

  let currentRoles = targetUser.roles || [];
  if (typeof targetUser.role === 'string' && currentRoles.length === 0) {
    currentRoles = targetUser.role.split(',').map((r: string) => r.trim());
  }
  if (currentRoles.length === 0) {
    currentRoles = ['user'];
  }

  if (action === 'add') {
    if (!currentRoles.includes(role)) {
      currentRoles.push(role);
    }
  } else {
    currentRoles = currentRoles.filter((r: string) => r !== role);
    if (currentRoles.length === 0) {
      currentRoles = ['user'];
    }
  }

  await users.updateOne(
    { user_id: userId },
    { $set: { roles: currentRoles } }
  );

  const updatedUser = await users.findOne({ user_id: userId });
  return mapMongoUser(updatedUser);
}

// Create or get user
export async function getOrCreateUser(email: string): Promise<User> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const { users } = await getCoreAuthCollections();
    const existingUser = await users.findOne({ email });

    if (existingUser) {
      return mapMongoUser(existingUser);
    }

    const newUser: User = {
      user_id: uuidv4(),
      email,
      roles: ['user'],
      created_at: new Date().toISOString(),
      status: 'active',
      theme: defaultThemeName,
    };

    await users.insertOne(newUser as any);
    return newUser;
  }

  // Check if user exists
  let user = await findRowByColumn(SHEET_NAMES.USERS, 'email', email);
  
  if (!user) {
    // Create new user with default 'user' role
    const newUser: User = {
      user_id: uuidv4(),
      email,
      roles: ['user'], // Default role as array
      created_at: new Date().toISOString(),
      status: 'active',
      theme: defaultThemeName,
    };
    
    await appendRow(SHEET_NAMES.USERS, [
      newUser.user_id,
      newUser.email,
      newUser.roles.join(','), // Store as comma-separated string
      newUser.created_at,
      newUser.status,
      newUser.theme,
    ]);
    
    return newUser;
  }
  
  // Parse roles from comma-separated string
  const userData = user as any;
  return {
    ...userData,
    roles: userData.role ? userData.role.split(',').map((r: string) => r.trim()) : ['user'],
    theme: resolveThemeName(userData.theme),
  } as User;
}

// Create session - implements "one session per user" rule
export async function createSession(
  userId: string, 
  deviceInfo: string, 
  ipAddress: string,
  deviceMetadata: Partial<DeviceContext> = {}
): Promise<Session> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const { sessions } = await getCoreAuthCollections();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + APP_CONFIG.sessionDurationDays * 24 * 60 * 60 * 1000);
    const nowIso = now.toISOString();

    const existingSessionDoc = await sessions.findOne({ user_id: userId });
    const existingSession = existingSessionDoc ? mapMongoSession(existingSessionDoc) : null;

    if (existingSession) {
      if (new Date(existingSession.expires_at) < new Date()) {
        await sessions.deleteOne({ session_id: existingSession.session_id });
        await revokeAuthTokensBySessionId(existingSession.session_id);
      } else {
        const updatedSession: Session = {
          ...existingSession,
          last_active_at: nowIso,
          last_login_at: nowIso,
          expires_at: expiresAt.toISOString(),
          devices_json: getUpdatedDevicesJson(existingSession.devices_json, deviceMetadata, nowIso),
        };

        await sessions.updateOne(
          { session_id: updatedSession.session_id },
          { $set: updatedSession as any }
        );

        return updatedSession;
      }
    }

    const session: Session = {
      session_id: uuidv4(),
      user_id: userId,
      created_at: nowIso,
      expires_at: expiresAt.toISOString(),
      last_active_at: nowIso,
      last_login_at: nowIso,
      devices_json: getUpdatedDevicesJson('[]', deviceMetadata, nowIso),
    };

    await sessions.replaceOne(
      { user_id: userId },
      session as any,
      { upsert: true }
    );

    return session;
  }

  await ensureSessionSheetsReady();

  const existingSessions = await getUserSessions(userId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + APP_CONFIG.sessionDurationDays * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const existingSession = existingSessions[0];

  if (existingSession) {
    const updatedSession: Session = {
      ...existingSession,
      last_active_at: nowIso,
      last_login_at: nowIso,
      expires_at: expiresAt.toISOString(),
      devices_json: getUpdatedDevicesJson(existingSession.devices_json, deviceMetadata, nowIso),
    };

    const rowIndex = await findRowIndexByColumn(SHEET_NAMES.SESSIONS, 'session_id', existingSession.session_id);
    if (rowIndex !== -1) {
      await updateRow(SHEET_NAMES.SESSIONS, `A${rowIndex + 1}`, sessionToRow(updatedSession));
    }

    return updatedSession;
  }

  const session: Session = {
    session_id: uuidv4(),
    user_id: userId,
    created_at: nowIso,
    expires_at: expiresAt.toISOString(),
    last_active_at: nowIso,
    last_login_at: nowIso,
    devices_json: getUpdatedDevicesJson('[]', deviceMetadata, nowIso),
  };
  
  await appendRow(SHEET_NAMES.SESSIONS, sessionToRow(session));
  
  return session;
}

// Get session by ID
export async function getSession(sessionId: string): Promise<Session | null> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const { sessions } = await getCoreAuthCollections();
    const sessionDoc = await sessions.findOne({ session_id: sessionId });
    if (!sessionDoc) return null;

    const session = mapMongoSession(sessionDoc);
    if (new Date(session.expires_at) < new Date()) {
      await sessions.deleteOne({ session_id: sessionId });
      await revokeAuthTokensBySessionId(sessionId);
      return null;
    }

    return session;
  }

  await ensureSessionSheetsReady();
  const session = await findRowByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  
  if (!session) return null;
  
  // Check if expired
  if (new Date(session.expires_at) < new Date()) {
    // Delete expired session
    await deleteRowsByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
    await revokeAuthTokensBySessionId(sessionId);
    return null;
  }
  
  return mapSessionRow(session);
}

// Update session activity
export async function updateSessionActivity(sessionId: string): Promise<void> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const { sessions } = await getCoreAuthCollections();
    await sessions.updateOne(
      { session_id: sessionId },
      { $set: { last_active_at: new Date().toISOString() } }
    );
    return;
  }

  await ensureSessionSheetsReady();
  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  
  if (rowIndex === -1) return;
  
  const session = await findRowByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  if (!session) return;
  
  const updatedSession: Session = {
    ...mapSessionRow(session),
    last_active_at: new Date().toISOString(),
  };
  
  await updateRow(SHEET_NAMES.SESSIONS, `A${rowIndex + 1}`, sessionToRow(updatedSession));
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: `${APP_CONFIG.sessionDurationDays}d`,
  });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const { users } = await getCoreAuthCollections();
    const userDoc = await users.findOne({ user_id: userId });
    return userDoc ? mapMongoUser(userDoc) : null;
  }

  const user = await findRowByColumn(SHEET_NAMES.USERS, 'user_id', userId);
  if (!user) return null;
  
  // Parse roles from comma-separated string
  const userData = user as any;
  return {
    ...userData,
    roles: userData.role ? userData.role.split(',').map((r: string) => r.trim()) : ['user'],
    theme: resolveThemeName(userData.theme),
  } as User;
}

export async function updateUserTheme(userId: string, theme: ThemeName): Promise<User | null> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const { users } = await getCoreAuthCollections();
    await users.updateOne(
      { user_id: userId },
      { $set: { theme } }
    );

    const updatedUser = await users.findOne({ user_id: userId });
    return updatedUser ? mapMongoUser(updatedUser) : null;
  }

  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.USERS, 'user_id', userId);
  if (rowIndex === -1) {
    return null;
  }

  const user = await findRowByColumn(SHEET_NAMES.USERS, 'user_id', userId);
  if (!user) {
    return null;
  }

  const userData = user as any;
  const updatedUser: User = {
    user_id: userData.user_id || '',
    email: userData.email || '',
    roles: userData.role ? userData.role.split(',').map((r: string) => r.trim()) : ['user'],
    created_at: userData.created_at || '',
    status: (userData.status || 'active') as 'active' | 'suspended',
    theme,
  };

  await updateRow(SHEET_NAMES.USERS, `A${rowIndex + 1}`, [
    updatedUser.user_id,
    updatedUser.email,
    updatedUser.roles.join(','),
    updatedUser.created_at,
    updatedUser.status,
    updatedUser.theme,
  ]);

  return updatedUser;
}

// Logout - delete session
export async function deleteSession(sessionId: string): Promise<void> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const { sessions } = await getCoreAuthCollections();
    await sessions.deleteOne({ session_id: sessionId });
    await revokeAuthTokensBySessionId(sessionId);
    return;
  }

  await deleteRowsByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  await revokeAuthTokensBySessionId(sessionId);
}

export async function deleteSessionDevice(sessionId: string, deviceId: string): Promise<boolean> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const { sessions } = await getCoreAuthCollections();
    const sessionDoc = await sessions.findOne({ session_id: sessionId });

    if (!sessionDoc) {
      await revokeAuthTokensBySessionId(sessionId);
      return true;
    }

    const session = mapMongoSession(sessionDoc);
    const remainingDevices = removeActiveDevice(parseDevicesJson(session.devices_json), deviceId);

    if (remainingDevices.length === 0) {
      await sessions.deleteOne({ session_id: sessionId });
      await revokeAuthTokensBySessionId(sessionId);
      return true;
    }

    await sessions.updateOne(
      { session_id: sessionId },
      {
        $set: {
          devices_json: serializeDevices(remainingDevices),
          last_active_at: new Date().toISOString(),
        },
      }
    );

    return false;
  }

  await ensureSessionSheetsReady();

  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  if (rowIndex === -1) {
    await revokeAuthTokensBySessionId(sessionId);
    return true;
  }

  const sessionRow = await findRowByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  if (!sessionRow) {
    await revokeAuthTokensBySessionId(sessionId);
    return true;
  }

  const session = mapSessionRow(sessionRow);
  const remainingDevices = removeActiveDevice(parseDevicesJson(session.devices_json), deviceId);

  if (remainingDevices.length === 0) {
    await deleteRowsByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
    await revokeAuthTokensBySessionId(sessionId);
    return true;
  }

  const updatedSession: Session = {
    ...session,
    devices_json: serializeDevices(remainingDevices),
    last_active_at: new Date().toISOString(),
  };

  await updateRow(SHEET_NAMES.SESSIONS, `A${rowIndex + 1}`, sessionToRow(updatedSession));
  return false;
}

// Get all sessions for a user
export async function getUserSessions(userId: string): Promise<Session[]> {
  if (AUTH_CORE_BACKEND === 'mongo') {
    const { sessions } = await getCoreAuthCollections();
    const sessionDocs = await sessions.find({ user_id: userId }).toArray();

    const now = new Date();
    const validSessions = sessionDocs
      .map((sessionDoc) => mapMongoSession(sessionDoc))
      .filter((session) => new Date(session.expires_at) > now);

    if (validSessions.length === 0 && sessionDocs.length > 0) {
      await sessions.deleteMany({ user_id: userId });
    }

    return validSessions;
  }

  await ensureSessionSheetsReady();
  const sessions = await findRowsByColumn(SHEET_NAMES.SESSIONS, 'user_id', userId);
  
  // Filter out expired sessions
  const now = new Date();
  return sessions.filter(s => new Date(s.expires_at) > now).map(session => mapSessionRow(session));
}
