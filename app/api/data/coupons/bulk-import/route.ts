import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/lib/storage/coupon-service';
import { resolveCouponRequestContext } from '@/app/api/data/coupons/_context';

type BulkImportError = {
    code: string;
    error: string;
};

export async function POST(request: NextRequest) {
    try {
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { userId, userEmail } = resolved.context;

        const body = await request.json();
        const coupons = Array.isArray(body.coupons) ? body.coupons : [];

        if (coupons.length === 0) {
            return NextResponse.json({ error: 'coupons must be a non-empty array' }, { status: 400 });
        }

        const couponService = new CouponService(userId);

        let created = 0;
        let skipped = 0;
        const errors: BulkImportError[] = [];

        for (const input of coupons) {
            try {
                if (!input.code || !input.type || input.value === undefined) {
                    skipped++;
                    errors.push({ code: input.code || 'UNKNOWN', error: 'Missing required fields: code, type, value' });
                    continue;
                }

                await couponService.createCoupon({
                    id: `CPN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    code: String(input.code).toUpperCase(),
                    type: input.type,
                    value: Number(input.value),
                    minOrderValue: Number(input.minOrderValue || 0),
                    maxDiscount: Number(input.maxDiscount || 0),
                    validFrom: input.validFrom || '',
                    validUntil: input.validUntil || '',
                    usageLimit: Number(input.usageLimit || 0),
                    usageLimitPerUser: Number(input.usageLimitPerUser || 0),
                    usageCount: 0,
                    applicableProducts: Array.isArray(input.applicableProducts) ? input.applicableProducts : [],
                    applicableCategories: Array.isArray(input.applicableCategories) ? input.applicableCategories : [],
                    userType: input.userType || 'all',
                    allowedEmails: Array.isArray(input.allowedEmails) ? input.allowedEmails : [],
                    stackable: !!input.stackable,
                    applyOnSale: !!input.applyOnSale,
                    description: input.description || '',
                    createdAt: new Date().toISOString(),
                    createdBy: userEmail,
                });

                created++;
            } catch (error: unknown) {
                skipped++;
                errors.push({
                    code: input.code || 'UNKNOWN',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return NextResponse.json({ success: true, created, skipped, errors });
    } catch (error: unknown) {
        console.error('Failed to bulk import coupons:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: `Failed to bulk import coupons: ${message}` }, { status: 500 });
    }
}
