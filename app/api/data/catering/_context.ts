import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';
import { ensureAppContainer, getLinkedProviderAccessToken } from '@/lib/storage/service';

export interface CateringRequestContext {
  accessToken: string;
  spreadsheetId: string;
  userId: string;
  userEmail: string;
}

export async function resolveCateringRequestContext(
  request: NextRequest
): Promise<{ ok: true; context: CateringRequestContext } | { ok: false; response: NextResponse }> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No Bearer token in Authorization header' }, { status: 401 }),
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

    const appContainer = await ensureAppContainer(user.user_id, 'catering');
    if (!appContainer.container_id) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Catering storage container is not available' }, { status: 400 }),
      };
    }

    return {
      ok: true,
      context: {
        accessToken: linked.accessToken,
        spreadsheetId: appContainer.container_id,
        userId: user.user_id,
        userEmail: user.email,
      },
    };
  } catch (error: any) {
    const message = error?.message || 'Failed to resolve catering storage';
    const status = /not connected/i.test(message) ? 400 : 500;

    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status }),
    };
  }
}
