import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { getAppContainer, getUserStorageStatus } from '@/lib/storage/service';

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
