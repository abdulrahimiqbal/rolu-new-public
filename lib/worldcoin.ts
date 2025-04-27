"use server";

import { MiniKit } from "@worldcoin/minikit-js";

export async function getUsername(walletAddress: string) {
    try {
        const user = await MiniKit.getUserByAddress(walletAddress);
        return user?.username || null;
    } catch (error) {
        console.error("Error fetching World ID username:", error);
        return null;
    }
}

// This function is a placeholder for future implementation
// of World ID signature verification
export async function verifyWorldIdSignature(payload: any, nonce: string) {
    console.log("Signature verification is disabled for now");
    console.log("Will be implemented in the future");

    // Always return valid for now
    return {
        isValid: true,
        address: payload.address,
    };
}
