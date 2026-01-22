import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, generateServiceId } from '@/lib/auth';
import { appendRow, SHEET_NAMES } from '@/lib/sheets';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sso_token');
  
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token.value);
  // @ts-ignore
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { name, description, redirect_url, free_tier } = await request.json();
    
    if (!name || !redirect_url) {
         return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
    }

    const serviceId = generateServiceId();
    // Headers: service_id, name, description, redirect_url, free_tier_enabled
    await appendRow(SHEET_NAMES.SERVICES, [serviceId, name, description, redirect_url, free_tier ? 'TRUE' : 'FALSE']);

    return NextResponse.json({ success: true, serviceId });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
