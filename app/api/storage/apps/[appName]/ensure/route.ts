import { NextResponse } from 'next/server';
import { ensureAppContainer } from '@/lib/storage/service';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { CateringService } from '@/lib/storage/catering-service';
import { CouponService } from '@/lib/storage/coupon-service';
import { CostMgmtService } from '@/lib/storage/cost-mgmt-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ appName: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { appName } = await params;
    const normalizedAppName = appName.trim().toLowerCase();

    if (normalizedAppName === 'catering') {
      const service = new CateringService(user.user_id);
      await service.ensureSheets();

      return NextResponse.json({
        success: true,
        appName: normalizedAppName,
        containerId: `mongo:${user.user_id}:catering`,
        schemaVersion: 'v2-mongo',
      });
    }

    if (normalizedAppName === 'coupons') {
      const service = new CouponService(user.user_id);
      await service.ensureCouponSheets();

      return NextResponse.json({
        success: true,
        appName: normalizedAppName,
        containerId: `mongo:${user.user_id}:coupons`,
        schemaVersion: 'v2-mongo',
      });
    }

    if (normalizedAppName === 'cost-mgmt') {
      const service = new CostMgmtService(user.user_id);
      await service.ensureSheets();

      return NextResponse.json({
        success: true,
        appName: normalizedAppName,
        containerId: `mongo:${user.user_id}:cost-mgmt`,
        schemaVersion: 'v2-mongo',
      });
    }

    const container = await ensureAppContainer(user.user_id, appName);

    return NextResponse.json({
      success: true,
      appName: container.app_name,
      containerId: container.container_id,
      schemaVersion: container.schema_version,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to ensure app container';
    const status = /not connected/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
