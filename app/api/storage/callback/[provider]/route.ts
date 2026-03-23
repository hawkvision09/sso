import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { connectProvider } from '@/lib/storage/service';
import { getProvider, isSupportedProvider } from '@/lib/storage/providers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const url = new URL(request.url);

  try {
    const user = await getAuthenticatedUserFromRequest(request);
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { provider } = await params;
    if (!isSupportedProvider(provider)) {
      return NextResponse.redirect(new URL('/dashboard?storage_error=unsupported_provider', request.url));
    }

    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard?storage_error=missing_oauth_params', request.url));
    }

    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
      userId: string;
      provider: string;
      returnTo?: string;
    };

    if (decoded.userId !== user.user_id || decoded.provider !== provider) {
      return NextResponse.redirect(new URL('/dashboard?storage_error=state_mismatch', request.url));
    }

    const providerImpl = getProvider(provider);
    const oauthResult = await providerImpl.exchangeCode(code);

    await connectProvider({
      userId: user.user_id,
      provider,
      accessToken: oauthResult.accessToken,
      refreshToken: oauthResult.refreshToken,
      tokenExpiresAt: oauthResult.tokenExpiresAt,
    });

    const returnTo = decoded.returnTo && decoded.returnTo.startsWith('/')
      ? decoded.returnTo
      : '/dashboard';

    return NextResponse.redirect(new URL(`${returnTo}?storage_connected=${provider}`, request.url));
  } catch (error) {
    console.error('[STORAGE CALLBACK] Error:', error);
    return NextResponse.redirect(new URL('/dashboard?storage_error=callback_failed', request.url));
  }
}
