import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, getPrismaClient } from "@/lib/prisma";
import { getUserStreak } from "@/lib/streak-service";

/**
 * GET /api/user/streak
 *
 * Gets the authenticated user's streak information.
 * Returns currentStreak, maxStreak, and multiplier.
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        // Validate access - strictly require authentication
        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            );
        }

        // Use the authenticated user's ID
        const targetUserId = currentUser.id;

        // Get streak info from service
        const streakInfo = await getUserStreak(targetUserId);

        if (!streakInfo) {
            // If user exists but has no streak data yet
            return NextResponse.json(
                {
                    success: true,
                    data: {
                        currentStreak: 0,
                        maxStreak: 0,
                        multiplier: 1.0,
                        lastPlayedDate: null
                    }
                }
            );
        }

        return NextResponse.json({
            success: true,
            data: streakInfo
        });
    } catch (error) {
        console.error("Error fetching user streak:", error);
        // Return a default streak structure on error, consistent with the !streakInfo case
        return NextResponse.json(
            {
                success: false, // Indicate failure
                error: "Error fetching streak information",
                data: {
                    currentStreak: 0,
                    maxStreak: 0,
                    multiplier: 1.0,
                    lastPlayedDate: null
                }
            },
            { status: 500 } // Set appropriate status code for server error
        );
    }
}

export const dynamic = "force-dynamic"; 