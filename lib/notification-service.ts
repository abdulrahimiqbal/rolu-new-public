import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Define the expected structure of the World App API response for a single delivery
interface WorldAppDeliveryResult {
    walletAddress: string;
    sent: boolean;
    reason?: string;
}

// Define the expected structure of the World App API success response
interface WorldAppNotificationSuccessResponse {
    success: boolean;
    result: WorldAppDeliveryResult[];
}

/**
 * Sends a notification to specified wallet addresses via the World App Minikit API.
 *
 * @param {string[]} walletAddresses - An array of wallet addresses to send the notification to (max 1000 per call).
 * @param {string} title - The notification title (max 30 characters).
 * @param {string} message - The notification message (max 200 characters).
 * @param {string} [miniAppPath] - Optional deep link path within the mini-app.
 * @returns {Promise<{success: boolean, results?: WorldAppDeliveryResult[], error?: string}>} - An object indicating success or failure, optionally including delivery results or an error message.
 */
export async function sendWorldAppNotification(
    walletAddresses: string[],
    title: string,
    message: string,
    miniAppPath: string = '/' // Default path if none provided
): Promise<{success: boolean, results?: WorldAppDeliveryResult[], error?: string}> {
    
    // Input validation
    if (!walletAddresses || walletAddresses.length === 0) {
        console.error("sendWorldAppNotification: No wallet addresses provided.");
        return { success: false, error: "No wallet addresses provided." };
    }
    if (walletAddresses.length > 1000) {
         console.warn(`sendWorldAppNotification: Attempted to send to ${walletAddresses.length} users, but the limit is 1000. Sending only the first 1000.`);
         walletAddresses = walletAddresses.slice(0, 1000);
    }
    if (!title || title.length > 30) {
        console.error(`sendWorldAppNotification: Invalid title (length ${title?.length}). Max 30 chars.`);
        return { success: false, error: "Invalid title." };
    }
     if (!message || message.length > 200) {
        console.error(`sendWorldAppNotification: Invalid message (length ${message?.length}). Max 200 chars.`);
        return { success: false, error: "Invalid message." };
    }

    const apiKey = process.env.WORLD_ID_API_KEY;
    const appId = process.env.WORLD_ID_APP_ID;

    if (!apiKey || !appId) {
        console.error("sendWorldAppNotification: WORLD_ID_API_KEY or WORLD_ID_APP_ID environment variables are not set.");
        return { success: false, error: "Server configuration error for notifications." };
    }

    try {
        const response = await fetch("https://developer.worldcoin.org/api/v2/minikit/send-notification", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                app_id: appId,
                wallet_addresses: walletAddresses,
                title,
                message,
                // Construct the deep link path
                mini_app_path: `worldapp://mini-app?app_id=${appId}&path=${miniAppPath}`
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`sendWorldAppNotification: World App API error (${response.status}):`, errorText);
            return { success: false, error: `World App API error: ${response.status}` };
        }

        const result = await response.json() as WorldAppNotificationSuccessResponse;
        console.log(`sendWorldAppNotification: Successfully called World App API for ${walletAddresses.length} addresses.`);

        // Return success and the delivery results array
        return { success: true, results: result.result };

    } catch (error) {
        console.error("sendWorldAppNotification: Failed to send notification:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error during notification sending." };
    }
}

// Optional: Add function to update NotificationReceipt statuses if needed outside broadcast
// async function updateReceiptStatuses(notificationId: string, results: WorldAppDeliveryResult[]) { ... }

// Placeholder for notification service functions
export {}; 