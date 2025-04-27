import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Ensuring the route is properly marked as dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET /api/magic-chest/rewards
// Fetches the authenticated user's magic chest reward history.
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            );
        }

        // Fetch rewards for the current user, ordered most recent first
        const rewards = await prisma.magicChestReward.findMany({
            where: {
                userId: currentUser.id,
            },
            orderBy: {
                grantedAt: 'desc', // Show most recent rewards first
            },
            // Optional: Select specific fields if needed
            // select: {
            //     id: true,
            //     originalDepositedAmount: true,
            //     rewardedAmount: true,
            //     grantedAt: true,
            // }
            // Optional: Limit the number of results if history gets long
            // take: 20, 
        });

        return NextResponse.json({
            success: true,
            rewards: rewards,
        });

    } catch (error) {
        console.error("Fetch Magic Chest Rewards Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch reward history" },
            { status: 500 }
        );
    }
} 