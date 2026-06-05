import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromRequest } from '@/lib/session';

export interface CostMgmtRequestContext {
  userId: string;
  userEmail: string;
}

export async function resolveCostMgmtRequestContext(
  request: NextRequest
): Promise<{ ok: true; context: CostMgmtRequestContext } | { ok: false; response: NextResponse }> {
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

  return {
    ok: true,
    context: {
      userId: user.user_id,
      userEmail: user.email,
    },
  };
}
