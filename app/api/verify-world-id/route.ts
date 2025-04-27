import { verifyCloudProof, IVerifyResponse, ISuccessResult } from "@worldcoin/minikit-js";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface IRequestPayload {
    payload: ISuccessResult;
    action: string;
    signal?: string;
}

export async function POST(req: NextRequest) {
    console.log("=== Starting backend verification ===");

    try {
        // Get the auth token from cookies
        const token = req.cookies.get('rolu_auth_token')?.value;
        console.log("Auth token:", token ? "Found" : "Not found");

        if (!token) {
            console.log("Unauthorized - No valid token");
            return NextResponse.json({
                verifyRes: null,
                status: 401,
                message: "Unauthorized"
            });
        }

        // Extract user information from the user data cookie instead of parsing token
        const userDataCookie = req.cookies.get('rolu_user_data')?.value;
        console.log("User data cookie:", userDataCookie ? "Found" : "Not found");

        if (!userDataCookie) {
            console.log("User data not found");
            return NextResponse.json({
                verifyRes: null,
                status: 401,
                message: "User data not found"
            });
        }

        let userId;

        try {
            // Parse user data from cookie
            const userData = JSON.parse(decodeURIComponent(userDataCookie));
            userId = userData.id;

            if (!userId) {
                throw new Error("No user ID in user data");
            }
        } catch (parseError) {
            console.error("Error parsing user data:", parseError);
            return NextResponse.json({
                verifyRes: null,
                status: 401,
                message: "Invalid user data format"
            });
        }

        console.log("User ID from cookie:", userId);

        const body = await req.json();
        console.log("Request body:", {
            action: body.action,
            signal: body.signal,
            payloadPresent: !!body.payload
        });

        const { payload: worldIdPayload, action, signal } = body as IRequestPayload;
        console.log("World ID App ID:", process.env.WORLD_APP_ID);

        if (!process.env.WORLD_APP_ID) {
            console.error("WORLD_APP_ID not configured");
            throw new Error("WORLD_APP_ID is not configured");
        }

        console.log("Calling verifyCloudProof...");
        const verifyRes = await verifyCloudProof(
            worldIdPayload,
            process.env.WORLD_APP_ID as `app_${string}`,
            action,
            signal
        );
        console.log("verifyCloudProof response:", verifyRes);

        if (verifyRes.success) {
            console.log("Verification successful, updating database...");
            try {
                // Update user verification status
                await prisma.user.update({
                    where: { id: userId },
                    data: { is_verified: true }
                });
                console.log("Database updated successfully");
            } catch (dbError) {
                console.error("Database error:", dbError);
                // Return error but don't stop the process
                return NextResponse.json({
                    verifyRes,
                    status: 500,
                    message: "Database update failed"
                });
            }

            return NextResponse.json({ verifyRes, status: 200 });
        } else {
            console.log("Verification failed:", verifyRes);
            return NextResponse.json({
                verifyRes,
                status: 400,
                message: "Verification failed"
            });
        }
    } catch (error) {
        console.error("Server error details:", {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });

        return NextResponse.json({
            verifyRes: null,
            status: 500,
            message: error instanceof Error ? error.message : "Internal server error"
        });
    }
} 