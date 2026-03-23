import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService, type CostEvent } from '@/lib/storage/cost-mgmt-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CostMgmtService(accessToken, spreadsheetId);

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
  } catch (error: any) {
    console.error('Failed to fetch cost events:', error);
    return NextResponse.json({ error: `Failed to fetch events: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CostMgmtService(accessToken, spreadsheetId);
    const body = (await request.json()) as CostEvent;

    const required = ['event_id', 'title', 'category', 'cost_type', 'amount', 'start_date', 'status'];
    for (const field of required) {
      if ((body as any)[field] === undefined || (body as any)[field] === null || (body as any)[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    await service.appendEvent(body);

    return NextResponse.json({ success: true, event: body }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create cost event:', error);
    return NextResponse.json({ error: `Failed to create event: ${error.message}` }, { status: 500 });
  }
}
