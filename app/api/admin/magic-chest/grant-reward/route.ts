import { NextRequest, NextResponse } from "next/server";
// import { getCurrentUser } from "@/lib/auth"; // Removed auth check
import { prisma } from "@/lib/prisma";
import { sendWorldAppNotification } from "@/lib/notification-service"; // Import the service function

// POST /api/admin/magic-chest/grant-reward
// Grants the reward for a user's magic chest deposit, clears their deposits, and updates their balance.
// Accepts an optional customRewardAmount in the body.
// !! WARNING: Authentication check removed based on user request !!
export async function POST(request: NextRequest) {
    try {
        // Removed authentication check:
        // const adminUser = await getCurrentUser();
        // if (!adminUser) {
        //     return NextResponse.json(
        //         { success: false, error: "Authentication required" },
        //         { status: 401 }
        //     );
        // }

        // Removed placeholder Admin Check comment as well

        // 1. Get data from request body
        const body = await request.json();
        const { userId, customRewardAmount } = body; // Destructure customRewardAmount

        if (!userId || typeof userId !== 'string') {
            return NextResponse.json(
                { success: false, error: "Missing or invalid userId" },
                { status: 400 }
            );
        }

        // Validate customRewardAmount if provided
        if (customRewardAmount !== undefined && (typeof customRewardAmount !== 'number' || customRewardAmount < 0 || isNaN(customRewardAmount))) {
            return NextResponse.json(
                { success: false, error: "Invalid customRewardAmount provided. Must be a non-negative number." },
                { status: 400 }
            );
        }

        // --- Fetch User Info Needed Before Transaction --- 
        // We need wallet_address and permission status for notification later
        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                id: true,
                username: true, // Keep username for logging/messages
                wallet_address: true,
                has_notification_permission: true
            }
        });

        if (!targetUser) {
            return NextResponse.json({ success: false, error: "Target user not found." }, { status: 404 });
        }
        if (!targetUser.wallet_address) {
            // Cannot send notification without wallet address
            console.warn(`Cannot send notification to user ${targetUser.username} (${userId}) - Missing wallet_address.`);
            // Optionally return an error or proceed without notification?
            // Let's proceed for now, but log it.
        }

        // 2. Fetch the total deposited amount for the target user
        const depositAggregate = await prisma.magicChestDeposit.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                userId: userId,
            },
        });

        const totalDeposited = depositAggregate._sum.amount ?? 0;

        if (totalDeposited <= 0) {
            return NextResponse.json(
                { success: false, error: "User has no active deposits to reward." },
                { status: 400 }
            );
        }

        // 3. Determine the Final Reward Amount
        let finalRewardAmount: number;
        if (customRewardAmount !== undefined && typeof customRewardAmount === 'number' && customRewardAmount >= 0) {
            // Use the valid custom amount provided by the admin
            finalRewardAmount = customRewardAmount;
            console.log(`Using custom reward amount: ${finalRewardAmount} for user ${userId}`);
        } else {
            // Fallback: Use the original calculation (e.g., deposit + 10% bonus)
            const rewardMultiplier = 1.10; 
            finalRewardAmount = totalDeposited * rewardMultiplier;
            console.log(`Using calculated reward amount: ${finalRewardAmount} (Deposit: ${totalDeposited}) for user ${userId}`);
        }

        // 4. Perform Transaction: Update Balance, Clear Deposits, and Record Reward
        const transactionResult = await prisma.$transaction(async (tx) => {
            // a) Update user's Rolu balance
            await tx.user.update({
                where: { id: userId },
                data: {
                    roluBalance: {
                        // Use the determined finalRewardAmount
                        increment: finalRewardAmount, 
                    },
                },
            });

            // b) Delete all magic chest deposits for the user
            const deleteResult = await tx.magicChestDeposit.deleteMany({
                where: { userId: userId },
            });

            return { deletedCount: deleteResult.count }; // Return deletion count only
        });

        // c) Create a record of the reward granted - outside of transaction
        await prisma.$executeRaw`
            INSERT INTO "MagicChestReward" ("id", "userId", "originalDepositedAmount", "rewardedAmount", "grantedAt")
            VALUES (gen_random_uuid(), ${userId}, ${totalDeposited}, ${finalRewardAmount}, NOW());
        `;

        // Fetch the final balance after the transaction for the response
        const finalBalanceResult = await prisma.user.findUnique({ 
            where: { id: userId }, 
            select: { roluBalance: true } 
        });
        const finalBalance = finalBalanceResult?.roluBalance ?? 0;

        // 5. Send Notification (if permission granted and wallet exists)
        if (targetUser.has_notification_permission && targetUser.wallet_address) {
            console.log(`Attempting to send notification to user ${targetUser.username} (${userId})`);
            const title = "Magic Chest Opened!"; // Max 30 chars
            const message = `Congratulations! You received ${finalRewardAmount.toFixed(2)} Rolu from your Magic Chest.`; // Max 200 chars
            
            // Use the notification service (fire and forget for now, just log errors)
            sendWorldAppNotification([targetUser.wallet_address], title, message)
                .then(result => {
                    if (!result.success) {
                        console.error(`Failed to send Magic Chest reward notification to ${targetUser.username}: ${result.error}`);
                    }
                     if (result.success && result.results) {
                        const delivery = result.results[0]; // Should only be one result for single address
                         if (!delivery.sent) {
                            console.warn(`World App reported failure sending notification to ${targetUser.wallet_address}: ${delivery.reason}`);
                        }
                    }
                })
                .catch(error => {
                     console.error(`Error calling sendWorldAppNotification for ${targetUser.username}:`, error);
                });
        } else {
            console.log(`Skipping notification for user ${targetUser.username} (ID: ${userId}) - Permission: ${targetUser.has_notification_permission}, Wallet: ${!!targetUser.wallet_address}`);
        }

        // 6. Return Success
        return NextResponse.json({
            success: true,
            message: `Reward granted successfully to user ${targetUser.username}.`,
            rewardedAmount: finalRewardAmount, 
            newBalance: finalBalance, // Use the separately fetched final balance
            depositsCleared: transactionResult.deletedCount,
        });

    } catch (error) {
        console.error("Admin Grant Magic Chest Reward Error:", error);
        // Handle potential errors like user not found during update
        if (error instanceof Error && 'code' in error && error.code === 'P2025') { // Prisma error code for record not found
             return NextResponse.json(
                { success: false, error: "Target user not found." },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { success: false, error: "Failed to grant magic chest reward" },
            { status: 500 }
        );
    }
} 