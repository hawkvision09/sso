import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getRows, SHEET_NAMES } from '@/lib/sheets';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sso_token');
  
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = verifyToken(token.value);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const services = await getRows(SHEET_NAMES.SERVICES);
    const entitlements = await getRows(SHEET_NAMES.ENTITLEMENTS);
    
    // Filter entitlements for this user
    // @ts-ignore
    const userEntitlements = entitlements.filter(e => e.user_id === user.userId);

    const result = services.map(service => {
      // @ts-ignore
      const entitlement = userEntitlements.find(e => e.service_id === service.service_id);
      
      const isFreeTier = String(service.free_tier_enabled).toUpperCase() === 'TRUE';

      return {
        ...service,
        entitlement: entitlement ? {
          tier: entitlement.tier_level,
          valid_until: entitlement.valid_until
        } : null,
        // Access is granted if they have an entitlement OR if free tier is enabled
        can_access: !!entitlement || isFreeTier
      };
    });

    return NextResponse.json({ services: result });

  } catch (error) {
     console.error(error);
     return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
