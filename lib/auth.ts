import jwt from 'jsonwebtoken';
import { JWT_SECRET, APP_CONFIG } from '@/lib/config';
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

export interface User {
  user_id: string;
  email: string;
  roles: string[]; // Changed from single role to array
  created_at: string;
  status: 'active' | 'suspended';
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

// Create or get user
export async function getOrCreateUser(email: string): Promise<User> {
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
    };
    
    await appendRow(SHEET_NAMES.USERS, [
      newUser.user_id,
      newUser.email,
      newUser.roles.join(','), // Store as comma-separated string
      newUser.created_at,
      newUser.status,
    ]);
    
    return newUser;
  }
  
  // Parse roles from comma-separated string
  const userData = user as any;
  return {
    ...userData,
    roles: userData.role ? userData.role.split(',').map((r: string) => r.trim()) : ['user'],
  } as User;
}

// Create session - implements "one session per user" rule
export async function createSession(
  userId: string, 
  deviceInfo: string, 
  ipAddress: string,
  deviceMetadata: Partial<DeviceContext> = {}
): Promise<Session> {
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
  const user = await findRowByColumn(SHEET_NAMES.USERS, 'user_id', userId);
  if (!user) return null;
  
  // Parse roles from comma-separated string
  const userData = user as any;
  return {
    ...userData,
    roles: userData.role ? userData.role.split(',').map((r: string) => r.trim()) : ['user'],
  } as User;
}

// Logout - delete session
export async function deleteSession(sessionId: string): Promise<void> {
  await deleteRowsByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  await revokeAuthTokensBySessionId(sessionId);
}

export async function deleteSessionDevice(sessionId: string, deviceId: string): Promise<boolean> {
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
  await ensureSessionSheetsReady();
  const sessions = await findRowsByColumn(SHEET_NAMES.SESSIONS, 'user_id', userId);
  
  // Filter out expired sessions
  const now = new Date();
  return sessions.filter(s => new Date(s.expires_at) > now).map(session => mapSessionRow(session));
}
