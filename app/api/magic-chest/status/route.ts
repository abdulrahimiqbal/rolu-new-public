import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Ensuring the route is properly marked as dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache completely
export const fetchCache = 'force-no-store';

// GET /api/magic-chest/status
// Checks if the user has any active deposits and returns the total amount and latest deposit time.
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            );
        }

        // Aggregate the total deposited amount and find the latest deposit time for the user
        const depositAggregate = await prisma.magicChestDeposit.aggregate({
            _sum: {
                amount: true,
            },
            _max: {
                depositTime: true,
            },
            where: {
                userId: currentUser.id,
                // Add conditions if deposits expire or are withdrawn later
                // For now, we consider all historical deposits until explicitly cleared
            },
        });

        const totalDeposited = depositAggregate._sum.amount ?? 0;
        const latestDepositTime = depositAggregate._max.depositTime ?? null;

        return NextResponse.json({
            success: true,
            totalDeposited: totalDeposited,
            latestDepositTime: latestDepositTime,
            hasActiveDeposit: totalDeposited > 0 // Simple flag
        });

    } catch (error) {
        console.error("Magic Chest Status Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch deposit status" },
            { status: 500 }
        );
    }
} 