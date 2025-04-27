import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { sendWorldAppNotification } from "@/lib/notification-service"; // Import the service function

const prisma = new PrismaClient();

// Define a schema for the notification request
const notificationSchema = z.object({
    title: z.string().min(1).max(30), // Max 30 characters as per API docs
    message: z.string().min(1).max(200), // Max 200 characters as per API docs
    userType: z.literal("all"),
});

const BATCH_SIZE = 1000; // World App API limit

export async function POST(req: NextRequest) {
    try {
        // Parse and validate the request body
        const body = await req.json();
        const validatedData = notificationSchema.safeParse(body);

        if (!validatedData.success) {
            return NextResponse.json(
                { success: false, message: "Invalid request data", errors: validatedData.error.format() },
                { status: 400 }
            );
        }

        const { title, message } = validatedData.data;

        // Create notification record - Let Prisma handle ID/timestamps
        const notification = await prisma.notification.create({
            data: { 
                title,
                message,
                userType: "all",
                status: "PROCESSING"
            }
        });

        // Get users who haven't received this notification and have notification permission
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { has_notification_permission: true },
                    { wallet_address: { not: null } }, // Ensure user has a wallet address
                    {
                        NOT: {
                            notificationReceipts: {
                                some: {
                                    notificationId: notification.id
                                }
                            }
                        }
                    }
                ]
            },
            select: {
                id: true,
                wallet_address: true
            }
        });

        if (users.length === 0) {
            await prisma.notification.update({
                where: { id: notification.id },
                data: { status: "COMPLETED" }
            });
            return NextResponse.json({
                success: true,
                message: "No eligible users found for notification",
                data: {
                    notificationId: notification.id,
                    totalUsers: 0,
                    successCount: 0,
                    failureCount: 0
                }
            });
        }

        let totalSuccessCount = 0;
        let totalFailureCount = 0;

        // Process users in batches of 1000
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);
            const wallet_addresses = batch.map(user => user.wallet_address).filter(Boolean) as string[];

            // Create pending receipts for the batch
            await prisma.notificationReceipt.createMany({
                data: batch.map(user => ({
                    userId: user.id,
                    notificationId: notification.id,
                    status: "PENDING"
                }))
            });

            // Call the notification service function
            const sendResult = await sendWorldAppNotification(wallet_addresses, title, message);

            if (sendResult.success && sendResult.results) {
                // Update receipt statuses based on the API response
                for (const delivery of sendResult.results) {
                    const user = batch.find(u => u.wallet_address === delivery.walletAddress);
                    if (user) {
                        const updateData = {
                            status: delivery.sent ? "DELIVERED" : "FAILED",
                            failureReason: delivery.reason ?? null
                        };
                        await prisma.notificationReceipt.update({
                            where: { userId_notificationId: { userId: user.id, notificationId: notification.id } },
                            data: updateData
                        });
                        if (delivery.sent) totalSuccessCount++; else totalFailureCount++;
                    }
                }
            } else {
                // If the API call itself failed, mark all in batch as failed
                console.error("Failed to send notifications for batch:", sendResult.error);
                await prisma.notificationReceipt.updateMany({
                    where: { userId: { in: batch.map(u => u.id) }, notificationId: notification.id },
                    data: { status: "FAILED", failureReason: sendResult.error || "Batch send failed" }
                });
                totalFailureCount += batch.length;
            }
        }

        // Update notification status
        const finalStatus = totalFailureCount === users.length ? "FAILED" :
                           totalSuccessCount === users.length ? "COMPLETED" :
                           "PARTIALLY_COMPLETED";
        await prisma.notification.update({
            where: { id: notification.id },
            data: { status: finalStatus }
        });

        return NextResponse.json({
            success: true,
            message: "Notification broadcast completed",
            data: {
                notificationId: notification.id,
                totalUsers: users.length,
                successCount: totalSuccessCount,
                failureCount: totalFailureCount
            }
        });

    } catch (error) {
        console.error("Error broadcasting notification:", error);
        return NextResponse.json(
            { success: false, message: "Failed to broadcast notification" },
            { status: 500 }
        );
    }
} 