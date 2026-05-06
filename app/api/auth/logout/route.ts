import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, deleteSession, deleteSessionDevice } from '@/lib/auth';

function resolveLogoutDeviceId(request: NextRequest): string {
  return (
    request.headers.get('x-device-id')?.trim() ||
    request.cookies.get('hawkvision_device_id')?.value?.trim() ||
    ''
  );
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('sso_token')?.value;

    if (token) {
      const payload = verifyToken(token);
      if (payload?.session_id) {
        const deviceId = resolveLogoutDeviceId(request);

        if (deviceId) {
          const deletedSession = await deleteSessionDevice(payload.session_id, deviceId);
          console.log('[SSO LOGOUT] Removed device from session:', payload.session_id, deviceId, deletedSession ? 'session-deleted' : 'session-kept');
        } else {
          await deleteSession(payload.session_id);
          console.log('[SSO LOGOUT] Deleted session from Sheets:', payload.session_id);
        }
      }
    }

    // Clear sso_token cookie properly
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.set('sso_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;

  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to logout' },
      { status: 500 }
    );
  }
}
