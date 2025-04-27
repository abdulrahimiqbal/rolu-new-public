import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma, getPrismaClient } from "@/lib/prisma";
import { customAlphabet } from 'nanoid';
import { trackEvent } from "@/lib/server-analytics";

export const dynamic = 'force-dynamic'; // Force dynamic rendering due to cookie usage

// Define the alphabet for the referral code (uppercase alphanumeric)
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const nanoid = customAlphabet(alphabet, 8); // Generate 8-character codes

/**
 * GET /api/users/referral-code
 *
 * Gets the authenticated user's referral code.
 * If the user doesn't have one, generates a unique code, assigns it, and returns it.
 */
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: "Authentication required" },
                { status: 401 }
            );
        }

        const userId = currentUser.id;

        // Check if user already has a referral code
        if (currentUser.referralCode) {
            console.log(`Returning existing referral code for user ${currentUser.id}`);
            return NextResponse.json({
                success: true,
                referralCode: currentUser.referralCode,
            });
        }

        // Generate a unique referral code
        console.log(`Generating new referral code for user ${currentUser.id}`);
        let newCode = '';
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loops in unlikely collision scenarios

        while (!isUnique && attempts < maxAttempts) {
            attempts++;
            newCode = nanoid(); // Generate a new code
            // Check if this code already exists
            const existingUser = await prisma.user.findUnique({
                where: { referralCode: newCode },
                select: { id: true } // Only need to check for existence
            });
            if (!existingUser) {
                isUnique = true; // Found a unique code
            }
            console.log(`Attempt ${attempts}: Generated code ${newCode}, Unique: ${isUnique}`);
        }

        if (!isUnique) {
            console.error(`Failed to generate a unique referral code for user ${currentUser.id} after ${maxAttempts} attempts.`);
            return NextResponse.json(
                { success: false, error: "Failed to generate unique referral code. Please try again later." },
                { status: 500 }
            );
        }

        // Update the user with the new unique code
        await prisma.user.update({
            where: { id: userId },
            data: { referralCode: newCode },
        });

        console.log(`Assigned new referral code ${newCode} to user ${currentUser.id}`);

        // Track the event
        trackEvent('Referral Code Generated', {
            userId: userId,
            code: newCode
        });

        // Return the newly generated code
        return NextResponse.json({ success: true, referralCode: newCode });

    } catch (error) {
        console.error("Error fetching/generating referral code:", error);
        // Catch specific potential errors if needed, otherwise generic error
        return NextResponse.json(
            { success: false, error: "Internal server error while handling referral code." },
            { status: 500 }
        );
    }
}