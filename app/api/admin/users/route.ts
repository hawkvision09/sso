import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { getAllUsers, updateUserRole } from '@/lib/auth';

// Helper to check if user has admin role (handles both old and new token formats)
function hasAdminRole(roles: string[] | undefined, legacyRole?: string): boolean {
  if (roles && Array.isArray(roles)) {
    return roles.includes('admin');
  }
  // Fallback for old token format
  return legacyRole === 'admin';
}

// GET /api/admin/users - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user || !hasAdminRole(user.roles)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const users = await getAllUsers();

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/users - Add or remove role (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user || !hasAdminRole(user.roles)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { userId, role, action } = await request.json();

    if (!userId || !role || !action) {
      return NextResponse.json({ error: 'Missing userId, role, or action' }, { status: 400 });
    }

    if (action !== 'add' && action !== 'remove') {
      return NextResponse.json({ error: 'Action must be "add" or "remove"' }, { status: 400 });
    }

    if (role !== 'user' && role !== 'admin') {
      return NextResponse.json({ error: 'Invalid role. Must be "user" or "admin"' }, { status: 400 });
    }

    // Prevent admin from removing their own admin role
    if (userId === user.user_id && role === 'admin' && action === 'remove') {
      return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 });
    }

    const updatedUser = await updateUserRole(userId, role, action);

    return NextResponse.json({ 
      success: true, 
      message: `Role ${action === 'add' ? 'added' : 'removed'} successfully`,
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
