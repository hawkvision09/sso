import { NextRequest, NextResponse } from 'next/server';
import { resolveCateringRequestContext } from '@/app/api/data/catering/_context';
import { CateringService } from '@/lib/storage/catering-service';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { userId } = resolved.context;
    const service = new CateringService(userId);
    const summary = await service.getDebugSummary();

    return NextResponse.json(summary);
  } catch (error: unknown) {
    console.error('Failed to run catering debug check:', error);
    const message = error instanceof Error ? error.message : 'Debug check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
