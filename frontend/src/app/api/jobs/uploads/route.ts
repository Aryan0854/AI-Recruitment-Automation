import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/jobs/uploads - List upload tasks logging history
export async function GET(request: NextRequest) {
  try {
    const uploads = await db.getUploads();
    return NextResponse.json(uploads);
  } catch (err: any) {
    console.error('[API GET Uploads] Error:', err.message);
    return NextResponse.json({ error: 'Failed to retrieve uploads history.' }, { status: 500 });
  }
}
