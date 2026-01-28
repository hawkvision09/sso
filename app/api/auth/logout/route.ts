import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, deleteSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('sso_token')?.value;
    
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        // Delete session from database
        await deleteSession(payload.session_id);
      }
    }
    
    // Clear cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
    
    response.cookies.delete('sso_token');
    
    return response;
  } catch (error: any) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to logout' },
      { status: 500 }
    );
  }
}
