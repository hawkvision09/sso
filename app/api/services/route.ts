import { NextRequest, NextResponse } from 'next/server';
import { getAllServices } from '@/lib/services';

// GET /api/services - Get all services (public endpoint for authenticated users)
export async function GET(request: NextRequest) {
  try {
    const services = await getAllServices();
    
    return NextResponse.json({ services });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
