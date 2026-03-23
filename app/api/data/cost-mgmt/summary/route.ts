import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService, type CostSummary } from '@/lib/storage/cost-mgmt-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CostMgmtService(accessToken, spreadsheetId);

    const productId = request.nextUrl.searchParams.get('product_id');
    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const summary = await service.getSummary(productId);

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Failed to fetch cost summary:', error);
    return NextResponse.json({ error: `Failed to fetch summary: ${error.message}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CostMgmtService(accessToken, spreadsheetId);
    const body = (await request.json()) as CostSummary;

    const required = ['product_id', 'monthly_burn', 'calculated_at'];
    for (const field of required) {
      if ((body as any)[field] === undefined || (body as any)[field] === null || (body as any)[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const summary = await service.upsertSummary(body);

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error('Failed to upsert cost summary:', error);
    return NextResponse.json({ error: `Failed to upsert summary: ${error.message}` }, { status: 500 });
  }
}
