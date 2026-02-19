import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getRows, updateRow, findRowIndexByColumn, SHEET_NAMES } from '@/lib/sheets';

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
    // Verify admin authentication
    const token = request.cookies.get('sso_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !hasAdminRole(payload.roles, (payload as any).role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get all users
    const rawUsers = await getRows(SHEET_NAMES.USERS);
    
    // Parse roles for each user
    const users = rawUsers.map(u => ({
      ...u,
      roles: u.role ? u.role.split(',').map((r: string) => r.trim()) : ['user'],
    }));

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/users - Add or remove role (admin only)
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('sso_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !hasAdminRole(payload.roles, (payload as any).role)) {
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
    if (userId === payload.user_id && role === 'admin' && action === 'remove') {
      return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 });
    }

    // Find the user row
    const rowIndex = await findRowIndexByColumn(SHEET_NAMES.USERS, 'user_id', userId);
    if (rowIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current user data
    const users = await getRows(SHEET_NAMES.USERS);
    const user = users.find(u => u.user_id === userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse current roles
    let currentRoles = user.role ? user.role.split(',').map((r: string) => r.trim()) : ['user'];
    
    // Add or remove role
    if (action === 'add') {
      if (!currentRoles.includes(role)) {
        currentRoles.push(role);
      }
    } else {
      currentRoles = currentRoles.filter((r: string) => r !== role);
      // Ensure at least 'user' role remains
      if (currentRoles.length === 0) {
        currentRoles = ['user'];
      }
    }

    // Update the roles
    const updatedRow = [
      user.user_id,
      user.email,
      currentRoles.join(','), // Store as comma-separated string
      user.created_at,
      user.status,
    ];

    const rowNumber = rowIndex + 1; // Convert to 1-based for Sheets API
    await updateRow(SHEET_NAMES.USERS, `A${rowNumber}:E${rowNumber}`, updatedRow);

    return NextResponse.json({ 
      success: true, 
      message: `Role ${action === 'add' ? 'added' : 'removed'} successfully`,
      user: {
        user_id: user.user_id,
        email: user.email,
        roles: currentRoles,
        created_at: user.created_at,
        status: user.status,
      }
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
