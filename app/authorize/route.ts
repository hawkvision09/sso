import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getSession } from '@/lib/auth';
import { 
  getService, 
  getUserEntitlement, 
  createEntitlement, 
  generateAuthCode 
} from '@/lib/services';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('service_id');
    
    if (!serviceId) {
      return NextResponse.json(
        { error: 'service_id is required' },
        { status: 400 }
      );
    }
    
    // Verify service exists
    const service = await getService(serviceId);
    if (!service) {
      return NextResponse.json(
        { error: 'Invalid service' },
        { status: 404 }
      );
    }
    
    // Check if user is authenticated
    const token = request.cookies.get('sso_token')?.value;
    
    if (!token) {
      // Redirect to login with return URL
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('service_id', serviceId);
      loginUrl.searchParams.set('redirect_url', service.redirect_url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Verify JWT
    const payload = verifyToken(token);
    if (!payload) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('service_id', serviceId);
      loginUrl.searchParams.set('redirect_url', service.redirect_url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Verify session
    const session = await getSession(payload.session_id);
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('service_id', serviceId);
      loginUrl.searchParams.set('redirect_url', service.redirect_url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Check entitlement
    let entitlement = await getUserEntitlement(payload.user_id, serviceId);
    
    // If no entitlement and free tier is enabled, create one
    if (!entitlement && service.free_tier_enabled === 'true') {
      entitlement = await createEntitlement(
        payload.user_id,
        serviceId,
        'free'
      );
    }
    
    // If still no entitlement, show upgrade page
    if (!entitlement) {
      const upgradeUrl = new URL('/upgrade', request.url);
      upgradeUrl.searchParams.set('service_id', serviceId);
      upgradeUrl.searchParams.set('service_name', service.name);
      return NextResponse.redirect(upgradeUrl);
    }
    
    // Generate authorization code
    const code = await generateAuthCode(payload.user_id, serviceId);
    
    // Redirect back to service with code
    const redirectUrl = new URL(service.redirect_url);
    redirectUrl.searchParams.set('code', code);
    
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Authorization error:', error);
    return NextResponse.json(
      { error: error.message || 'Authorization failed' },
      { status: 500 }
    );
  }
}
