import { NextRequest, NextResponse } from 'next/server';
import { resolveCateringRequestContext } from '@/app/api/data/catering/_context';
import { CateringService } from '@/lib/storage/catering-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CateringService(accessToken, spreadsheetId);

    const success = await service.updateProposalNegotiation(id, body);
    if (!success) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Negotiation updated successfully' });
  } catch (error: any) {
    console.error('Failed to update proposal negotiation:', error);
    return NextResponse.json({ error: `Failed to update negotiation details: ${error.message}` }, { status: 500 });
  }
}
