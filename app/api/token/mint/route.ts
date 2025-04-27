import { NextRequest, NextResponse } from "next/server";
// Remove ethers import if no longer needed directly here
// import { ethers } from "ethers"; 
import { prisma } from "@/lib/prisma";
// Remove blockchain imports if no longer needed directly here
// import { getTokenContractWithSigner, createProvider } from "@/lib/blockchain/token";

// Remove Admin private key if no longer needed here
// const ADMIN_PRIVATE_KEY = process.env.ROLU_TOKEN_ADMIN_PRIVATE_KEY;

// Remove old status constants if not used
/*
const STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};
*/

// Remove hasTokenTransactionModel check if focusing on new table
/*
const hasTokenTransactionModel = async () => { ... };
*/

export async function POST(req: NextRequest) {
    try {
        // Remove validation for private key if not used here
        /*
        if (!ADMIN_PRIVATE_KEY) { ... }
        */

        // Parse request body
        const body = await req.json();
        const { userId, amount } = body;

        // Validate required fields
        if (!userId || !amount) {
            return NextResponse.json(
                { success: false, error: "Missing required fields (userId, amount)" },
                { status: 400 }
            );
        }

        // Validate amount
        const amountToRecord = parseInt(amount, 10); // Assuming whole integer rewards
        if (isNaN(amountToRecord) || amountToRecord <= 0) {
            return NextResponse.json(
                { success: false, error: "Invalid amount" },
                { status: 400 }
            );
        }

        // Get the user
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Ensure user has a wallet address (still needed for the claim later)
        if (!user.wallet_address) {
            return NextResponse.json(
                { success: false, error: "No wallet address associated with this account for claiming" },
                { status: 400 }
            );
        }

        // --- Start: Replace Blockchain Logic with DB Record --- 
        console.log(`Recording claimable reward eligibility for user ${userId}: ${amountToRecord} ROLU`);

        await prisma.claimableReward.create({
                    data: {
                        userId: user.id,
            amount: amountToRecord, 
            status: 'PENDING', // Use the new RewardClaimStatus enum value
                    },
                });

        console.log(`Successfully recorded claimable reward for user ${userId}`);

        // Return simple success response
                return NextResponse.json({
                    success: true,
            message: "Reward eligibility recorded successfully" 
        });
        // --- End: Replace Blockchain Logic with DB Record --- 

    } catch (error) {
        console.error("Error recording reward eligibility:", error);
        // Simplified error handling, adjust as needed
        return NextResponse.json(
            {
                success: false,
                error: "Failed to record reward eligibility",
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}

// Remove handleSuccess and handleFailure functions if they are no longer used
/*
async function handleSuccess(...) { ... }
async function handleFailure(...) { ... }
*/ 