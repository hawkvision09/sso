import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService, type CostEvent } from '@/lib/storage/cost-mgmt-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CostMgmtService(userId);

    let events = await service.getAllEvents();

    const status = request.nextUrl.searchParams.get('status');
    const category = request.nextUrl.searchParams.get('category');
    const productId = request.nextUrl.searchParams.get('product_id');

    if (status) {
      events = events.filter((event) => event.status === status);
    }

    if (category) {
      events = events.filter((event) => event.category === category);
    }

    if (productId) {
      events = events.filter((event) => event.product_id === productId);
    }

    return NextResponse.json({ events, count: events.length });
  } catch (error: unknown) {
    console.error('Failed to fetch cost events:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch events: ${message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CostMgmtService(userId);
    const body = (await request.json()) as CostEvent;

    const required = ['event_id', 'title', 'category', 'cost_type', 'amount', 'start_date', 'status'] as const;
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    await service.appendEvent(body);

    return NextResponse.json({ success: true, event: body }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create cost event:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to create event: ${message}` }, { status: 500 });
  }
}
