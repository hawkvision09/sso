import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/lib/storage/coupon-service';
import { resolveCouponRequestContext } from '@/app/api/data/coupons/_context';

export async function POST(request: NextRequest) {
    try {
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId } = resolved.context;

        const body = await request.json();
        const { couponCode, userId, userEmail, orderAmount, discountAmount, finalAmount } = body;

        if (!couponCode || orderAmount === undefined || discountAmount === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: couponCode, orderAmount, discountAmount' },
                { status: 400 }
            );
        }

        const couponService = new CouponService(accessToken, spreadsheetId);
        await couponService.recordCouponUsage(couponCode, {
            userId,
            userEmail,
            orderAmount: Number(orderAmount),
            discountAmount: Number(discountAmount),
            finalAmount: Number(finalAmount ?? (Number(orderAmount) - Number(discountAmount))),
        });

        return NextResponse.json({
            success: true,
            stats: { recorded: true },
        });
    } catch (error: any) {
        console.error('Failed to record coupon usage:', error);
        return NextResponse.json({ error: `Failed to record coupon usage: ${error.message}` }, { status: 500 });
    }
}
