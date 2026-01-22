import { NextResponse } from 'next/server';
import { serialize } from 'cookie';
import { v4 as uuidv4 } from 'uuid';
import { generateToken, generateUserId } from '@/lib/auth';
import { appendRow, findRowByColumn, findRowsByColumn, SHEET_NAMES } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    // 1. Verify OTP
    const otps = await findRowsByColumn(SHEET_NAMES.OTPS, 'email', email);
    
    // Process and sort OTPs
    const validOtps = otps.map(o => ({
        ...o,
        created_at: Number(o.created_at),
        expires_at: Number(o.expires_at)
    })).sort((a, b) => b.created_at - a.created_at);

    const latestOtp = validOtps[0];

    if (!latestOtp) {
        return NextResponse.json({ error: 'Invalid OTP' }, { status: 401 });
    }

    // Checking code match
    if (String(latestOtp.otp_code).trim() !== String(otp).trim()) {
         return NextResponse.json({ error: 'Invalid OTP Code' }, { status: 401 });
    }

    // Checking expiration
    if (Date.now() > latestOtp.expires_at) {
         return NextResponse.json({ error: 'OTP Expired' }, { status: 401 });
    }

    // 2. Find or Create User
    let user = await findRowByColumn(SHEET_NAMES.USERS, 'email', email);
    let userId;
    let role;

    if (!user) {
        // Create User
        userId = generateUserId();
        role = email === 'hawkvision09@gmail.com' ? 'admin' : 'user';
        
        // Headers: user_id, email, role, created_at, status
        await appendRow(SHEET_NAMES.USERS, [userId, email, role, Date.now(), 'active']);
        
        user = { user_id: userId, email, role };
    } else {
        userId = user.user_id;
        role = user.role;
    }

    // 3. Create Session
    const sessionId = uuidv4();
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
    
    // Headers: session_id, user_id, device_info, created_at, expires_at, last_active_at, ip_address
    await appendRow(SHEET_NAMES.SESSIONS, [sessionId, userId, 'web', now, expiresAt, now, '::1']);

    // 4. Generate Token & Cookie
    const token = generateToken({ sessionId, userId, email, role });

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    };

    const cookieHeader = serialize('sso_token', token, cookieOptions);

    return NextResponse.json({ success: true, user: { email, role } }, {
        headers: {
            'Set-Cookie': cookieHeader
        }
    });

  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
