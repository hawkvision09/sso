import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/lib/storage/coupon-service';
import { resolveCouponRequestContext } from '@/app/api/data/coupons/_context';

export async function GET(request: NextRequest) {
    try {
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId } = resolved.context;

        const couponService = new CouponService(accessToken, spreadsheetId);
        const coupons = await couponService.getAllCoupons();

        const headers = [
            'code', 'type', 'value', 'minOrderValue', 'maxDiscount',
            'validFrom', 'validUntil', 'usageLimit', 'usageLimitPerUser',
            'usageCount', 'status', 'applicableProducts', 'applicableCategories',
            'userType', 'allowedEmails', 'stackable', 'applyOnSale', 'description'
        ];

        const rows = coupons.map((coupon) => [
            coupon.code,
            coupon.type,
            coupon.value,
            coupon.minOrderValue || 0,
            coupon.maxDiscount || 0,
            coupon.validFrom || '',
            coupon.validUntil || '',
            coupon.usageLimit || 0,
            coupon.usageLimitPerUser || 0,
            coupon.usageCount || 0,
            coupon.status || '',
            (coupon.applicableProducts || []).join(';'),
            (coupon.applicableCategories || []).join(';'),
            coupon.userType || 'all',
            (coupon.allowedEmails || []).join(';'),
            coupon.stackable ? 'TRUE' : 'FALSE',
            coupon.applyOnSale ? 'TRUE' : 'FALSE',
            `"${(coupon.description || '').replace(/"/g, '""')}"`,
        ]);

        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="coupons-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch (error: any) {
        console.error('Failed to export coupons:', error);
        return NextResponse.json({ error: `Failed to export coupons: ${error.message}` }, { status: 500 });
    }
}
