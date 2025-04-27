import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
    try {
        // Generate a random nonce
        const nonce = uuidv4();

        // Return the nonce without storing it in a cookie
        // since we're not verifying it for now
        return NextResponse.json({ nonce });
    } catch (error) {
        console.error("Error generating nonce:", error);
        return NextResponse.json(
            { error: "Failed to generate nonce" },
            { status: 500 }
        );
    }
} 