import { NextRequest, NextResponse } from 'next/server';
import { resolveCateringRequestContext } from '@/app/api/data/catering/_context';
import { CateringService } from '@/lib/storage/catering-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CateringService(accessToken, spreadsheetId);
    const logs = await service.getActivityLogs();

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Failed to fetch catering activity:', error);
    return NextResponse.json({ error: `Failed to fetch activity logs: ${error.message}` }, { status: 500 });
  }
}
