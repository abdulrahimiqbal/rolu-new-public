import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; // Use the existing function

export async function GET(req: NextRequest) {
    let user;
    try {
        user = await getCurrentUser(); // Fetch user using the auth logic
    } catch (authError) {
        console.error("Auth error fetching user in claimable-balance:", authError);
        // Treat errors during user fetching as unauthorized
        user = null;
    }

    if (!user) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    return NextResponse.json({
        success: true,
        claimableAmount: user?.roluBalance,
    });
} 