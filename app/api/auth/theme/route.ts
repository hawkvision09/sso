import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/session';
import { updateUserTheme } from '@/lib/auth';
import { getThemeCookieOptions, isThemeName, resolveThemeName } from '@/lib/theme';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { theme } = await request.json();
    if (!isThemeName(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }

    const updatedUser = await updateUserTheme(user.user_id, resolveThemeName(theme));
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = NextResponse.json({
      success: true,
      theme: updatedUser.theme,
    });

    const themeCookie = getThemeCookieOptions(updatedUser.theme);
    response.cookies.set(themeCookie.name, themeCookie.value, themeCookie.options);

    return response;
  } catch (error: any) {
    console.error('Theme update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update theme' },
      { status: 500 }
    );
  }
}
