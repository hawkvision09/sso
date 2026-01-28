import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getAllServices, createService } from '@/lib/services';

// Get all services
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('sso_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Handle both old (role) and new (roles) token formats
    const roles = payload.roles || ((payload as any).role ? [(payload as any).role] : []);
    console.log('Admin check - payload.roles:', payload.roles, 'extracted roles:', roles);
    
    if (!roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const services = await getAllServices();
    
    return NextResponse.json({ services });
  } catch (error: any) {
    console.error('Get services error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get services' },
      { status: 500 }
    );
  }
}

// Create new service
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('sso_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Handle both old (role) and new (roles) token formats
    const roles = payload.roles || ((payload as any).role ? [(payload as any).role] : []);
    if (!roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { name, description, redirect_url, free_tier_enabled } = await request.json();
    
    if (!name || !redirect_url) {
      return NextResponse.json(
        { error: 'Name and redirect URL are required' },
        { status: 400 }
      );
    }
    
    const service = await createService(
      name,
      description || '',
      redirect_url,
      free_tier_enabled || false
    );
    
    return NextResponse.json({
      success: true,
      service,
    });
  } catch (error: any) {
    console.error('Create service error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}
