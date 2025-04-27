import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        // Clear cookies directly in the route handler
        const cookieStore = cookies();
        cookieStore.delete("rolu_auth_token");
        cookieStore.delete("rolu_user_data");

        return NextResponse.json({
            success: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json(
            { success: false, error: "Logout failed" },
            { status: 500 }
        );
    }
} 