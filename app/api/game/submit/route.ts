import { NextResponse } from "next/server";
import { prisma, getPrismaClient } from "@/lib/prisma";
import { User } from '@prisma/client';
import {
    calculateXP,
    calculateRoluTokens,
    calculateLevel,
} from "@/lib/game-rewards";
import { updateUserStreak, calculateMultiplier } from "@/lib/streak-service";
import { GameSettings } from "@/lib/game-config";
import { trackEvent } from "@/lib/analytics";
import { trackEvent as serverTrackEvent } from "@/lib/server-analytics";

// Flag to enable/disable blockchain integration
const isBlockchainEnabled =
    process.env.NEXT_PUBLIC_BLOCKCHAIN_ENABLED === "true";

interface QuizResult {
    questionId: string;
    correct: boolean;
    optionId: string;
}

// Extended quiz result to support new format
interface ExtendedQuizResult extends QuizResult {
    isCorrect?: boolean; // Optional field for new format
}

interface GameSubmitRequest {
    sessionId: string;
    score: number;
    distance: number;
    quizResults?: QuizResult[];
    brandId: string;
    userId?: string; // Optional for now, will be required when auth is implemented
    xpEarned?: number; // Optional, will be calculated if not provided
    roluTokens?: number; // Optional, will be calculated if not provided
    quizStats?: {
        total: number;
        correct: number;
        accuracy: number;
    };
    quizResponses?: ExtendedQuizResult[]; // Add this to extract quiz responses from the request
}

