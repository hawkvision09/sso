import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { getAppContainer, getUserStorageStatus } from '@/lib/storage/service';
import { CateringService } from '@/lib/storage/catering-service';
import { CouponService } from '@/lib/storage/coupon-service';
import { CostMgmtService } from '@/lib/storage/cost-mgmt-service';

export async function GET(
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
        connected: true,
        provider: 'mongo',
        appReady: true,
        appName: normalizedAppName,
        containerId: `mongo:${user.user_id}:catering`,
        schemaVersion: 'v2-mongo',
      });
    }

    if (normalizedAppName === 'coupons') {
      const service = new CouponService(user.user_id);
      await service.ensureCouponSheets();

      return NextResponse.json({
        connected: true,
        provider: 'mongo',
        appReady: true,
        appName: normalizedAppName,
        containerId: `mongo:${user.user_id}:coupons`,
        schemaVersion: 'v2-mongo',
      });
    }

    if (normalizedAppName === 'cost-mgmt') {
      const service = new CostMgmtService(user.user_id);
      await service.ensureSheets();

      return NextResponse.json({
        connected: true,
        provider: 'mongo',
        appReady: true,
        appName: normalizedAppName,
        containerId: `mongo:${user.user_id}:cost-mgmt`,
        schemaVersion: 'v2-mongo',
      });
    }

    const storage = await getUserStorageStatus(user.user_id);

    if (!storage.connected) {
      return NextResponse.json({
        connected: false,
        appReady: false,
        appName,
      });
    }

    const container = await getAppContainer(user.user_id, appName.trim().toLowerCase());

    return NextResponse.json({
      connected: true,
      provider: storage.provider,
      appReady: Boolean(container?.container_id),
      appName,
      containerId: container?.container_id || null,
      schemaVersion: container?.schema_version || null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get app storage status' },
      { status: 500 }
    );
  }
}
