import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, deleteSession } from '@/lib/auth';

/**
 * GET /logout
 *
 * Browser-facing logout endpoint.
 * Called via window.location.href redirect from consuming apps.
 * - Reads sso_token directly from the browser's cookie (no forwarding)
 * - Deletes the session from Google Sheets
 * - Clears the sso_token cookie
 * - Redirects browser back to the app (via redirect_uri param) or to /login
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirect_uri') || '/login';

  // Best-effort: delete session from Google Sheets
  try {
    const token = request.cookies.get('sso_token')?.value;
    if (token) {
      const payload = verifyToken(token);
      if (payload?.session_id) {
        await deleteSession(payload.session_id);
        console.log('[SSO LOGOUT] Deleted session:', payload.session_id);
      }
    }
  } catch (err) {
    console.error('[SSO LOGOUT] Session cleanup error:', err);
    // Do not block logout — always clear the cookie
  }

  // Redirect browser to the app (or SSO login)
  const response = NextResponse.redirect(
    redirectUri.startsWith('http') ? redirectUri : new URL(redirectUri, request.url).toString()
  );

  // Clear the sso_token cookie — browser receives this directly ✅
  response.cookies.set('sso_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
