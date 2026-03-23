import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { getUserStorageStatus } from '@/lib/storage/service';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const status = await getUserStorageStatus(user.user_id);
    return NextResponse.json({
      user_id: user.user_id,
      ...status,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch storage status' },
      { status: 500 }
    );
  }
}
