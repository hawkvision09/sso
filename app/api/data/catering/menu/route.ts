import { NextRequest, NextResponse } from 'next/server';
import { resolveCateringRequestContext } from '@/app/api/data/catering/_context';
import { CateringService } from '@/lib/storage/catering-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CateringService(userId);
    const items = await service.getMenuItems();

    return NextResponse.json(items);
  } catch (error: unknown) {
    console.error('Failed to fetch catering menu:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch menu items: ${message}` }, { status: 500 });
  }
}
