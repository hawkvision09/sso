import { NextRequest, NextResponse } from 'next/server';
import { CouponService } from '@/lib/storage/coupon-service';
import { resolveCouponRequestContext } from '@/app/api/data/coupons/_context';

// GET /api/data/coupons/[code]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId } = resolved.context;

        const couponService = new CouponService(accessToken, spreadsheetId);
        const coupon = await couponService.getCouponByCode(code);

        if (!coupon) {
            return NextResponse.json(
                { error: `Coupon "${code}" not found` },
                { status: 404 }
            );
        }

        return NextResponse.json({ coupon });
    } catch (error: any) {
        console.error('Failed to fetch coupon:', error);
        return NextResponse.json(
            { error: `Failed to fetch coupon: ${error.message}` },
            { status: 500 }
        );
    }
}

// PUT /api/data/coupons/[code]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId } = resolved.context;
        const body = await request.json();

        const parseCommaSeparated = (value: string | undefined): string[] => {
            if (!value || value.trim() === '') return [];
            return value.split(',').map(item => item.trim()).filter(item => item !== '');
        };

        const updates: any = {};
        
        if (body.type) updates.type = body.type;
        if (body.value !== undefined) updates.value = Number(body.value);
        if (body.minOrderValue !== undefined) updates.minOrderValue = Number(body.minOrderValue);
        if (body.maxDiscount !== undefined) updates.maxDiscount = Number(body.maxDiscount);
        if (body.validFrom !== undefined) updates.validFrom = body.validFrom;
        if (body.validUntil !== undefined) updates.validUntil = body.validUntil;
        if (body.usageLimit !== undefined) updates.usageLimit = Number(body.usageLimit);
        if (body.usageLimitPerUser !== undefined) updates.usageLimitPerUser = Number(body.usageLimitPerUser);
        if (body.applicableProducts !== undefined) updates.applicableProducts = parseCommaSeparated(body.applicableProducts);
        if (body.applicableCategories !== undefined) updates.applicableCategories = parseCommaSeparated(body.applicableCategories);
        if (body.userType !== undefined) updates.userType = body.userType;
        if (body.allowedEmails !== undefined) updates.allowedEmails = parseCommaSeparated(body.allowedEmails);
        if (body.stackable !== undefined) updates.stackable = body.stackable === true || body.stackable === 'true';
        if (body.applyOnSale !== undefined) updates.applyOnSale = body.applyOnSale === true || body.applyOnSale === 'true';
        if (body.description !== undefined) updates.description = body.description;

        const couponService = new CouponService(accessToken, spreadsheetId);
        await couponService.updateCoupon(code, updates);

        const updated = await couponService.getCouponByCode(code);

        return NextResponse.json({
            success: true,
            coupon: updated,
            message: 'Coupon updated successfully',
        });
    } catch (error: any) {
        console.error('Failed to update coupon:', error);
        return NextResponse.json(
            { error: `Failed to update coupon: ${error.message}` },
            { status: 500 }
        );
    }
}

// DELETE /api/data/coupons/[code]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;
        const resolved = await resolveCouponRequestContext(request);
        if (!resolved.ok) return resolved.response;
        const { accessToken, spreadsheetId } = resolved.context;

        const couponService = new CouponService(accessToken, spreadsheetId);
        await couponService.deleteCoupon(code);

        return NextResponse.json({
            success: true,
            message: `Coupon "${code}" deleted successfully`,
        });
    } catch (error: any) {
        console.error('Failed to delete coupon:', error);
        return NextResponse.json(
            { error: `Failed to delete coupon: ${error.message}` },
            { status: 500 }
        );
    }
}
