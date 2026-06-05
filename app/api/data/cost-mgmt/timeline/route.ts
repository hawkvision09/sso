import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService, type CostTimelineCache } from '@/lib/storage/cost-mgmt-service';

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

    const timeline = await service.getTimelineCache(productId);
    return NextResponse.json({ timeline });
  } catch (error: unknown) {
    console.error('Failed to fetch timeline cache:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch timeline cache: ${message}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CostMgmtService(userId);
    const body = (await request.json()) as CostTimelineCache;

    if (!body?.product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    if (!Array.isArray(body.timeline)) {
      return NextResponse.json({ error: 'timeline must be an array' }, { status: 400 });
    }

    const timeline = await service.upsertTimelineCache({
      product_id: body.product_id,
      calculated_at: body.calculated_at,
      event_count: body.event_count,
      timeline: body.timeline,
    });

    return NextResponse.json({ success: true, timeline });
  } catch (error: unknown) {
    console.error('Failed to upsert timeline cache:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to upsert timeline cache: ${message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CostMgmtService(userId);

    const productIdFromQuery = request.nextUrl.searchParams.get('product_id');
    let productId = productIdFromQuery ? String(productIdFromQuery).trim() : '';

    if (!productId) {
      const body = await request.json().catch(() => ({} as { product_id?: string }));
      productId = String(body?.product_id || '').trim();
    }

    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 });
    }

    const result = await service.pruneTimelineCache(productId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error('Failed to prune timeline cache:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to prune timeline cache: ${message}` }, { status: 500 });
  }
}
