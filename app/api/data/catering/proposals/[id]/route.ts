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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CateringService(accessToken, spreadsheetId);

    const [proposal, latestVersion] = await Promise.all([
      service.getProposal(id),
      service.getLatestProposalVersion(id),
    ]);

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...proposal,
      latestVersion,
    });
  } catch (error: any) {
    console.error('Failed to fetch catering proposal:', error);
    return NextResponse.json({ error: `Failed to fetch proposal: ${error.message}` }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Proposal ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { clientName, contactNumber, email, eventDate, guestCount, eventType } = body;

    if (!clientName || !contactNumber || !eventDate || !guestCount || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (isPastDate(eventDate)) {
      return NextResponse.json({ error: 'Event date must be today or a future date' }, { status: 400 });
    }

    const resolved = await resolveCateringRequestContext(request);
    if (!resolved.ok) return resolved.response;

    const { accessToken, spreadsheetId } = resolved.context;
    const service = new CateringService(accessToken, spreadsheetId);

    const success = await service.updateProposalDetails(id, {
      clientName,
      contactNumber,
      email: email || '',
      eventDate,
      guestCount: parseInt(String(guestCount), 10),
      eventType,
    });

    if (!success) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const [proposal, latestVersion] = await Promise.all([
      service.getProposal(id),
      service.getLatestProposalVersion(id),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Event details updated successfully',
      proposal: {
        ...proposal,
        latestVersion,
      },
    });
  } catch (error: any) {
    console.error('Failed to update catering proposal details:', error);
    return NextResponse.json({ error: `Failed to update proposal details: ${error.message}` }, { status: 500 });
  }
}
