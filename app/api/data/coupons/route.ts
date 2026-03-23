import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/lib/storage/coupon-service';
import { resolveCouponRequestContext } from '@/app/api/data/coupons/_context';

export async function GET(request: NextRequest) {
    try {
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId } = resolved.context;

        // Get coupons
        const couponService = new CouponService(accessToken, spreadsheetId);
        const coupons = await couponService.getAllCoupons();

        return NextResponse.json({
            coupons,
            total: coupons.length,
        });
    } catch (error: any) {
        console.error('Failed to fetch coupons:', error);
        return NextResponse.json(
            { error: `Failed to fetch coupons: ${error.message}` },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId, userEmail } = resolved.context;

        const body = await request.json();


        const {
            code,
            type,
            value,
            minOrderValue,
            maxDiscount,
            validFrom,
            validUntil,
            usageLimit,
            usageLimitPerUser,
            applicableProducts,
            applicableCategories,
            userType,
            allowedEmails,
            stackable,
            applyOnSale,
            description,
        } = body;

        // Validation
        if (!code || !type || value === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: code, type, value' },
                { status: 400 }
            );
        }

        const parseCommaSeparated = (value: string | undefined): string[] => {
            if (!value || value.trim() === '') return [];
            return value.split(',').map(item => item.trim()).filter(item => item !== '');
        };

        const coupon = {
            id: `CPN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            code: code.toUpperCase(),
            type,
            value: Number(value),
            minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
            maxDiscount: maxDiscount ? Number(maxDiscount) : 0,
            validFrom: validFrom || '',
            validUntil: validUntil || '',
            usageLimit: usageLimit ? Number(usageLimit) : 0,
            usageLimitPerUser: usageLimitPerUser ? Number(usageLimitPerUser) : 0,
            usageCount: 0,
            applicableProducts: parseCommaSeparated(applicableProducts),
            applicableCategories: parseCommaSeparated(applicableCategories),
            userType: userType || 'all',
            allowedEmails: parseCommaSeparated(allowedEmails),
            stackable: stackable === true || stackable === 'true',
            applyOnSale: applyOnSale === true || applyOnSale === 'true',
            description: description || '',
            createdAt: new Date().toISOString(),
            createdBy: userEmail,
        };

        const couponService = new CouponService(accessToken, spreadsheetId);
        await couponService.createCoupon(coupon);

        return NextResponse.json({
            success: true,
            coupon,
            message: 'Coupon created successfully',
        });
    } catch (error: any) {
        console.error('Failed to create coupon:', error);
        return NextResponse.json(
            { error: `Failed to create coupon: ${error.message}` },
            { status: 500 }
        );
    }
}
