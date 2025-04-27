import { prisma, getPrismaClient } from "@/lib/prisma";
import { trackEvent } from "@/lib/server-analytics";

/**
 * Default streak multiplier increment per day (0.1 = 10% increase per day)
 */
const DEFAULT_STREAK_MULTIPLIER_INCREMENT = 0.1;

/**
 * Maximum streak multiplier (cap at 2.0x = 200%)
 */
const MAX_STREAK_MULTIPLIER = 2.0;

/**
 * Interface for streak information
 */
export interface StreakInfo {
    currentStreak: number;
    maxStreak: number;
    multiplier: number;
    lastPlayedDate: Date | null;
    streakStartDate: Date | null;
}

/**
 * Get streak multiplier increment from environment or use default
 * @returns The streak multiplier increment per day
 */
export function getStreakMultiplierIncrement(): number {
    return process.env.NEXT_PUBLIC_STREAK_MULTIPLIER_INCREMENT
        ? parseFloat(process.env.NEXT_PUBLIC_STREAK_MULTIPLIER_INCREMENT)
        : DEFAULT_STREAK_MULTIPLIER_INCREMENT;
}

/**
 * Get maximum streak multiplier from environment or use default
 * @returns The maximum streak multiplier
 */
export function getMaxStreakMultiplier(): number {
    return process.env.NEXT_PUBLIC_MAX_STREAK_MULTIPLIER
        ? parseFloat(process.env.NEXT_PUBLIC_MAX_STREAK_MULTIPLIER)
        : MAX_STREAK_MULTIPLIER;
}

/**
 * Calculate the current multiplier based on streak
 * @param streak Current streak count
 * @returns The calculated multiplier
 */
export function calculateMultiplier(streak: number): number {
    const baseMultiplier = 1.0;
    const increment = getStreakMultiplierIncrement();
    const maxMultiplier = getMaxStreakMultiplier();

    // Calculate multiplier: base + (streak-1) * increment
    // We subtract 1 from streak because day 1 should have multiplier 1.0
    const multiplier = streak <= 1
        ? baseMultiplier
        : baseMultiplier + (streak - 1) * increment;

    // Cap at max multiplier
    return Math.min(multiplier, maxMultiplier);
}

/**
 * Get user's current streak information
 * @param userId User ID to get streak for
 * @returns Streak information or null if user not found
 */
export async function getUserStreak(userId: string): Promise<StreakInfo | null> {
    try {
        const db = getPrismaClient();
        if (!db) return null;

        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
                currentStreak: true,
                maxStreak: true,
                lastPlayedDate: true,
            },
        });

        if (!user) return null;

        // Calculate multiplier based on current streak
        const multiplier = calculateMultiplier(user.currentStreak);

        // Calculate streak start date
        const streakStartDate = user.lastPlayedDate && user.currentStreak > 0
            ? new Date(user.lastPlayedDate.getTime() - (user.currentStreak - 1) * 24 * 60 * 60 * 1000)
            : null;

        return {
            currentStreak: user.currentStreak,
            maxStreak: user.maxStreak,
            multiplier,
            lastPlayedDate: user.lastPlayedDate,
            streakStartDate
        };
    } catch (error) {
        console.error("Error getting user streak:", error);
        return null;
    }
}

/**
 * Update user's streak based on their play activity
 * @param userId User ID to update streak for
 * @returns Updated streak information or null if update failed
 */
export async function updateUserStreak(userId: string): Promise<StreakInfo | null> {
    try {
        const db = getPrismaClient();
        if (!db) return null;

        // Get current user data
        const user = await db.user.findUnique({
            where: { id: userId },
        });

        if (!user) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let newStreak = user.currentStreak;
        let newMaxStreak = user.maxStreak;
        let streakChangeType: 'increment' | 'reset' | 'first' | 'no_change' = 'no_change';

        // If this is the user's first game ever
        if (!user.lastPlayedDate) {
            newStreak = 1;
            newMaxStreak = 1;
            streakChangeType = 'first';
        } else {
            const lastPlayed = new Date(user.lastPlayedDate);
            lastPlayed.setHours(0, 0, 0, 0);

            const dayDifference = Math.floor(
                (today.getTime() - lastPlayed.getTime()) / (24 * 60 * 60 * 1000)
            );

            // Same day - streak stays the same
            if (dayDifference === 0) {
                streakChangeType = 'no_change';
            }
            // Consecutive day - increment streak
            else if (dayDifference === 1) {
                newStreak += 1;
                if (newStreak > newMaxStreak) {
                    newMaxStreak = newStreak;
                }
                streakChangeType = 'increment';
            }
            // More than one day - streak resets to 1
            else {
                newStreak = 1;
                streakChangeType = 'reset';
            }
        }

        // Calculate multiplier based on new streak
        const multiplier = calculateMultiplier(newStreak);

        // Update user only if streak changed or it's the first play
        let updatedUser = user;
        if (streakChangeType !== 'no_change') {
            updatedUser = await db.user.update({
                where: { id: userId },
                data: {
                    currentStreak: newStreak,
                    maxStreak: newMaxStreak,
                    lastPlayedDate: new Date(),
                },
            });

            // Track the streak update event
            trackEvent('Streak Updated', {
                userId: userId,
                previousStreak: user.currentStreak,
                newStreak: newStreak,
                maxStreak: newMaxStreak,
                multiplier: multiplier,
                changeType: streakChangeType
            });
        }

        // Calculate streak start date
        const streakStartDate = newStreak > 0
            ? new Date(today.getTime() - (newStreak - 1) * 24 * 60 * 60 * 1000)
            : null;

        return {
            currentStreak: updatedUser.currentStreak,
            maxStreak: updatedUser.maxStreak,
            multiplier,
            lastPlayedDate: updatedUser.lastPlayedDate,
            streakStartDate
        };
    } catch (error) {
        console.error("Error updating user streak:", error);
        return null;
    }
}

/**
 * Get user's streak activity for the last N days
 * @param userId User ID to get streak activity for
 * @param days Number of days to retrieve (default: 7)
 * @returns Array of daily activity objects with date and rolu earned
 */
export async function getUserStreakActivity(
    userId: string,
    days: number = 7
): Promise<Array<{ date: string; roluEarned: number; bonusEarned: number; hasActivity: boolean }>> {
    try {
        const db = getPrismaClient();
        if (!db) return [];

        // Calculate date range
        const endDate = new Date();
        endDate.setHours(0, 0, 0, 0);

        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - (days - 1));

        // Get all daily earnings in the date range
        const dailyEarnings = await db.dailyRoluEarnings.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        // Create a map of dates to earnings
        const earningsMap = new Map();
        dailyEarnings.forEach(earning => {
            const dateStr = earning.date.toISOString().split('T')[0];
            earningsMap.set(dateStr, {
                roluEarned: earning.totalEarned,
                bonusEarned: earning.bonusEarned,
                hasActivity: true
            });
        });

        // Create an array for all days in range
        const activityData = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const dayData = earningsMap.get(dateStr) || {
                roluEarned: 0,
                bonusEarned: 0,
                hasActivity: false
            };

            activityData.push({
                date: dateStr,
                roluEarned: dayData.roluEarned,
                bonusEarned: dayData.bonusEarned,
                hasActivity: dayData.hasActivity
            });
        }

        return activityData;
    } catch (error) {
        console.error("Error getting user streak activity:", error);
        return [];
    }
} 