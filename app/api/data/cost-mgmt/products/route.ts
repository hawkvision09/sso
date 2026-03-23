import { NextRequest, NextResponse } from 'next/server';
import { resolveCostMgmtRequestContext } from '@/app/api/data/cost-mgmt/_context';
import { CostMgmtService } from '@/lib/storage/cost-mgmt-service';

function slugifyToId(name: string): string {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

  return `PRD-${slug || Date.now().toString().slice(-6)}`;
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CostMgmtService(accessToken, spreadsheetId);

    const products = await service.getProductsIncludingInferred();
    return NextResponse.json({ products, count: products.length });
  } catch (error: any) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ error: `Failed to fetch products: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveCostMgmtRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId, userEmail } = resolved.context;
    const service = new CostMgmtService(accessToken, spreadsheetId);
    const body = await request.json();

    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 });
    }

    const providedId = String(body.product_id || '').trim();
    const product_id = (providedId || slugifyToId(name)).toUpperCase();

    const product = await service.createProduct({
      product_id,
      name,
      description: String(body.description || '').trim(),
      created_by: userEmail,
      created_at: new Date().toISOString(),
      status: 'active',
    });

    const products = await service.getProductsIncludingInferred();

    return NextResponse.json(
      {
        success: true,
        product,
        products,
        count: products.length,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create product:', error);
    const status = /already exists/i.test(String(error?.message || '')) ? 409 : 500;
    return NextResponse.json({ error: `Failed to create product: ${error.message}` }, { status });
  }
}
