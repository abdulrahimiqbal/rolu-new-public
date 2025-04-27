import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";

/**
 * Test login endpoint that creates a test user or logs in an existing one
 * This is a temporary solution until World ID authentication is implemented
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { wallet_address } = body;

        // Validate wallet address
        if (!wallet_address || typeof wallet_address !== "string" || wallet_address.trim() === "") {
            return NextResponse.json(
                { success: false, error: "Valid wallet address is required" },
                { status: 400 }
            );
        }

        // Check if user exists in the database
        let user;
        try {
            user = await prisma.user.findFirst({
                where: { wallet_address: wallet_address.trim() }
            });
        } catch (dbError) {
            console.error("Database error during user lookup:", dbError);

            // Create a mock user if database lookup fails
            user = {
                id: uuidv4(),
                wallet_address: wallet_address.trim(),
                username: `User_${wallet_address.slice(0, 6)}`,
                profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${wallet_address}`,
                xp: 0,
                roluBalance: 100,
                level: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }

        // If user doesn't exist, create a new one
        if (!user) {
            console.log("User not found, creating new user");
            try {
                user = await prisma.user.create({
                    data: {
                        wallet_address: wallet_address.trim(),
                        username: `User_${wallet_address.slice(0, 6)}`,
                        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${wallet_address}`,
                        xp: 0,
                        roluBalance: 100,
                        level: 1
                    }
                });
                console.log("New user created:", user);
            } catch (createError) {
                console.error("Error creating user:", createError);

                // Create a mock user if database creation fails
                console.log("Creating mock user due to creation error");
                user = {
                    id: uuidv4(),
                    wallet_address: wallet_address.trim(),
                    username: `User_${wallet_address.slice(0, 6)}`,
                    profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${wallet_address}`,
                    xp: 0,
                    roluBalance: 100,
                    level: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }
        } else {
            console.log("Existing user found:", user);
        }

        // Generate a simple token (in a real app, this would be a JWT)
        const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
        console.log("Generated token for user");

        // Return user data with the token
        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    wallet_address: user.wallet_address,
                    username: user.username,
                    profileImage: user.profileImage,
                    xp: user.xp,
                    roluBalance: user.roluBalance,
                    level: user.level
                },
                token
            }
        });
    } catch (error) {
        console.error("Error in test login:", error);

        // Get wallet_address from request if possible
        let wallet_address;
        try {
            const body = await request.json();
            wallet_address = body.wallet_address;
        } catch (e) {
            // If we can't parse the request body, generate a random wallet address
            wallet_address = `0x${uuidv4().replace(/-/g, "")}`;
        }

        // Create a mock user as fallback
        const mockUser = {
            id: uuidv4(),
            wallet_address: wallet_address,
            username: "Test_User",
            profileImage: null,
            xp: 0,
            roluBalance: 0,
            level: 1
        };

        const token = Buffer.from(`${mockUser.id}:${Date.now()}`).toString('base64');

        console.log("Created fallback mock user due to error");

        // Return mock user data
        return NextResponse.json({
            success: true,
            data: {
                user: mockUser,
                token
            }
        });
    }
} 