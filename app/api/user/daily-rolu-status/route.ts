import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, getPrismaClient } from "@/lib/prisma";
import { calculateMultiplier, getUserStreak } from "@/lib/streak-service";

/**
 * GET /api/user/daily-rolu-status
 *
 * Gets the authenticated user's daily ROLU token earning status.
 * Returns total earned today, remaining tokens available, and daily limit.
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
    let db;
    const MAX_DAILY_ROLU_TOKENS = process.env.NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS
        ? parseInt(process.env.NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS, 10)
        : 100; // Default to 100 if not set

    const defaultFallbackData = {
        dailyLimit: MAX_DAILY_ROLU_TOKENS,
        earnedToday: 0,
        remainingToday: MAX_DAILY_ROLU_TOKENS,
        limitReached: false,
        streak: 0,
        maxStreak: 0,
        streakMultiplier: 1.0,
        bonusEarned: 0
    };

    try {
        // Use a direct client instance to ensure it's available
        db = getPrismaClient();

        // Check if prisma client is available
        if (!db) {
            console.error("Prisma client is not initialized");
            return NextResponse.json(
                {
                    success: false, // Indicate failure
                    error: "Database initialization error",
                    data: defaultFallbackData, // Provide default data contextually
                },
                { status: 500 } // Internal Server Error
            );
        }

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

        // Get today's date in YYYY-MM-DD format (UTC)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Use local time to match user experience

        // Get the latest user streak information directly from streak service
        let streak = 0;
        let maxStreak = 0;
        let streakMultiplier = 1.0;

        try {
            const streakInfo = await getUserStreak(targetUserId);
            console.log("streakInfo", streakInfo);
            if (streakInfo) {
                streak = streakInfo.currentStreak;
                maxStreak = streakInfo.maxStreak;
                streakMultiplier = streakInfo.multiplier;
            }
        } catch (streakError) {
            console.error(`Error fetching user streak for ${targetUserId}:`, streakError);
            // Don't fail the request, just use default streak values
        }

        // Get user's earnings for today

        try {
            const dailyEarnings = await db.dailyRoluEarnings.findUnique({
                where: {
                    userId_date: {
                        userId: targetUserId,
                        date: today, // Ensure this matches the type in schema (likely DateTime)
                    },
                },
            });
            console.log("dailyEarnings", dailyEarnings);

            const earnedToday = dailyEarnings?.totalEarned || 0;
            const bonusEarned = dailyEarnings?.bonusEarned || 0;
            const remainingToday = Math.max(0, MAX_DAILY_ROLU_TOKENS - earnedToday);
            console.log({
                data: {
                    userId: targetUserId,
                    dailyLimit: MAX_DAILY_ROLU_TOKENS,
                    earnedToday,
                    remainingToday,
                    limitReached: earnedToday >= MAX_DAILY_ROLU_TOKENS,
                    streak,
                    maxStreak,
                    streakMultiplier,
                    bonusEarned
                },
            })
            return NextResponse.json({
                success: true,
                data: {
                    userId: targetUserId,
                    dailyLimit: MAX_DAILY_ROLU_TOKENS,
                    earnedToday,
                    remainingToday,
                    limitReached: earnedToday >= MAX_DAILY_ROLU_TOKENS,
                    streak,
                    maxStreak,
                    streakMultiplier,
                    bonusEarned
                },
            });
        } catch (dbError) {
            console.error(`Database error fetching daily Rolu status for ${targetUserId}:`, dbError);
            return NextResponse.json(
                {
                    success: false,
                    error: "Database error fetching daily status",
                    data: { ...defaultFallbackData, userId: targetUserId } // Include userId if available
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("General error fetching daily Rolu status:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
                data: defaultFallbackData
            },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic";
