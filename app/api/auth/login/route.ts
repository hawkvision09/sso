import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, sendOTP, storeOTP } from '@/lib/otp';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP in database
    await storeOTP(email, otp);
    
    // Send OTP via email
    await sendOTP(email, otp);
    
    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
