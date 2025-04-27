import { getCurrentUser } from "@/lib/auth";

export interface DailyRoluStatus {
    userId: string;
    dailyLimit: number;
    earnedToday: number;
    remainingToday: number;
    limitReached: boolean;
    streak?: number;
    maxStreak?: number;
    streakMultiplier?: number;
    bonusEarned?: number;
}

/**
 * Fetches the daily Rolu token status for the current user or specified user ID
 * @param userId Optional user ID to fetch status for (if not current user)
 * @returns A promise containing the daily Rolu status
 */
export async function getDailyRoluStatus(userId?: string): Promise<DailyRoluStatus | null> {
    try {
        // Build the query parameters
        let queryParams = new URLSearchParams();
        if (userId) {
            queryParams.append('userId', userId);
        }

        // Fetch the status from the API
        const response = await fetch(`/api/user/daily-rolu-status?${queryParams.toString()}`);

        if (!response.ok) {
            console.error('Error fetching daily Rolu status:', response.statusText);
            return null;
        }

        const data = await response.json();
        console.log('Daily Rolu status:', data);

        if (!data.success) {
            console.error('API error:', data.error);
            return null;
        }

        return data.data;
    } catch (error) {
        console.error('Error fetching daily Rolu status:', error);
        return null;
    }
}

/**
 * Get default maximum daily Rolu tokens value from environment
 * @returns The maximum daily Rolu tokens allowed
 */
export function getDefaultDailyRoluLimit(): number {
    return process.env.NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS
        ? parseInt(process.env.NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS, 10)
        : 100; // Default to 100 if not set
} 