import { NextRequest, NextResponse } from 'next/server';
import { resolveCateringRequestContext } from '@/app/api/data/catering/_context';
import { CateringService } from '@/lib/storage/catering-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body.status === 'Cancelled' ? 'Cancelled' : 'Completed';

    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CateringService(userId);

    const success = await service.deleteProposal(id, status);
    if (!success) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete proposal:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to delete proposal: ${message}` }, { status: 500 });
  }
}
