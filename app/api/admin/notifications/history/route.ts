import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        // Get all notifications, ordered by most recent first
        const notifications = await prisma.$queryRaw`
      SELECT 
        id, 
        title, 
        message, 
        "userType", 
        status, 
        "sentCount", 
        "totalCount", 
        "createdAt", 
        "updatedAt" 
      FROM "Notification" 
      ORDER BY "createdAt" DESC 
      LIMIT 100
    `;

        return NextResponse.json({
            success: true,
            notifications,
        });
    } catch (error) {
        console.error("Error fetching notification history:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
} 