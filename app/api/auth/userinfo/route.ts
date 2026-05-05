import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'User account is not active' },
        { status: 403 }
      );
    }

    // Return user info
    return NextResponse.json({
      user_id: user.user_id,
      email: user.email,
      roles: user.roles,
      status: user.status,
      created_at: user.created_at,
    });
  } catch (error: any) {
    console.error('UserInfo error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
