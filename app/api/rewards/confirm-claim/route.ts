import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ethers } from "ethers";
import { RewardClaimStatus } from '@prisma/client'; // Import enum

export async function POST(req: NextRequest) {
    let user;
    try {
        user = await getCurrentUser();
    } catch (authError) {
        console.error("Auth error in confirm-claim:", authError);
        user = null;
    }

    if (!user || !user.id) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
    const userId = user.id;

    try {
        const body = await req.json();
        const { transaction_hash, amountClaimedWei, nonceUsed, claimableRewardId } = body;

        if (!transaction_hash || !amountClaimedWei || !nonceUsed || !claimableRewardId) {
            return NextResponse.json(
                { success: false, error: "Missing required fields (transaction_hash, amountClaimedWei, nonceUsed, claimableRewardId)" },
                { status: 400 }
            );
        }

        // Validate hash format
        if (!/^0x[a-fA-F0-9]{64}$/.test(transaction_hash)) {
             return NextResponse.json({ success: false, error: "Invalid transaction hash format" }, { status: 400 });
        }

        let amountClaimedBigInt: bigint;
        let nonceBigInt: bigint;
        try {
            amountClaimedBigInt = BigInt(amountClaimedWei);
            nonceBigInt = BigInt(nonceUsed);
        } catch (parseError) {
             console.error("Error parsing amount or nonce:", parseError);
             return NextResponse.json({ success: false, error: "Invalid amount or nonce format" }, { status: 400 });
        }
        // just update the status to claimed based of  the claimablereward id
        
        const updateResult = await prisma.claimableReward.update({
            where: {
                id: claimableRewardId,
            },
            data: {
                status: RewardClaimStatus.CLAIMED,
                claimTransactionHash: transaction_hash,
                claimedAt: new Date(),
                claimNonce: nonceBigInt,
            },
        });

        // if successful i want to reset the user.rolubalance to reset the balance
        await prisma.user.update({
            where: { id: userId },
            data: { roluBalance: 0 },
        });

        return NextResponse.json({
            success: true,
            message: `Claim confirmation processed successfully.`, 
        });

    } catch (error) {
        console.error(`Error confirming claim for user ${userId}:`, error);
        // Provide specific error message if known
        const errorMessage = error instanceof Error ? error.message : "Failed to confirm claim";
         // Use appropriate status code if possible (e.g., 409 for concurrency issues)
         const status = (error instanceof Error && error.message.includes("Failed to confirm rewards")) ? 409 : 500;
        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                details: error instanceof Error ? error.message : String(error)
            },
            { status: status }
        );
    }
} 