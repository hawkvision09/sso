import { NextResponse } from 'next/server';
import { generateOTP } from '@/lib/auth';
import { appendRow, SHEET_NAMES } from '@/lib/sheets';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in Sheets
    // Note: In a real DB we'd upsert or invalidate old ones. Sheets append is simple for now.
    await appendRow(SHEET_NAMES.OTPS, [email, otp, expiresAt, Date.now()]);

    // Send Email
    await sendEmail(email, 'Your SSO Login Code', `Your login code is: ${otp}\n\nThis code expires in 10 minutes.`);

    return NextResponse.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to process login' }, { status: 500 });
  }
}
