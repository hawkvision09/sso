import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/lib/storage/coupon-service';
import { resolveCouponRequestContext } from '@/app/api/data/coupons/_context';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId } = resolved.context;
        const body = await request.json();
        const { newCode } = body;

        if (!newCode) {
            return NextResponse.json(
                { error: 'Missing required field: newCode' },
                { status: 400 }
            );
        }

        const couponService = new CouponService(accessToken, spreadsheetId);
        await couponService.duplicateCoupon(code, newCode);

        const duplicated = await couponService.getCouponByCode(newCode);

        return NextResponse.json({
            success: true,
            coupon: duplicated,
            message: `Coupon "${code}" duplicated as "${newCode}"`,
        });
    } catch (error: any) {
        console.error('Failed to duplicate coupon:', error);
        return NextResponse.json(
            { error: `Failed to duplicate coupon: ${error.message}` },
            { status: 500 }
        );
    }
}
