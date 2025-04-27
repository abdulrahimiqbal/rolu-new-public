import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Making sure the dynamic directive is at the top of the file
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache completely
export const fetchCache = 'force-no-store';

// Maximum number of pending claims allowed per user
const MAX_PENDING_CLAIMS = 3;

/**
 * GET /api/token/pending-claims
 * Returns pending token claims for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get userId from query params
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');

    if (!queryUserId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the requesting user matches the userId
    if (currentUser.id !== queryUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pending claims for the user using raw SQL query
    const pendingClaims = await prisma.$queryRaw`
      SELECT *
      FROM "TokenTransaction"
      WHERE "userId" = ${queryUserId}
      AND status_new = 'QUEUED'
      ORDER BY "createdAt" DESC
      LIMIT ${MAX_PENDING_CLAIMS}
    `;

    return NextResponse.json({
      success: true,
      data: pendingClaims,
      maxPendingClaims: MAX_PENDING_CLAIMS
    });
  } catch (error) {
    console.error('Error fetching pending claims:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch pending claims',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 