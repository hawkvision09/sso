import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp';
import { getOrCreateUser, createSession, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();
    
    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }
    
    // Verify OTP (this will also delete the OTP row)
    const isValid = await verifyOTP(email, otp);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 401 }
      );
    }
    
    // Get or create user
    const user = await getOrCreateUser(email);
    
    // Get device info and IP
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'Unknown';
    
    // Create session (this will delete any existing sessions for this user)
    const session = await createSession(user.user_id, userAgent, ip);
    
    // Debug logging
    console.log('User object:', JSON.stringify(user, null, 2));
    console.log('User roles:', user.roles);
    
    // Generate JWT
    const token = generateToken({
      session_id: session.session_id,
      user_id: user.user_id,
      email: user.email,
      roles: user.roles, // Changed to roles array
    });
    
    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        roles: user.roles, // Changed to roles array
      },
    });
    
    response.cookies.set('sso_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}
