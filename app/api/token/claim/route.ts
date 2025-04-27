import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { tokenToWei } from "@/lib/blockchain/token";

// Define the constant locally
const MAX_PENDING_CLAIMS = 3;

// Status values as constants
const STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

// Check if the TokenTransaction model is available
const hasTokenTransactionModel = async () => {
    try {
        // Try to access the model - this will throw if the model doesn't exist
        // @ts-ignore - Ignoring TypeScript errors for runtime check
        await prisma.tokenTransaction.findFirst();
        return true;
    } catch (error) {
        return false;
    }
};

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser?.id) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Add debugging for status values
        console.log("Debug - Using ClaimStatus.QUEUED for database query");
        
        // Check for existing pending claims using raw query to avoid any type issues
        const pendingClaimsCount = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM "TokenTransaction"
            WHERE "userId" = ${currentUser.id}
            AND status_new = 'QUEUED'::"ClaimStatus"
        `.then((result: any) => Number(result[0].count));
        
        console.log(`Debug - Found ${pendingClaimsCount} pending claims for user ${currentUser.id}`);

        if (pendingClaimsCount >= MAX_PENDING_CLAIMS) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Maximum pending claims reached',
                    message: 'Please wait for your pending claims to be processed before making new claims.'
                },
                { status: 400 }
            );
        }

        // Get the user from the database to ensure fresh data
        const user = await prisma.user.findUnique({
            where: { id: currentUser.id },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Ensure user has a wallet address
        if (!user.wallet_address) {
            return NextResponse.json(
                { success: false, error: "No wallet address associated with this account" },
                { status: 400 }
            );
        }

        // Ensure user has tokens to claim
        if (user.roluBalance <= 0) {
            return NextResponse.json(
                { success: false, error: "No tokens available to claim" },
                { status: 400 }
            );
        }

        // Parse request body
        const body = await req.json();
        const { amount } = body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid amount' },
                { status: 400 }
            );
        }

        // Check if TokenTransaction model is available
        const modelExists = await hasTokenTransactionModel();
        
        // First, update user balance in database to prevent double claiming
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                roluBalance: {
                    decrement: amount
                }
            }
        });

        // Calculate the amount in wei (tokens have 18 decimals)
        const amountInWei = tokenToWei(amount);

        // Just before creating the transaction, log the data
        console.log("Debug - Creating transaction with data:", {
            userId: user.id,
            amount,
            status_new: 'QUEUED',
            walletAddress: user.wallet_address,
        });

        // Create a transaction record in the queue using executeRaw to avoid type issues
        try {
            // Use a raw query to insert the record
            const transaction = await prisma.$executeRaw`
                INSERT INTO "TokenTransaction" 
                ("id", "userId", "amount", "status", "walletAddress", "amountWei", "status_new", "createdAt", "updatedAt")
                VALUES 
                (gen_random_uuid(), ${user.id}, ${amount}, ${STATUS.QUEUED}, ${user.wallet_address}, ${amountInWei}, 'QUEUED'::"ClaimStatus", NOW(), NOW())
                RETURNING id, status
            `;
            
            // Get the inserted transaction ID
            const insertedTx = await prisma.$queryRaw<{ id: string }[]>`
                SELECT id FROM "TokenTransaction"
                WHERE "userId" = ${user.id}
                ORDER BY "createdAt" DESC
                LIMIT 1
            `;
            
            const transactionId = insertedTx[0]?.id;
            
            console.log(`Queued ${amount} ROLU tokens for ${user.wallet_address} with ID ${transactionId}`);

            // Return success with transaction details
            return NextResponse.json({
                success: true,
                message: `Successfully queued claim for ${amount} ROLU tokens!`,
                data: {
                    amount: amount,
                    newBalance: updatedUser.roluBalance,
                    transactionId: transactionId,
                    status: STATUS.QUEUED
                },
            });
        } catch (error) {
            console.error("Failed to create transaction record:", error);
            
            // Restore user's balance since the transaction failed
            await prisma.user.update({
                where: { id: user.id },
                data: { roluBalance: user.roluBalance },
            });

            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to queue token claim",
                    details: error instanceof Error ? error.message : String(error)
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Token claim error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to claim tokens",
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
} 