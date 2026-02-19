import { NextResponse } from 'next/server';
import { initializeSheets } from '@/lib/sheets';
import { validateConfig } from '@/lib/config';

export async function GET() {
  try {
    // Validate configuration
    validateConfig();
    
    // Initialize sheets
    await initializeSheets();
    
    return NextResponse.json({
      success: true,
      message: 'Sheets initialized successfully',
    });
  } catch (error: any) {
    console.error('Initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize' },
      { status: 500 }
    );
  }
}
