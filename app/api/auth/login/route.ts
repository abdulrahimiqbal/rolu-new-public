import { NextRequest, NextResponse } from "next/server";
import { getWorldIdUsername } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid"; // Re-added for user ID generation
import { PrismaClient } from "@prisma/client";
import { getUserStreak } from "@/lib/streak-service";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { trackEvent } from "@/lib/server-analytics";
import jwt from 'jsonwebtoken'; // Import jsonwebtoken

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const { wallet_address, referralCode } = await request.json();

        if (!wallet_address) {
            return NextResponse.json(
                { success: false, error: "Wallet address is required" },
                { status: 400 }
            );
        }

        // Get username from World ID
        const username = await getWorldIdUsername(wallet_address);
        const defaultUsername = username || `User_${wallet_address.slice(0, 6)}`;
        // const newUserId = uuidv4(); // No longer needed here
        // Re-add declarations for referrerId and referredById
        let referredById: string | null = null;
        let referrerId: string | null = null;
        let referralStatus: string | null = null; // Initialize referral status message
        let referrerUsername: string | null = null; // Added variable for referrer username

        // Check if user exists in database
        let user = await prisma.user.findUnique({
            where: {
                wallet_address: wallet_address
            }
        });

        // If user doesn't exist, create a new one
        if (!user) {
            // Validate referral code if provided
            if (referralCode && typeof referralCode === 'string' && referralCode.trim() !== '') {
                // Trim and convert input code to uppercase for consistent matching
                const processedCode = referralCode.trim().toUpperCase();
                console.log(`Attempting to find referrer with code: [${processedCode}]`); // Log before query

                let potentialReferrer = null; // Initialize before try block
                try {
                    potentialReferrer = await prisma.user.findUnique({
                        where: {
                            referralCode: processedCode
                        },
                        // Select both id and username of the referrer
                        select: { id: true, username: true }
                    });
                    console.log(`Result of findUnique for referrer:`, potentialReferrer); // Log result after query
                } catch (dbError) {
                    console.error(`Database error during findUnique for referral code ${processedCode}:`, dbError);
                    // Ensure potentialReferrer remains null if error occurs
                    potentialReferrer = null;
                }

                if (potentialReferrer) {
                    referrerId = potentialReferrer.id;
                    referrerUsername = potentialReferrer.username; // Store referrer's username
                    referredById = referrerId; // Keep track for user creation
                    console.log(`Valid referral code found for referrer: ${referrerId} (${referrerUsername})`);
                    referralStatus = "referral_success"; // Status for successful referral
                } else {
                    console.warn(`Invalid or non-existent referral code used: ${processedCode}`);
                    if (processedCode) { // Only set status if a code was actually provided
                        referralStatus = "referral_invalid_code";
                    }
                }
            } else if (referralCode) {
                // Handle case where code was provided but didn't pass initial checks (already handled above, but good practice)
                referralStatus = "referral_invalid_code";
            } else {
                referralStatus = "referral_no_code"; // Status when no code was entered
            }

            // Prepare new user data (ensure referredById is included)
            const newUserInput: Prisma.UserCreateInput = {
                id: uuidv4(),
                username: username || defaultUsername,
                wallet_address: wallet_address,
                profileImage: null,
                xp: 0,
                // Set initial balance based on whether referral was successful
                roluBalance: referredById ? 150 : 0,
                level: 1,
                // Connect to the referrer if referredById is set
                ...(referredById && {
                    User: { // Use the relation name defined in schema for the referredById field
                        connect: { id: referredById }
                    }
                })
            };

            // Perform operations in a transaction
            user = await prisma.$transaction(async (tx) => {
                // 1. Create the new user (already includes the link via referredById/User connect)
                const createdUser = await tx.user.create({
                    data: newUserInput
                });

                // 2. Update the referrer's balance if a referrer was found
                if (referrerId) {
                    await tx.user.update({
                        where: { id: referrerId },
                        data: {
                            // Only update the balance
                            roluBalance: { increment: 150 }
                        }
                    });
                    console.log(`Awarded 150 ROLU bonus to referrer ${referrerId}`);
                }
                // Removed the problematic update to referrer's other_User list

                return createdUser;
            });
            console.log(`New user created with referral status: ${referralStatus}`);

            // Track User Created event
            trackEvent('User Created', {
                userId: user.id,
                username: user.username,
                creationTimestamp: user.createdAt.toISOString(),
                referralStatus: referralStatus, // Include status (success, invalid_code, no_code)
                referrerId: referrerId // Will be null if no valid code applied
            });

            // Track Referral Code Applied event only on successful application
            if (referralStatus === "referral_success" && referrerId) {
                trackEvent('Referral Code Applied', {
                    referrerId: referrerId,
                    refereeId: user.id,
                    codeUsed: referralCode || 'unknown' // Use the processed code
                });
            }

        } else {
            // Existing user logged in
            referralStatus = "referral_existing_user"; // Set status for existing user
            console.log(`Existing user logged in (${user.id}), setting status: ${referralStatus}`);
        }

        // Prepare data for the final response, including conditional username
        const responseData = {
            user,
            referralStatus,
            // Include referrer username only on successful referral signup
            ...(referralStatus === "referral_success" && { referrerUsername: referrerUsername })
        };

        // --- JWT Generation --- 
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET environment variable is not set.");
            throw new Error("Authentication configuration error.");
        }

        // Generate JWT containing user ID, expires in 1 week
        const token = jwt.sign(
            { userId: user.id }, 
            jwtSecret, 
            { expiresIn: '7d' } // Matches previous cookie expiry
        );
        // --- End of JWT Generation ---

        // const streakInfo = await getUserStreak(user.id); // Fetch streak info if needed for responseData

        // Create session cookies directly in the route handler
        const cookieStore = cookies();

        // Set the JWT as the auth token cookie (HTTP-only for security)
        cookieStore.set("rolu_auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
            sameSite: 'lax' // Recommended for security
        });

        // --- REMOVED rolu_user_data cookie --- 
        // No longer set user data directly in a client-accessible cookie
        // cookieStore.set("rolu_user_data", encodeURIComponent(JSON.stringify({...})), {...});

        return NextResponse.json({
            success: true,
            data: responseData // Send the prepared response data
        });
    } catch (error) {
        console.error("Login error:", error);
        // Check if it's a JWT error or other error
        const errorMessage = error instanceof Error ? error.message : "Authentication failed";
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
} 