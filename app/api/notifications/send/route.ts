import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface SendNotificationRequest {
    userIds?: string[];
    title: string;
    message: string;
}

export async function POST(req: NextRequest) {
    try {
        // Check if the user is authenticated
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse the request body
        const body: SendNotificationRequest = await req.json();

        if (!body.title || !body.message) {
            return NextResponse.json(
                { success: false, message: "Title and message are required" },
                { status: 400 }
            );
        }

        // Validate title and message lengths according to World App requirements
        if (body.title.length > 30) {
            return NextResponse.json(
                { success: false, message: "Title must be 30 characters or less" },
                { status: 400 }
            );
        }

        if (body.message.length > 200) {
            return NextResponse.json(
                { success: false, message: "Message must be 200 characters or less" },
                { status: 400 }
            );
        }

        // If userIds are provided, validate they exist and have notification permission
        let targetUserIds: string[] = [];

        if (body.userIds && body.userIds.length > 0) {
            // Check if userIds array is within the limit
            if (body.userIds.length > 1000) {
                return NextResponse.json(
                    { success: false, message: "Cannot send to more than 1000 users at once" },
                    { status: 400 }
                );
            }

            // Get users that have notification permission
            const users = await prisma.user.findMany({
                where: {
                    id: { in: body.userIds },
                    has_notification_permission: true
                },
                select: { id: true }
            });

            targetUserIds = users.map(user => user.id);

            if (targetUserIds.length === 0) {
                return NextResponse.json(
                    { success: false, message: "No users with notification permission found" },
                    { status: 400 }
                );
            }
        } else {
            // If no userIds provided, default to sending to the current user
            if (!currentUser.has_notification_permission) {
                return NextResponse.json(
                    { success: false, message: "Current user has not granted notification permission" },
                    { status: 400 }
                );
            }

            targetUserIds = [currentUser.id];
        }

        // Get the wallet addresses for the target users
        const targetUsers = await prisma.user.findMany({
            where: { id: { in: targetUserIds } },
            select: { wallet_address: true }
        });

        const walletAddresses = targetUsers.map(user => user.wallet_address);

        // Send notification via World App API
        const notificationResponse = await fetch(
            "https://developer.worldcoin.org/api/v2/minikit/send-notification",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.WORLD_ID_API_KEY}`
                },
                body: JSON.stringify({
                    addresses: walletAddresses,
                    title: body.title,
                    message: body.message
                })
            }
        );

        const notificationResult = await notificationResponse.json();

        if (!notificationResponse.ok) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Failed to send notification via World App",
                    error: notificationResult
                },
                { status: notificationResponse.status }
            );
        }

        // Return success response
        return NextResponse.json({
            success: true,
            message: `Notification sent to ${targetUserIds.length} user(s)`,
            result: notificationResult
        });
    } catch (error) {
        console.error("Error sending notification:", error);
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 }
        );
    }
} 