import { NextResponse } from 'next/server';
import { ensureAppContainer } from '@/lib/storage/service';
import { getAuthenticatedUserFromRequest } from '@/lib/session';

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
