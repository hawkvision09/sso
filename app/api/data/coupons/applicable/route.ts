import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/lib/storage/coupon-service';
import { resolveCouponRequestContext } from '@/app/api/data/coupons/_context';

export async function GET(request: NextRequest) {
    try {
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId } = resolved.context;

        const searchParams = request.nextUrl.searchParams;
        const userEmail = searchParams.get('userEmail') || undefined;
        const userType = searchParams.get('userType') || 'user';
        const products = (searchParams.get('products') || '').split(',').filter(Boolean);
        const categories = (searchParams.get('categories') || '').split(',').filter(Boolean);
        const orderAmountParam = searchParams.get('orderAmount');
        const orderAmount = orderAmountParam ? Number(orderAmountParam) : undefined;

        const couponService = new CouponService(accessToken, spreadsheetId);
        const coupons = await couponService.getApplicableCoupons({
            userEmail,
            userType,
            products,
            categories,
            orderAmount,
        });

        return NextResponse.json({ coupons, total: coupons.length });
    } catch (error: any) {
        console.error('Failed to fetch applicable coupons:', error);
        return NextResponse.json({ error: `Failed to fetch applicable coupons: ${error.message}` }, { status: 500 });
    }
}
