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
  device_info: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
  ip_address: string;
}

export interface JWTPayload {
  session_id: string;
  user_id: string;
  email: string;
  roles: string[]; // Changed from single role to array
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
  ipAddress: string
): Promise<Session> {
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + APP_CONFIG.sessionDurationDays * 24 * 60 * 60 * 1000);
  
  const session: Session = {
    session_id: sessionId,
    user_id: userId,
    device_info: deviceInfo,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    last_active_at: now.toISOString(),
    ip_address: ipAddress,
  };
  
  // KEY REQUIREMENT: Delete all existing sessions for this user
  await deleteRowsByColumn(SHEET_NAMES.SESSIONS, 'user_id', userId);
  
  // Create new session
  await appendRow(SHEET_NAMES.SESSIONS, [
    session.session_id,
    session.user_id,
    session.device_info,
    session.created_at,
    session.expires_at,
    session.last_active_at,
    session.ip_address,
  ]);
  
  return session;
}

// Get session by ID
export async function getSession(sessionId: string): Promise<Session | null> {
  const session = await findRowByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  
  if (!session) return null;
  
  // Check if expired
  if (new Date(session.expires_at) < new Date()) {
    // Delete expired session
    await deleteRowsByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
    return null;
  }
  
  return session as Session;
}

// Update session activity
export async function updateSessionActivity(sessionId: string): Promise<void> {
  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  
  if (rowIndex === -1) return;
  
  const session = await findRowByColumn(SHEET_NAMES.SESSIONS, 'session_id', sessionId);
  if (!session) return;
  
  const updatedSession = {
    ...session,
    last_active_at: new Date().toISOString(),
  };
  
  await updateRow(SHEET_NAMES.SESSIONS, `A${rowIndex + 1}`, [
    updatedSession.session_id,
    updatedSession.user_id,
    updatedSession.device_info,
    updatedSession.created_at,
    updatedSession.expires_at,
    updatedSession.last_active_at,
    updatedSession.ip_address,
  ]);
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
}

// Get all sessions for a user
export async function getUserSessions(userId: string): Promise<Session[]> {
  const sessions = await findRowsByColumn(SHEET_NAMES.SESSIONS, 'user_id', userId);
  
  // Filter out expired sessions
  const now = new Date();
  return sessions.filter(s => new Date(s.expires_at) > now) as Session[];
}
