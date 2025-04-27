import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/balance
 * 
 * Gets the authenticated user's current ROLU balance from the database.
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

        // Get user data with the latest ROLU balance
        const userData = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                roluBalance: true,
                username: true,
            },
        });

        if (!userData) {
            // This case should technically not happen if the user is authenticated
            // but good to handle defensively.
            console.error(`Authenticated user ${targetUserId} not found in database.`);
            return NextResponse.json(
                { success: false, error: "Authenticated user data not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                userId: userData.id,
                username: userData.username,
                roluBalance: userData.roluBalance,
            },
        });
    } catch (error) {
        console.error("Error fetching user balance:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic"; 