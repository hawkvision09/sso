import { NextResponse } from 'next/server';
import { findRowByColumn, updateRow, findRowIndexByColumn, SHEET_NAMES, getRows } from '@/lib/sheets';
import { findRowsByColumn } from '@/lib/sheets';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Auth code is required' }, { status: 400 });
    }

    // 1. Find Code
    // We need to check if used. Using findRowByColumn gives us the first match.
    // Ideally we should have a better DB, but here we scan.
    const authCodeRow = await findRowByColumn(SHEET_NAMES.AUTH_CODES, 'code', code);

    if (!authCodeRow) {
       return NextResponse.json({ error: 'Invalid Code' }, { status: 400 });
    }

    // 2. Validate Code
    if (authCodeRow.used === 'TRUE') {
        return NextResponse.json({ error: 'Code already used' }, { status: 400 });
    }

    if (Date.now() > Number(authCodeRow.expires_at)) {
        return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    // 3. Mark Code as Used
    const rowIndex = await findRowIndexByColumn(SHEET_NAMES.AUTH_CODES, 'code', code);
    if (rowIndex > -1) {
        // Update the row. Original: code, user_id, service_id, expires_at, used
        // We set used to TRUE
        const updatedRow = [
             authCodeRow.code,
             authCodeRow.user_id,
             authCodeRow.service_id,
             authCodeRow.expires_at,
             'TRUE'
        ];
        // Only updating columns A-E
        await updateRow(SHEET_NAMES.AUTH_CODES, `A${rowIndex}:E${rowIndex}`, updatedRow);
    } else {
         // Race condition safeguard
         return NextResponse.json({ error: 'System Error: Code not found during update' }, { status: 500 });
    }

    // 4. Fetch User Details
    const user = await findRowByColumn(SHEET_NAMES.USERS, 'user_id', authCodeRow.user_id);
    
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 500 });
    }

    // 5. Return User Profile
    return NextResponse.json({
        success: true,
        user: {
            user_id: user.user_id,
            email: user.email,
            role: user.role
        }
    });

  } catch (error) {
    console.error('Token Exchange Error:', error);
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 });
  }
}
