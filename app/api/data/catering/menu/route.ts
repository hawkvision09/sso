import { NextRequest, NextResponse } from 'next/server';
import { resolveCateringRequestContext } from '@/app/api/data/catering/_context';
import { CateringService } from '@/lib/storage/catering-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CateringService(accessToken, spreadsheetId);
    const items = await service.getMenuItems();

    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Failed to fetch catering menu:', error);
    return NextResponse.json({ error: `Failed to fetch menu items: ${error.message}` }, { status: 500 });
  }
}
