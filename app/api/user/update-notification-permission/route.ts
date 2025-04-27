import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        // Get the current user
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        // Parse the request body
        const body = await req.json();
        const hasPermission = !!body.has_notification_permission;

        // Update the user's notification permission in the database
        await prisma.user.update({
            where: { id: user.id },
            data: { has_notification_permission: hasPermission }
        });

        // Return success response
        return NextResponse.json({
            success: true,
            message: "Notification permission updated successfully"
        });
    } catch (error) {
        console.error("Error updating notification permission:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
} 