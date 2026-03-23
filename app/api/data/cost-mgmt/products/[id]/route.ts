import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService } from '@/lib/storage/cost-mgmt-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = decodeURIComponent(String(id || '')).trim();

    if (!productId) {
      return NextResponse.json({ error: 'Missing product id' }, { status: 400 });
    }

    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CostMgmtService(accessToken, spreadsheetId);

    const result = await service.deleteProduct(productId);

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({ error: `Failed to delete product: ${error.message}` }, { status: 500 });
  }
}
