import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { findRowByColumn, findRowIndexByColumn, updateRow, SHEET_NAMES } from '@/lib/sheets';

// Helper to ensure admin
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sso_token');
  if (!token) return null;
  const user = verifyToken(token.value);
  // @ts-ignore
  if (!user || user.role !== 'admin') return null;
  return user;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await context.params;
  const service = await findRowByColumn(SHEET_NAMES.SERVICES, 'service_id', id);

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  return NextResponse.json({ service });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await checkAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await context.params;
  const { name, description, redirect_url, free_tier } = await request.json();

  if (!name || !redirect_url) {
       return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
  }

  const rowIndex = await findRowIndexByColumn(SHEET_NAMES.SERVICES, 'service_id', id);

  if (rowIndex === -1) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  // Row update: service_id, name, description, redirect_url, free_tier_enabled
  const updatedRow = [id, name, description, redirect_url, free_tier ? 'TRUE' : 'FALSE'];
  
  // Update the row at found index (e.g. A2:E2)
  await updateRow(SHEET_NAMES.SERVICES, `A${rowIndex}:E${rowIndex}`, updatedRow);

  return NextResponse.json({ success: true });
}
