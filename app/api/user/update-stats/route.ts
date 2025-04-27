import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        // Get the current user
        const currentUser = await getCurrentUser();
        console.log(currentUser);
        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: "Not authenticated" },
                { status: 401 }
            );
        }

        // Get the stats to update
        const stats = await request.json();

        // In a real implementation, you would update the user in your database
        // For now, we'll just update the user in the session
        const updatedUser = {
            ...currentUser,
            ...stats,
        };

        // Get the current token from cookies
        const token = request.cookies.get("rolu_auth_token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Invalid session" },
                { status: 401 }
            );
        }

        // Update the user data cookie directly
        const cookieStore = cookies();
        cookieStore.set("rolu_user_data", encodeURIComponent(JSON.stringify(updatedUser)), {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: "/",
        });

        return NextResponse.json({
            success: true,
            data: { user: updatedUser },
        });
    } catch (error) {
        console.error("Update stats error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update stats" },
            { status: 500 }
        );
    }
} 