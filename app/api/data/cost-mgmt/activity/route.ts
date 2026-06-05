import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService } from '@/lib/storage/cost-mgmt-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CostMgmtService(userId);
    const limitParam = Number(request.nextUrl.searchParams.get('limit') || 20);
    const logs = await service.getActivityLogs(limitParam);

    return NextResponse.json({ logs, count: logs.length });
  } catch (error: unknown) {
    console.error('Failed to fetch cost management activity:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch activity logs: ${message}` }, { status: 500 });
  }
}
