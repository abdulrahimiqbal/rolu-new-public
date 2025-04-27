"use server";

import { cookies } from "next/headers";
import { MiniKit } from "@worldcoin/minikit-js";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';
import { getUserStreak } from "./streak-service";

export interface User {
    id: string;
    wallet_address: string;
    username?: string;
    profileImage?: string | null;
    xp: number;
    roluBalance: number;
    level: number;
    is_verified?: boolean;
    currentStreak?: number;
    streakMultiplier?: number;
    has_notification_permission?: boolean;
    referralCode?: string | null;
}
const prisma = new PrismaClient();

// Get the current user from the session using JWT
export async function getCurrentUser(): Promise<User | null> {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get("rolu_auth_token")?.value;

        if (!token) {
            console.log("getCurrentUser: No auth token found.");
            return null;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("getCurrentUser: JWT_SECRET environment variable is not set.");
            return null;
        }

        let decodedPayload: { userId: string } | null = null;
        try {
            decodedPayload = jwt.verify(token, jwtSecret) as { userId: string };
        } catch (err) {
            console.error("getCurrentUser: Invalid or expired JWT.", err);
            return null;
        }

        if (!decodedPayload || !decodedPayload.userId) {
             console.error("getCurrentUser: JWT payload missing userId.");
             return null;
        }

        const userId = decodedPayload.userId;

        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            console.warn(`getCurrentUser: User with ID ${userId} from valid JWT not found in DB.`);
            return null;
        }
        
        const streakInfo = await getUserStreak(user.id);

        // Return the comprehensive user object
        return {
            ...user,
            // Assert wallet_address is non-null as user is fetched via verified JWT
            wallet_address: user.wallet_address!,
            profileImage: user.profileImage,
            roluBalance: user.roluBalance,
            is_verified: user.is_verified === true,
            has_notification_permission: user.has_notification_permission === true,
            currentStreak: streakInfo?.currentStreak || 0,
            streakMultiplier: streakInfo?.multiplier || 1,
        };

    } catch (error) {
        console.error("Error getting current user:", error);
        return null;
    }
}

// Get username from World ID by wallet address
export async function getWorldIdUsername(walletAddress: string): Promise<string | null> {
    try {
        const user = await MiniKit.getUserByAddress(walletAddress);
        return user?.username || null;
    } catch (error) {
        console.error("Error fetching World ID username:", error);
        return null;
    }
}

// Check if the user is authenticated
export async function isAuthenticated(): Promise<boolean> {
    const user = await getCurrentUser();
    return !!user;
} 