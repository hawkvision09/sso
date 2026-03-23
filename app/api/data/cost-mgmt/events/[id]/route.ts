import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService } from '@/lib/storage/cost-mgmt-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.status || !['active', 'inactive'].includes(body.status)) {
      return NextResponse.json({ error: 'Body must include status: "active" | "inactive"' }, { status: 400 });
    }

    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CostMgmtService(accessToken, spreadsheetId);

    const updated = await service.updateEventStatus(id, body.status);
    if (!updated) {
      return NextResponse.json({ error: `Event ${id} not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, event_id: id, status: body.status });
  } catch (error: any) {
    console.error('Failed to update cost event status:', error);
    return NextResponse.json({ error: `Failed to update event: ${error.message}` }, { status: 500 });
  }
}
