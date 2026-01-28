import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthCode } from '@/lib/services';
import { getUserById } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }
    
    // Verify and consume the code
    const result = await verifyAuthCode(code);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Invalid, expired, or already used authorization code' },
        { status: 401 }
      );
    }
    
    // Get user details
    const user = await getUserById(result.user_id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        roles: user.roles, // Changed to roles array
      },
    });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
