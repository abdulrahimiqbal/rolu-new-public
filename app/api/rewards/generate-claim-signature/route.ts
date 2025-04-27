import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ethers, solidityPackedKeccak256, SigningKey, Signature, computeAddress } from "ethers";
import { getCurrentUser } from "@/lib/auth"; // Use the existing function
import { RewardClaimStatus } from '@prisma/client'; // Import enum

// Load the admin private key from environment variables
const ADMIN_PRIVATE_KEY = process.env.ROLU_TOKEN_ADMIN_PRIVATE_KEY;

// Log the derived admin public address ONCE during server startup/load
if (ADMIN_PRIVATE_KEY) {
    try {
        const adminSignerAddress = computeAddress('0x' + ADMIN_PRIVATE_KEY);
        console.log(`[generate-claim-signature] Loaded Admin Signer Address: ${adminSignerAddress}`);
    } catch (e) {
        console.error("[generate-claim-signature] Failed to compute address from ADMIN_PRIVATE_KEY:", e);
    }
} else {
    console.error("[generate-claim-signature] ADMIN_PRIVATE_KEY environment variable is not set!");
}

export async function POST(req: NextRequest) {
    if (!ADMIN_PRIVATE_KEY) {
        console.error("Missing ROLU_TOKEN_ADMIN_PRIVATE_KEY environment variable for signing");
        return NextResponse.json(
            { success: false, error: "Server configuration error (missing signing key)" },
            { status: 500 }
        );
    }

    let user;
    try {
        user = await getCurrentUser(); // Fetch user using the auth logic
    } catch (authError) {
        console.error("Auth error fetching user in generate-claim-signature:", authError);
        user = null;
    }

    if (!user || !user.id) { // Check for user and user.id
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
    
    const userId = user.id; // Safe to access user.id now

    try {
        // 1. Fetch user wallet address
        const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { wallet_address: true } });
        if (!dbUser || !dbUser.wallet_address) {
            return NextResponse.json({ success: false, error: "User wallet address not found" }, { status: 404 });
        }
        const userWalletAddress = dbUser.wallet_address;
            // create transaction for claimable reward
            const newClaimableReward = await prisma.claimableReward.create({
                data: {
                    userId: userId,
                    amount: user?.roluBalance || 0,
                    status: 'PENDING',
                }
            });
            // 3. Prepare data for signing
            const amountInWei = ethers.parseUnits(user?.roluBalance.toString() || '0', 18);
            const nonce = BigInt(Date.now());

            // 4. Construct message hash
            const messageHash = solidityPackedKeccak256(
                ['address', 'uint256', 'uint256'],
                [userWalletAddress, amountInWei, nonce]
            );

            // 5. Sign the hash with the admin key
            const signingKey = new SigningKey('0x' + ADMIN_PRIVATE_KEY!);
            const signature: Signature = signingKey.sign(messageHash);
            const flatSignature = signature.r + signature.s.substring(2) + signature.v.toString(16).padStart(2, '0');
        const data = {
            amount: amountInWei.toString(),
            nonce: nonce.toString(), // Still return nonce as string to frontend
            signature: flatSignature,
            claimableRewardId: newClaimableReward.id,
        };

        // Return the successful result from the transaction
        return NextResponse.json({ success: true, data });

    } catch (error) {
        console.error(`Error processing claim signature for user ${userId}:`, error);
        
        // Handle specific error from transaction
        if (error instanceof Error && error.message === "No rewards available to claim") {
             return NextResponse.json(
                { success: false, error: "No rewards available to claim" },
                { status: 400 } 
            );
        }
        // Handle concurrency error from transaction
        if (error instanceof Error && error.message.startsWith("Failed to lock rewards")) {
             return NextResponse.json(
                { success: false, error: error.message },
                { status: 409 } // 409 Conflict status code
            );
        }
        
        // Generic error handling
        return NextResponse.json(
            {
                success: false,
                error: "Failed to generate claim signature",
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
} 