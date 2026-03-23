import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { ensureAppContainer, getLinkedProviderAccessToken } from '@/lib/storage/service';

export interface CouponRequestContext {
  accessToken: string;
  spreadsheetId: string;
  userId: string;
  userEmail: string;
}

export async function resolveCouponRequestContext(
  request: NextRequest
): Promise<{ ok: true; context: CouponRequestContext } | { ok: false; response: NextResponse }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No Bearer token in Authorization header' },
        { status: 401 }
      ),
    };
  }

  const user = await getAuthenticatedUserFromRequest(request);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  try {
    const linked = await getLinkedProviderAccessToken(user.user_id);
    if (!linked) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Storage provider is not connected. Please connect storage in SSO first.' },
          { status: 400 }
        ),
      };
    }

    const appContainer = await ensureAppContainer(user.user_id, 'coupons');

    if (!appContainer.container_id) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Coupons storage container is not available' },
          { status: 400 }
        ),
      };
    }

    return {
      ok: true,
      context: {
        // Use provider OAuth access token for Drive/Sheets calls.
        accessToken: linked.accessToken,
        spreadsheetId: appContainer.container_id,
        userId: user.user_id,
        userEmail: user.email,
      },
    };
  } catch (error: any) {
    const message = error?.message || 'Failed to resolve coupons storage';
    const status = /not connected/i.test(message) ? 400 : 500;

    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status }),
    };
  }
}
