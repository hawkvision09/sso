import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/lib/storage/coupon-service';
import { resolveCouponRequestContext } from '@/app/api/data/coupons/_context';

export async function POST(request: NextRequest) {
    try {
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId } = resolved.context;

        const body = await request.json();
        const { couponCode, orderAmount = 0, userEmail, userType = 'user', products = [], categories = [] } = body;

        if (!couponCode) {
            return NextResponse.json({ valid: false, reason: 'Missing couponCode' }, { status: 400 });
        }

        const couponService = new CouponService(accessToken, spreadsheetId);
        const coupon = await couponService.getCouponByCode(couponCode);

        if (!coupon) {
            return NextResponse.json({ valid: false, reason: 'Coupon not found' });
        }

        const applicable = await couponService.getApplicableCoupons({
            userEmail,
            userType,
            products,
            categories,
            orderAmount,
        });

        const isValid = applicable.some((c) => c.code.toUpperCase() === coupon.code.toUpperCase());
        if (!isValid) {
            return NextResponse.json({ valid: false, reason: 'Coupon is not applicable for this order' });
        }

        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = (orderAmount * coupon.value) / 100;
            if (coupon.maxDiscount && coupon.maxDiscount > 0) {
                discount = Math.min(discount, coupon.maxDiscount);
            }
        } else {
            discount = coupon.value;
        }

        discount = Math.max(0, Math.min(discount, orderAmount));
        const finalAmount = Math.max(0, orderAmount - discount);

        return NextResponse.json({
            valid: true,
            coupon,
            discount,
            finalAmount,
        });
    } catch (error: any) {
        console.error('Failed to validate coupon:', error);
        return NextResponse.json({ error: `Failed to validate coupon: ${error.message}` }, { status: 500 });
    }
}
