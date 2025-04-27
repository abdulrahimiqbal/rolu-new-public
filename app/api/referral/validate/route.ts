// File: app/api/referral/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic'; // Force dynamic rendering (can access searchParams)

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code || typeof code !== 'string' || code.trim() === '') {
            return NextResponse.json({ isValid: false, error: "Code parameter is required." }, { status: 400 });
        }

        // Normalize code (uppercase) to match stored codes
        const processedCode = code.trim().toUpperCase();

        const existingUser = await prisma.user.findUnique({
            where: { referralCode: processedCode },
            select: { id: true } // Only need to check for existence
        });

        // Return true if a user with that referral code was found
        return NextResponse.json({ isValid: !!existingUser });

    } catch (error) {
        console.error("Error validating referral code:", error);
        // Return isValid: false on internal errors to prevent user confusion
        return NextResponse.json({ isValid: false, error: "Internal server error during validation." }, { status: 500 });
    }
}