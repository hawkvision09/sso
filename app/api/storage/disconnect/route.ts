import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { disconnectProvider } from '@/lib/storage/service';

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await disconnectProvider(user.user_id);

    return NextResponse.json({
      success: true,
      message: 'Storage provider disconnected',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect provider' },
      { status: 500 }
    );
  }
}
