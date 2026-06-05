import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService, type CostSummary } from '@/lib/storage/cost-mgmt-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CostMgmtService(userId);

    const productId = request.nextUrl.searchParams.get('product_id');
    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const summary = await service.getSummary(productId);

    return NextResponse.json({ summary });
  } catch (error: unknown) {
    console.error('Failed to fetch cost summary:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch summary: ${message}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CostMgmtService(userId);
    const body = (await request.json()) as CostSummary;

    const required = ['product_id', 'monthly_burn', 'calculated_at'] as const;
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const summary = await service.upsertSummary(body);

    return NextResponse.json({ success: true, summary });
  } catch (error: unknown) {
    console.error('Failed to upsert cost summary:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to upsert summary: ${message}` }, { status: 500 });
  }
}
