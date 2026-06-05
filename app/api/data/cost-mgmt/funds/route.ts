import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService } from '@/lib/storage/cost-mgmt-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const productId = String(request.nextUrl.searchParams.get('product_id') || '').trim();
    if (!productId) {
      return NextResponse.json({ error: 'Missing required query param: product_id' }, { status: 400 });
    }

    const { userId } = resolved.context;
    const service = new CostMgmtService(userId);
    const availableFunds = await service.getAvailableFunds(productId);

    return NextResponse.json({
      product_id: productId,
      available_funds: availableFunds,
    });
  } catch (error: unknown) {
    console.error('Failed to fetch available funds:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch available funds: ${message}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const body = await request.json();
    const productId = String(body.product_id || '').trim();
    const availableFunds = Number(body.available_funds);

    if (!productId) {
      return NextResponse.json({ error: 'Missing required field: product_id' }, { status: 400 });
    }

    if (!Number.isFinite(availableFunds) || availableFunds < 0) {
      return NextResponse.json({ error: 'available_funds must be a non-negative number' }, { status: 400 });
    }

    const { userId } = resolved.context;
    const service = new CostMgmtService(userId);

    const updated = await service.upsertAvailableFunds(productId, availableFunds);

    return NextResponse.json({
      success: true,
      ...updated,
    });
  } catch (error: unknown) {
    console.error('Failed to save available funds:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to save available funds: ${message}` }, { status: 500 });
  }
}
