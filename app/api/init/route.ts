import { NextResponse } from 'next/server';
import { initializeSheets } from '@/lib/sheets';

export async function GET() {
  try {
    await initializeSheets();
    return NextResponse.json({ success: true, message: 'Sheets initialized' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
