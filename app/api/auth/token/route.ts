import { NextRequest, NextResponse } from 'next/server';
import { validateAndConsumeAuthCode } from '@/lib/authCodes';
import { getServiceById } from '@/lib/services';
import { getUserById, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { code, service_id, redirect_uri } = await request.json();

    // Validate required parameters
    if (!code || !service_id || !redirect_uri) {
      return NextResponse.json(
        { error: 'Missing required parameters: code, service_id, and redirect_uri' },
        { status: 400 }
      );
    }

    // Validate service exists
    const service = await getServiceById(service_id);
    if (!service) {
      return NextResponse.json(
        { error: 'Invalid service_id' },
        { status: 400 }
      );
    }

    // Validate and consume authorization code
    const result = await validateAndConsumeAuthCode(code, service_id, redirect_uri);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || 'Invalid authorization code' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await getUserById(result.userId!);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate access token (JWT)
    const accessToken = generateToken({
      session_id: '', // Not needed for SSO tokens
      user_id: user.user_id,
      email: user.email,
      roles: user.roles,
    });

    // Return token and user info
    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      user: {
        user_id: user.user_id,
        email: user.email,
        roles: user.roles,
        status: user.status,
      },
    });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
