import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Ensuring the route is properly marked as dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache completely
export const fetchCache = 'force-no-store';

/**
 * GET /api/token/failed-claims
 * Returns failed token claims for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get userId from query params
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');

    if (!queryUserId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify the requesting user matches the userId
    if (currentUser.id !== queryUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // First check if retry_count column exists
    let hasRetryCountColumn = false;
    try {
      const columnExists = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'TokenTransaction' 
        AND column_name = 'retry_count'
      `;
      hasRetryCountColumn = Array.isArray(columnExists) && (columnExists as any[]).length > 0;
    } catch (error) {
      console.warn('Error checking retry_count column existence:', error);
    }

    // Get failed claims for the user
    let failedClaims;
    if (hasRetryCountColumn) {
      // If retry_count column exists, use it in the query
      failedClaims = await prisma.$queryRaw`
        SELECT * FROM "TokenTransaction"
        WHERE "userId" = ${queryUserId}
        AND status_new = 'FAILED'
        AND retry_count >= 3
        ORDER BY "updatedAt" DESC
      `;
    } else {
      // If retry_count column doesn't exist yet, only filter by status
      failedClaims = await prisma.$queryRaw`
        SELECT * FROM "TokenTransaction"
        WHERE "userId" = ${queryUserId}
        AND status_new = 'FAILED'
        ORDER BY "updatedAt" DESC
      `;
    }

    return NextResponse.json({
      success: true,
      data: failedClaims
    });
  } catch (error) {
    console.error("Error fetching failed claims:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch failed claims",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 