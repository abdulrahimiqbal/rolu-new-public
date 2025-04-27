import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        // Get current user for authentication
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Extract transaction hash from query params
        const { searchParams } = new URL(request.url);
        const transactionHash = searchParams.get("hash");

        if (!transactionHash) {
            return NextResponse.json(
                { success: false, error: "Transaction hash is required" },
                { status: 400 }
            );
        }

        // Check if the TokenTransaction model exists using try-catch
        try {
            // Try to find the transaction by hash
            const transaction = await prisma.tokenTransaction.findFirst({
                where: {
                    transactionHash,
                    userId: currentUser.id
                },
            });

            if (transaction) {
                return NextResponse.json({
                    success: true,
                    data: {
                        transaction,
                        status: transaction.status,
                    },
                });
            }

            // If no transaction is found
            return NextResponse.json({
                success: false,
                error: "Transaction not found",
            }, { status: 404 });
        } catch (error) {
            console.error("Error accessing TokenTransaction model:", error);
            // Model likely doesn't exist, return a fallback response
            return NextResponse.json({
                success: false,
                error: "Transaction tracking not available",
            }, { status: 500 });
        }
    } catch (error) {
        console.error("Error checking transaction status:", error);
        return NextResponse.json(
            { success: false, error: "Failed to check transaction status" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic"; 