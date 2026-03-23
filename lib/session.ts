import { cookies } from 'next/headers';
import { getSession, getUserById, verifyToken, type User } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export async function getAuthenticatedUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sso_token')?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const session = await getSession(payload.session_id);
  if (!session) return null;

  const user = await getUserById(payload.user_id);
  if (!user || user.status !== 'active') return null;

  return user;
}

function extractBearerToken(request: NextRequest | Request): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export async function getAuthenticatedUserFromRequest(request: NextRequest | Request): Promise<User | null> {
  const bearer = extractBearerToken(request);
  if (bearer) {
    const payload = verifyToken(bearer);
    if (!payload) return null;

    // App-issued access tokens may not include a session_id.
    if (payload.session_id) {
      const session = await getSession(payload.session_id);
      if (!session) return null;
    }

    const user = await getUserById(payload.user_id);
    if (!user || user.status !== 'active') return null;
    return user;
  }

  return getAuthenticatedUser();
}
