import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { getProvider, isSupportedProvider } from '@/lib/storage/providers';
import { assertProviderCanConnect } from '@/lib/storage/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { provider } = await params;
    if (!isSupportedProvider(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
    }

    await assertProviderCanConnect(user.user_id, provider);

    const body = await request.json().catch(() => ({}));
    const returnTo = typeof body.returnTo === 'string' && body.returnTo.startsWith('/')
      ? body.returnTo
      : '/dashboard';

    const statePayload = Buffer.from(
      JSON.stringify({ userId: user.user_id, provider, returnTo }),
      'utf8'
    ).toString('base64url');

    const connectUrl = await getProvider(provider).getConnectUrl(statePayload);

    return NextResponse.json({
      success: true,
      provider,
      connectUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start storage connect';
    const status = /already connected|not implemented|missing providerconfig|disabled in providerconfig|missing client_id\/client_secret\/redirect_uri/i.test(message)
      ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
