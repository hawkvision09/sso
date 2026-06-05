import { NextRequest, NextResponse } from 'next/server';
import { resolveCouponRequestContext } from '@/app/api/data/coupons/_context';
import { CouponService } from '@/lib/storage/coupon-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCouponRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CouponService(userId);
    const limitParam = Number(request.nextUrl.searchParams.get('limit') || 20);
    const logs = await service.getActivityLogs(limitParam);

    return NextResponse.json({ logs, count: logs.length });
  } catch (error: unknown) {
    console.error('Failed to fetch coupon activity:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to fetch activity logs: ${message}` }, { status: 500 });
  }
}
