import { NextRequest, NextResponse } from 'next/server';
import { resolveCateringRequestContext } from '@/app/api/data/catering/_context';
import { CateringService } from '@/lib/storage/catering-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { menuItems, totalPrice } = body;

    if (!id) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    if (!menuItems || !Array.isArray(menuItems) || menuItems.length === 0) {
      return NextResponse.json({ error: 'Menu items are required' }, { status: 400 });
    }

    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CateringService(accessToken, spreadsheetId);

    const result = await service.saveProposalVersion(id, menuItems, Number(totalPrice || 0), 'Client');

    return NextResponse.json({
      success: true,
      versionId: result.versionId,
      versionNumber: result.versionNumber,
      message: 'Menu selection saved successfully',
    });
  } catch (error: any) {
    console.error('Failed to save proposal version:', error);
    return NextResponse.json({ error: `Failed to save menu selection: ${error.message}` }, { status: 500 });
  }
}
