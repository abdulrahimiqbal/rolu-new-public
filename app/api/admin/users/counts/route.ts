import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        // Get count of users with notification permission and a wallet address
        const totalUsers = await prisma.user.count({
            where: {
                has_notification_permission: true,
                wallet_address: { not: null }
            },
        });

        return NextResponse.json({
            success: true,
            totalUsers,
        });
    } catch (error) {
        console.error("Error fetching user counts:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
} 