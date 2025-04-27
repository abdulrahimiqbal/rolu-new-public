import { NextRequest, NextResponse } from "next/server";
// import { getCurrentUser } from "@/lib/auth"; // Assuming admin check might be needed
import { prisma } from "@/lib/prisma";
import { sendWorldAppNotification } from "@/lib/notification-service"; // Import the service function

// POST /api/admin/magic-chest/grant-rewards-bulk
// Grants rewards for multiple users' magic chest deposits using default calculation.
// !! WARNING: Authentication check removed based on user request (mirroring other admin routes) !!
export async function POST(request: NextRequest) {
    try {
        // Removed authentication check (mirroring other admin routes):
        // const adminUser = await getCurrentUser();
        // if (!adminUser) { // Add proper admin role check if using auth
        //     return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
        // }

        // 1. Get and Validate user IDs from request body
        const body = await request.json();
        const { userIds } = body;

        if (!Array.isArray(userIds) || userIds.length === 0 || !userIds.every(id => typeof id === 'string')) {
            return NextResponse.json(
                { success: false, error: "Missing or invalid userIds array" },
                { status: 400 }
            );
        }

        // --- Pre-fetch necessary data for all users ---
        
        // Fetch deposit aggregates (sum) for all requested users
        const depositAggregates = await prisma.magicChestDeposit.groupBy({
            by: ['userId'],
            _sum: {
                amount: true,
            },
            where: {
                userId: {
                    in: userIds,
                },
            },
            having: { // Ensure we only get users with active deposits
                amount: {
                    _sum: {
                        gt: 0
                    }
                }
            }
        });
        
        // Create a map for quick lookup: userId -> totalDeposited
        const depositMap = new Map(depositAggregates.map(agg => [agg.userId, agg._sum.amount ?? 0]));

        // Fetch user details needed for notification and logging
        const usersToNotify = await prisma.user.findMany({
            where: {
                id: { in: userIds },
                has_notification_permission: true, // Only fetch users who allow notifications
                wallet_address: { not: null }      // And have a wallet address
            },
            select: {
                id: true,
                username: true,
                wallet_address: true,
                has_notification_permission: true, // Keep for consistency, though filtered above
            }
        });
        // Create a map for notification lookup: userId -> userDetails
        const notificationUserMap = new Map(usersToNotify.map(user => [user.id, user]));

        // --- Process each user ---
        let successCount = 0;
        let failureCount = 0;
        const failedUserIds: string[] = [];
        const rewardMultiplier = 1.10; // Default reward multiplier

        for (const userId of userIds) {
            const totalDeposited = depositMap.get(userId);

            // Skip if user wasn't found in the deposit aggregate (no active deposit)
            if (totalDeposited === undefined || totalDeposited <= 0) {
                console.log(`Skipping user ${userId}: No active deposit found.`);
                failureCount++;
                failedUserIds.push(userId);
                continue; // Move to the next user
            }

            // Calculate the default reward
            const finalRewardAmount = totalDeposited * rewardMultiplier;

            try {
                // Perform Transaction for this user
                await prisma.$transaction(async (tx) => {
                    // a) Update user's Rolu balance
                    await tx.user.update({
                        where: { id: userId },
                        data: { roluBalance: { increment: finalRewardAmount } },
                    });

                    // b) Delete all magic chest deposits for the user
                    await tx.magicChestDeposit.deleteMany({
                        where: { userId: userId },
                    });

                    // c) Create a record of the reward granted
                    await tx.magicChestReward.create({
                        data: {
                            userId: userId,
                            originalDepositedAmount: totalDeposited,
                            rewardedAmount: finalRewardAmount,
                        },
                    });
                });

                successCount++;
                console.log(`Successfully granted reward to user ${userId} (Amount: ${finalRewardAmount})`);

                // Attempt Notification (only if user exists in notification map)
                const userToNotify = notificationUserMap.get(userId);
                if (userToNotify && userToNotify.wallet_address) {
                    const title = "Magic Chest Opened!";
                    const message = `Congratulations! You received ${finalRewardAmount.toFixed(2)} Rolu from your Magic Chest.`;
                    
                    // Fire and forget notification
                    sendWorldAppNotification([userToNotify.wallet_address], title, message)
                        .then(result => {
                            if (!result.success || (result.results && !result.results[0]?.sent)) {
                                console.warn(`Failed to send Magic Chest reward notification to ${userToNotify.username} (${userId}). Reason: ${result.error || result.results?.[0]?.reason}`);
                            }
                        }).catch(error => {
                            console.error(`Error calling sendWorldAppNotification for ${userToNotify.username}:`, error);
                        });
                }

            } catch (error) {
                failureCount++;
                failedUserIds.push(userId);
                console.error(`Failed to grant reward for user ${userId}:`, error);
                 // Handle potential Prisma errors like user not found during update if needed
                 if (error instanceof Error && 'code' in error && error.code === 'P2025') { 
                     console.error(` - User ${userId} not found during transaction.`);
                 }
            }
        }

        // 4. Return Summary Response
        const responseMessage = `Bulk grant process completed. Successful: ${successCount}, Failed: ${failureCount}.`;
        return NextResponse.json({
            success: failureCount === 0, // Overall success if no failures
            message: responseMessage,
            successCount,
            failureCount,
            failedUserIds: failureCount > 0 ? failedUserIds : undefined, // Only include if failures occurred
        });

    } catch (error) {
        console.error("Admin Bulk Grant Magic Chest Reward Error:", error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred during the bulk grant process." },
            { status: 500 }
        );
    }
} 