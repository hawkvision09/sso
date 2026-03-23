import { NextRequest, NextResponse } from 'next/server';
import { resolveCateringRequestContext } from '@/app/api/data/catering/_context';
import { CateringService } from '@/lib/storage/catering-service';

function isPastDate(eventDate: string): boolean {
  const match = /^\d{4}-\d{2}-\d{2}$/.test(eventDate);
  if (!match) return true;

  const [year, month, day] = eventDate.split('-').map(Number);
  const event = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return event.getTime() < today.getTime();
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CateringService(accessToken, spreadsheetId);
    const proposals = await service.getAllProposals();

    proposals.sort((a, b) => {
      const dateA = new Date(a.createdDate).getTime();
      const dateB = new Date(b.createdDate).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(proposals);
  } catch (error: any) {
    console.error('Failed to fetch catering proposals:', error);
    return NextResponse.json({ error: `Failed to fetch proposals: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId, userEmail } = resolved.context;
    const service = new CateringService(accessToken, spreadsheetId);
    const body = await request.json();

    const { proposalId, clientName, contactNumber, email, eventDate, guestCount, eventType, appBaseUrl } = body;

    if (!proposalId || !clientName || !contactNumber || !eventDate || !guestCount || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (isPastDate(eventDate)) {
      return NextResponse.json({ error: 'Event date must be today or a future date' }, { status: 400 });
    }

    await service.createProposal({
      proposalId,
      clientName,
      contactNumber,
      email: email || '',
      eventDate,
      guestCount: parseInt(String(guestCount), 10),
      eventType,
      createdBy: userEmail,
    }, appBaseUrl);

    return NextResponse.json({
      success: true,
      proposalId,
      message: 'Proposal created successfully',
    });
  } catch (error: any) {
    console.error('Failed to create catering proposal:', error);
    return NextResponse.json({ error: `Failed to create proposal: ${error.message}` }, { status: 500 });
  }
}
