import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        // 1. Get Authenticated User
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            );
        }

        // 2. Get and Validate Amount
        const body = await request.json();
        const { amount } = body;

        if (typeof amount !== 'number' || amount <= 0 || isNaN(amount)) {
            return NextResponse.json(
                { success: false, error: "Invalid deposit amount" },
                { status: 400 }
            );
        }

        // Fetch latest balance to prevent race conditions
        const userLatest = await prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { roluBalance: true }
        });

        if (!userLatest) {
             // Should not happen if user is authenticated, but good practice
             console.error(`Authenticated user ${currentUser.id} not found during deposit.`);
             return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
        }

        if (userLatest.roluBalance < amount) {
            return NextResponse.json(
                { success: false, error: "Insufficient Rolu balance" },
                { status: 400 }
            );
        }

        // 3. Perform Transaction
        const depositResult = await prisma.$transaction(async (tx) => {
            // Decrement user balance
            const updatedUser = await tx.user.update({
                where: { id: currentUser.id },
                data: {
                    roluBalance: {
                        decrement: amount,
                    },
                },
                select: { roluBalance: true } // Select the updated balance
            });

            // Create deposit record
            const deposit = await tx.magicChestDeposit.create({
                data: {
                    userId: currentUser.id,
                    amount: amount,
                    // depositTime is handled by @default(now())
                },
            });

            return { updatedUser, deposit };
        });

        // 4. Return Success
        return NextResponse.json({
            success: true,
            message: "Deposit successful",
            newBalance: depositResult.updatedUser.roluBalance, // Return the new balance
            depositId: depositResult.deposit.id
        });

    } catch (error) {
        console.error("Magic Chest Deposit Error:", error);
        // Check for specific Prisma errors if needed
        return NextResponse.json(
            { success: false, error: "Failed to process deposit" },
            { status: 500 }
        );
    }
} 