export async function POST(request: Request) {
    let db = getPrismaClient();
    const startTime = performance.now(); // Start timing
    let success = false;
    let status = 500; // Default status

    try {
        // Use a direct client instance to ensure it's available
        if (!db) {
            console.error("Prisma client is not initialized");
            return NextResponse.json(
                {
                    success: true, // Return success with fallback data
                    error: "Database connection error",
                    data: {
                        gameStats: {
                            score: 0,
                            distance: 0,
                            xpEarned: 0,
                            roluEarned: 0,
                        },
                        userStats: {
                            totalXP: 0,
                            roluBalance: 0,
                            level: 1,
                            streak: 0,
                            multiplier: 1.0,
                        },
                        roluLimitInfo: {
                            dailyLimit: parseInt(
                                process.env.NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS || "100",
                                10
                            ),
                            earnedToday: 0,
                            remainingToday: parseInt(
                                process.env.NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS || "100",
                                10
                            ),
                            isLimitReached: false,
                        },
                        message:
                            "Using default values due to database initialization error",
                    },
                },
                { status: 200 } // Return 200 with fallback data instead of 500
            );
        }

        const body = (await request.json()) as GameSubmitRequest;
        const {
            sessionId,
            score,
            distance,
            quizResults,
            brandId,
            userId,
            xpEarned: providedXP,
            roluTokens: providedRolu,
            quizStats,
            quizResponses,
        } = body;

        // Validate required fields
        if (
            !sessionId ||
            score === undefined ||
            distance === undefined ||
            !brandId ||
            !userId
        ) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Fetch Game Settings for the Brand
        let gameSettings: GameSettings | null = null;
        let roluPerAnswerConfig = 5; // Default value
        try {
            // Apply same fallback logic as getGameConfig
            gameSettings = await db.gameSettings.findFirst({
                where: { brandId, isDefault: true },
            });
            if (!gameSettings) {
                gameSettings = await db.gameSettings.findFirst({
                    where: { isGlobal: true, isDefault: true },
                });
            }
            if (!gameSettings) {
                gameSettings = await db.gameSettings.findFirst({
                    where: { brandId },
                });
            }
            if (!gameSettings) {
                gameSettings = await db.gameSettings.findFirst({
                    where: { isGlobal: true },
                });
            }

            if (gameSettings) {
                roluPerAnswerConfig = gameSettings.roluPerCorrectAnswer;
                console.log(`Using configured ROLU per correct answer: ${roluPerAnswerConfig} for brand ${brandId}`);
            } else {
                console.warn(`No specific game settings found for brand ${brandId}, using default ROLU per answer: ${roluPerAnswerConfig}`);
            }
        } catch (settingsError) {
            console.error(`Error fetching game settings for brand ${brandId}, using default ROLU per answer: ${roluPerAnswerConfig}:`, settingsError);
        }

        // Calculate XP and Rolu tokens using our utility functions
        const correctQuizAnswers =
            quizStats?.correct || quizResults?.filter((r) => r.correct).length || 0;

        const totalXP = providedXP || calculateXP(distance);
        // Pass the configured value to calculateRoluTokens
        const calculatedRoluTokens =
            providedRolu ||
            Math.max(1, calculateRoluTokens(score, correctQuizAnswers, roluPerAnswerConfig));

        console.log(
            `Game completed - Score: ${score}, Distance: ${distance}, XP: ${totalXP}, Calculated Rolu: ${calculatedRoluTokens} (using ${roluPerAnswerConfig} per answer)`
        );

        // If userId is provided, store the game session in the database
        const targetUserId = userId;
        if (targetUserId) {
            console.log(`Updating database for user: ${targetUserId}`);
            let updatedUser: User | null = null; // Define updatedUser in outer scope
            let gameSessionId: string | null = null; // Define gameSessionId here

            try {
                // Check if user exists
                const user = await db.user.findUnique({
                    where: { id: targetUserId },
                });

                if (!user) {
                    return NextResponse.json(
                        { success: false, error: "User not found" },
                        { status: 404 }
                    );
                }

                // Get the daily limit from environment variable
                const MAX_DAILY_ROLU_TOKENS = process.env
                    .NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS
                    ? parseInt(process.env.NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS, 10)
                    : 100; // Default to 100 if not set

                // Get today's date (reset hours to get the beginning of the day)
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Default values in case of errors
                let earnedToday = 0;
                let remainingToday = MAX_DAILY_ROLU_TOKENS;
                let roluTokensToAward = calculatedRoluTokens;
                let streakMultiplier = 1.0;
                let bonusRoluTokens = 0;
                let streakInfo = null;
                try {
                    streakInfo = await updateUserStreak(targetUserId);
                    if (streakInfo) {
                        streakMultiplier = streakInfo.multiplier;
                        // Apply multiplier only if it's greater than 1.0
                        if (streakMultiplier > 1.0) {
                            // Calculate bonus tokens (only the additional portion)
                            bonusRoluTokens = Math.floor(calculatedRoluTokens * (streakMultiplier - 1.0));
                            // Total tokens to award = original + bonus
                            roluTokensToAward = calculatedRoluTokens + bonusRoluTokens;
                        }
                        console.log(`Streak: ${streakInfo.currentStreak}, Multiplier: ${streakMultiplier}, Bonus Rolus: ${bonusRoluTokens}`);
                    } else {
                        console.log("Failed to update streak, using default multiplier");
                    }
                } catch (streakError) {
                    console.error("Error updating streak:", streakError);
                }

                try {
                    // Check and update daily earnings
                    let todayEarnings = await db.dailyRoluEarnings.findUnique({
                        where: {
                            userId_date: {
                                userId: targetUserId,
                                date: today,
                            },
                        },
                    });

                    earnedToday = todayEarnings?.totalEarned || 0;
                    remainingToday = Math.max(0, MAX_DAILY_ROLU_TOKENS - earnedToday);

                    // Determine how many tokens can actually be awarded (respecting daily limit)
                    // Cap the total roluTokensToAward to the daily limit
                    const cappedRoluTokens = Math.min(roluTokensToAward, remainingToday);

                    // If we can't award all tokens, adjust the bonus proportionally
                    if (cappedRoluTokens < roluTokensToAward && roluTokensToAward > 0) {
                        const proportion = cappedRoluTokens / roluTokensToAward;
                        bonusRoluTokens = Math.floor(bonusRoluTokens * proportion);
                    }

                    // Final amount to award
                    roluTokensToAward = cappedRoluTokens;

                    console.log(
                        `Daily Rolu limit: ${MAX_DAILY_ROLU_TOKENS}, Already earned today: ${earnedToday}, Remaining: ${remainingToday}, Will award: ${roluTokensToAward} (including ${bonusRoluTokens} bonus)`
                    );

                    // Create or update the daily earnings record
                    if (todayEarnings) {
                        await db.dailyRoluEarnings.update({
                            where: {
                                id: todayEarnings.id,
                            },
                            data: {
                                totalEarned: todayEarnings.totalEarned + roluTokensToAward,
                                bonusEarned: todayEarnings.bonusEarned + bonusRoluTokens,
                                multiplier: streakMultiplier,
                            },
                        });
                    } else {
                        await db.dailyRoluEarnings.create({
                            data: {
                                userId: targetUserId,
                                date: today,
                                totalEarned: roluTokensToAward,
                                bonusEarned: bonusRoluTokens,
                                multiplier: streakMultiplier,
                            },
                        });
                    }
                } catch (dailyRoluError) {
                    console.error("Error managing daily Rolu earnings:", dailyRoluError);
                    // Continue with default values (give full tokens)
                    roluTokensToAward = calculatedRoluTokens;
                    bonusRoluTokens = 0;
                }

                // --- Fetch user data needed for checks (Moved outside try block) ---
                const referredUser = await db.user.findUnique({
                    where: { id: targetUserId },
                    select: {
                        referredById: true,
                        createdAt: true,
                        is_verified: true,
                        brandsCompleted: true // Need this for brand completion check
                    }
                });

                // Check if this brand completion is new for the user
                // This assumes brandsCompleted stores a count or similar
                // Placeholder logic - adjust based on actual schema
                const isNewBrandCompletion = true; // Replace with actual check, e.g., !userCompletedBrands.includes(brandId)

                // --- Referral Bonus Logic (Two-Query Approach) ---
                let referralBonusAwarded = 0;
                try {
                    // Check conditions on the referred user
                    if (referredUser && referredUser.referredById && referredUser.is_verified && roluTokensToAward > 0) {
                        // Check if user created within the last 7 days
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                        if (referredUser.createdAt > sevenDaysAgo) {
                            // If conditions met, fetch the referrer user separately
                            const referrerUser = await db.user.findUnique({
                                where: { id: referredUser.referredById },
                                select: { id: true } // Only need ID to update balance
                            });

                            if (referrerUser) {
                                // Calculate 10% bonus
                                const referralBonus = Math.floor(roluTokensToAward * 0.10);

                                if (referralBonus > 0) {
                                    // Award bonus to the referrer
                                    await db.user.update({
                                        where: { id: referrerUser.id },
                                        data: { roluBalance: { increment: referralBonus } }
                                    });
                                    referralBonusAwarded = referralBonus;
                                    console.log(`Awarded ${referralBonus} ROLU referral bonus to referrer ${referrerUser.id} for user ${targetUserId}'s earnings.`);
                                }
                            } else {
                                console.log(`Referrer user with ID ${referredUser.referredById} not found.`);
                            }
                        } else {
                            console.log(`User ${targetUserId} is outside the 7-day referral bonus window.`);
                        }
                    } else {
                        // Log why the bonus wasn't processed
                        if (!referredUser?.referredById) console.log(`User ${targetUserId} was not referred.`);
                        if (referredUser && !referredUser.is_verified) console.log(`User ${targetUserId} is not World ID verified.`);
                        if (roluTokensToAward <= 0) console.log(`No ROLU awarded to user ${targetUserId} in this session, skipping referral bonus.`);
                    }
                } catch (referralError) {
                    console.error(`Error processing referral bonus for user ${targetUserId}:`, referralError);
                }
                // --- End Referral Bonus Logic ---

                // Separate try block for critical updates
                try {
                    // Create game session FIRST to get its ID
                    const gameSession = await db.gameSession.create({
                        data: {
                            userId: targetUserId,
                            brandId,
                            score,
                            distance,
                            xpEarned: totalXP,
                            roluEarned: roluTokensToAward, // Use final awarded amount
                            startTime: new Date(Date.now() - 1000 * 60 * 5), // Estimate
                            endTime: new Date(),
                        },
                    });
                    gameSessionId = gameSession.id; // Store ID for later use
                    console.log(`Game session created: ${gameSessionId}`);

                    // Store quiz responses if any
                    const responsesToStore = quizResponses || quizResults || [];
                    if (responsesToStore.length > 0) {
                       console.log(`Storing ${responsesToStore.length} quiz responses for session ${gameSessionId}`);
                        await db.$transaction(
                            responsesToStore.map(response => 
                                db.quizResponse.create({
                                    data: {
                                        userId: targetUserId,
                                        quizId: response.questionId,
                                        optionId: response.optionId,
                                        isCorrect: response.correct || (response as ExtendedQuizResult).isCorrect || false,
                                        gameSessionId: gameSessionId, // Use stored ID
                                    },
                                })
                            )
                        );
                }

                    // Calculate new level
                const newTotalXP = user.xp + totalXP;
                const newLevel = calculateLevel(newTotalXP);

                    // Update user XP and level (NOT roluBalance)
                    await db.user.update({
                        where: { id: targetUserId },
                        data: {
                            xp: { increment: totalXP },
                            level: newLevel,
                            brandsCompleted: { increment: isNewBrandCompletion ? 1 : 0 },
                            roluBalance: { increment: roluTokensToAward }
                        },
                    });

                    // Create ClaimableReward record
                    // if (roluTokensToAward > 0) {
                    //     const newClaimableReward = await db.claimableReward.create({
                    //         data: {
                    //             userId: targetUserId,
                    //             amount: roluTokensToAward,
                    //             status: 'PENDING',
                    //         }
                    //     });
                    //     console.log(`Created PENDING ClaimableReward: ${newClaimableReward.id} for ${roluTokensToAward} ROLU`);
                    // } else {
                    //      console.log("No ROLU tokens awarded, skipping ClaimableReward.");
                    // }

                    // Fetch final user state AFTER all updates
                    updatedUser = await db.user.findUnique({ where: { id: targetUserId } });
                    if (!updatedUser) throw new Error("Failed to re-fetch user data after updates.");

                     // --- Track First Reward Event --- (Keep as is)
                    if (referredUser && roluTokensToAward > 0 && !user.createdAt) { // Check if it's the first reward implicitly
                        serverTrackEvent('First Reward Earned', {
                            timeToFirstRewardMs: Date.now() - new Date(referredUser.createdAt).getTime(),
                            rewardAmount: roluTokensToAward,
                            bonusAmount: bonusRoluTokens,
                            trigger: 'game_completion'
                        });
                    }

                } catch (updateError) {
                    console.error("Error during critical DB updates (session/user/reward):", updateError);
                    // If core updates fail, we should indicate an error in the response
                    throw updateError; // Re-throw to be caught by outer catch block
                }

                // Prepare successful response data using updatedUser
                const finalRoluBalance = updatedUser.roluBalance; // Use the latest balance from DB
                const response = NextResponse.json({
                    success: true,
                    data: {
                        sessionId: gameSessionId ?? sessionId, // Use created ID or fallback
                        gameStats: {
                            score,
                            distance,
                            xpEarned: totalXP,
                            roluEarned: roluTokensToAward,
                            bonusRoluEarned: bonusRoluTokens,
                            calculatedRolu: calculatedRoluTokens,
                            quizStats: quizStats || {
                                total: quizResults?.length || 0,
                                correct: correctQuizAnswers,
                                accuracy: quizResults?.length
                                    ? (correctQuizAnswers / quizResults.length) * 100
                                    : 0,
                            },
                            streakMultiplier: streakMultiplier,
                        },
                        userStats: {
                            totalXP: updatedUser.xp,
                            roluBalance: finalRoluBalance,
                            level: updatedUser.level,
                            streak: streakInfo?.currentStreak || 0,
                            maxStreak: streakInfo?.maxStreak || 0,
                        },
                        roluLimitInfo: {
                            dailyLimit: MAX_DAILY_ROLU_TOKENS,
                            earnedToday: earnedToday + roluTokensToAward,
                            remainingToday: Math.max(0, MAX_DAILY_ROLU_TOKENS - (earnedToday + roluTokensToAward)),
                            isLimitReached: (earnedToday + roluTokensToAward) >= MAX_DAILY_ROLU_TOKENS,
                        },
                    },
                });
                success = true;
                status = 200;
                return response;

            } catch (dbError) {
                console.error("Database error during game submission processing:", dbError);
                // Fallback response - use data available in THIS scope (request body)
                const fallbackXP = providedXP ?? calculateXP(distance);
                const fallbackRolu = providedRolu ?? calculateRoluTokens(score, correctQuizAnswers, roluPerAnswerConfig); // Use originally calculated
                const fallbackLevel = 1; // Cannot know level without DB user data
                const fallbackBalance = 0; // Cannot know balance
                const fallbackTotalXP = fallbackXP; // Cannot know previous XP
                const MAX_DAILY_ROLU_TOKENS_FALLBACK = parseInt(process.env.NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS || "100", 10);

                const response = NextResponse.json({
                    success: true, // Indicate operation completed but with fallback data
                    data: {
                        sessionId,
                        gameStats: {
                            score,
                            distance,
                            xpEarned: fallbackXP,
                            roluEarned: fallbackRolu, // Report what was calculated
                            bonusRoluEarned: 0, // Cannot calculate bonus reliably
                            calculatedRolu: fallbackRolu,
                            quizStats: quizStats || { total: 0, correct: 0, accuracy: 0 },
                            streakMultiplier: 1.0, // Default
                        },
                        userStats: {
                            totalXP: fallbackTotalXP,
                            roluBalance: fallbackBalance,
                            level: fallbackLevel,
                            streak: 0,
                            maxStreak: 0,
                        },
                        roluLimitInfo: {
                            dailyLimit: MAX_DAILY_ROLU_TOKENS_FALLBACK,
                            earnedToday: fallbackRolu, // Best guess
                            remainingToday: Math.max(0, MAX_DAILY_ROLU_TOKENS_FALLBACK - fallbackRolu),
                            isLimitReached: fallbackRolu >= MAX_DAILY_ROLU_TOKENS_FALLBACK,
                        },
                         error: `Database error prevented saving full results: ${dbError instanceof Error ? dbError.message : 'Unknown DB error'}`
                    },
                }, { status: 200 }); // Return 200 OK with fallback/error message
                 return response;
            }
        } else {
            // If no userId, just return the game stats without storing in database
            console.log("No user ID provided, not updating database");

            // For demo purposes, we'll simulate a user with some existing XP and Rolu
            const mockExistingXP = 1000;
            const mockExistingRolu = 100;
            const newTotalXP = mockExistingXP + totalXP;
            const newLevel = calculateLevel(newTotalXP);

            // Get the daily limit from environment variable for the mock case too
            const MAX_DAILY_ROLU_TOKENS = process.env
                .NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS
                ? parseInt(process.env.NEXT_PUBLIC_MAX_DAILY_ROLU_TOKENS, 10)
                : 100; // Default to 100 if not set

            const response = NextResponse.json({
                success: true,
                data: {
                    sessionId,
                    gameStats: {
                        score,
                        distance,
                        quizResults,
                        xpEarned: totalXP,
                        roluEarned: calculatedRoluTokens, // Use the original calculated amount for demo
                        bonusRoluEarned: 0, // No bonus for non-logged in users
                        quizStats: quizStats || {
                            total: quizResults?.length || 0,
                            correct: correctQuizAnswers,
                            accuracy: quizResults?.length
                                ? (correctQuizAnswers / quizResults.length) * 100
                                : 0,
                        },
                        streakMultiplier: 1.0, // Default multiplier for non-logged in users
                    },
                    userStats: {
                        totalXP: newTotalXP,
                        roluBalance: mockExistingRolu + calculatedRoluTokens,
                        level: newLevel,
                        streak: 0,
                        maxStreak: 0,
                    },
                    roluLimitInfo: {
                        dailyLimit: MAX_DAILY_ROLU_TOKENS,
                        earnedToday: 0, // Mock value for demo
                        remainingToday: MAX_DAILY_ROLU_TOKENS,
                        isLimitReached: false,
                    },
                },
            });

            success = true; // Mark as success (even for non-logged-in)
            status = 200;
            return response; // Return the mock response
        }
    } catch (error) {
        console.error("Error submitting game results:", error);
        success = false;
        status = 500;
        return NextResponse.json(
            { success: false, error: "Failed to process game results" },
            { status: 500 }
        );
    } finally {
        // Track API Request Completed in finally block
        serverTrackEvent('API Request Completed', {
            endpoint: '/api/game/submit',
            method: 'POST',
            latencyMs: performance.now() - startTime,
            success: success,
            statusCode: status
        });
    }
}
