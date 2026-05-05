import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { getAllServices, createService, updateService } from '@/lib/services';

// Get all services
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const roles = user.roles || [];
    console.log('Admin check - roles:', roles);
    
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
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const roles = user.roles || [];
    if (!roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { name, description, redirect_url, free_tier_enabled, image_url } = await request.json();
    
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
      free_tier_enabled || false,
      image_url || ''
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

// Update existing service
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const roles = user.roles || [];
    if (!roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const { service_id, name, description, redirect_url, free_tier_enabled, image_url } = await request.json();
    
    if (!service_id || !name || !redirect_url) {
      return NextResponse.json(
        { error: 'Service ID, name and redirect URL are required' },
        { status: 400 }
      );
    }
    
    const service = await updateService(
      service_id,
      name,
      description || '',
      redirect_url,
      free_tier_enabled || false,
      image_url || ''
    );
    
    return NextResponse.json({
      success: true,
      service,
    });
  } catch (error: any) {
    console.error('Update service error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update service' },
      { status: 500 }
    );
  }
}
