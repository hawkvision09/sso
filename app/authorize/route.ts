import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, generateAuthCode } from '@/lib/auth';
import { findRowByColumn, appendRow, SHEET_NAMES } from '@/lib/sheets';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('service_id');

  if (!serviceId) {
    return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
  }

  // 1. Verify User Session
  const cookieStore = await cookies();
  const token = cookieStore.get('sso_token');

  if (!token) {
    // If no session, redirect to Login with return URL
    // We encode the current URL as the 'return_to' param
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('return_to', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const user = verifyToken(token.value);
  if (!user) {
    return NextResponse.json({ error: 'Invalid Session' }, { status: 401 });
  }

  // 2. Validate Service exists
  const service = await findRowByColumn(SHEET_NAMES.SERVICES, 'service_id', serviceId);
  if (!service) {
      return NextResponse.json({ error: 'Service not found or invalid' }, { status: 404 });
  }

  // 3. Check Entitlement (Simplified: If Free Tier or User has Entitlement)
  // In a real flow, checking entitlements here protects the service redirection.
  // For now, let's assume if they can see it on dashboard, they can access it.
  
  // 4. Generate Auth Code
  const authCode = generateAuthCode();
  const expiresAt = Date.now() + 60 * 1000; // 60 seconds validity
  
  // Store Code: code, user_id, service_id, expires_at, used
  // @ts-ignore
  await appendRow(SHEET_NAMES.AUTH_CODES, [authCode, user.userId, serviceId, expiresAt, 'FALSE']);

  // 5. Redirect back to Service
  const redirectUrl = new URL(service.redirect_url);
  redirectUrl.searchParams.set('code', authCode);

  return NextResponse.redirect(redirectUrl);
}
