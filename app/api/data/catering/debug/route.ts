import { NextRequest, NextResponse } from 'next/server';
import { resolveCateringRequestContext } from '@/app/api/data/catering/_context';
import { CateringService } from '@/lib/storage/catering-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CateringService(accessToken, spreadsheetId);
    await service.ensureSheets();
    const proposals = await service.getAllProposals();

    return NextResponse.json({
      success: true,
      spreadsheetId,
      proposalsCount: proposals.length,
      note: 'Auth is managed by SSO and storage is per-user.',
    });
  } catch (error: any) {
    console.error('Failed to run catering debug check:', error);
    return NextResponse.json({ error: error.message || 'Debug check failed' }, { status: 500 });
  }
}
