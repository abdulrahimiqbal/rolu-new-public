// Ensuring the route is properly marked as dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Disable cache completely
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    // If user is not authenticated yet, return a specific response
    // rather than an error, to better handle initial loading states
    if (!currentUser) {
      return NextResponse.json(
        { 
          success: false, 
          message: "User not authenticated yet",
          has_notification_permission: null,
          auth_status: "pending" 
        },
        { status: 200 } // Use 200 instead of 401 to prevent console errors
      );
    }

    // Return current notification permission status
    return NextResponse.json({
      success: true,
      has_notification_permission: currentUser.has_notification_permission === true
    });
  } catch (error) {
    console.error("Error in notification-check:", error);
    
    // Return a non-error status code to prevent console errors
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to check notification permission status",
        error: error instanceof Error ? error.message : String(error),
        auth_status: "error" 
      },
      { status: 200 } // Use 200 instead of 500 to prevent console errors
    );
  }
} 