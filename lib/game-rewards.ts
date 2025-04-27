/**
 * Game rewards calculation utility functions
 * These functions calculate XP and Rolu tokens based on game performance
 */

/**
 * Calculate XP earned based on distance traveled
 * XP increases with distance at a progressive rate
 * 
 * @param distance - Distance traveled in meters
 * @returns The amount of XP earned
 */
export function calculateXP(distance: number): number {
    // Base XP calculation: 1 XP per meter with a progressive bonus
    const baseXP = distance;

    // Progressive bonus: additional XP for milestone distances
    let bonusXP = 0;

    if (distance > 1000) {
        bonusXP += Math.floor(distance / 1000) * 100; // +100 XP per 1000m
    }

    if (distance > 500) {
        bonusXP += Math.floor(distance / 500) * 50; // +50 XP per 500m
    }

    if (distance > 100) {
        bonusXP += Math.floor(distance / 100) * 10; // +10 XP per 100m
    }

    return Math.floor(baseXP + bonusXP);
}

/**
 * Calculate Rolu tokens earned based on score and quiz performance
 * 
 * @param score - Game score from collectibles and distance
 * @param correctQuizAnswers - Number of correctly answered quiz questions
 * @param tokensPerCorrectAnswer - Configured ROLU tokens awarded per correct answer
 * @returns The amount of Rolu tokens earned
 */
export function calculateRoluTokens(
    score: number, 
    correctQuizAnswers: number,
    tokensPerCorrectAnswer: number = 5 // Default to 5 if not provided
): number {
    // Base token calculation: 1 token per 1000 score points
    const baseTokens = Math.floor(score / 1000);

    // Quiz bonus: Use the configured value
    const quizBonus = correctQuizAnswers * tokensPerCorrectAnswer;

    return baseTokens + quizBonus;
}

/**
 * Calculate level based on total XP
 * Levels increase at a progressive rate requiring more XP for higher levels
 * 
 * @param totalXP - Total accumulated XP
 * @returns The current level
 */
export function calculateLevel(totalXP: number): number {
    // Level thresholds - each index represents the XP needed for that level
    const levelThresholds = [
        0,      // Level 1: 0 XP
        100,    // Level 2: 100 XP
        300,    // Level 3: 300 XP
        600,    // Level 4: 600 XP
        1000,   // Level 5: 1000 XP
        1500,   // Level 6: 1500 XP
        2100,   // Level 7: 2100 XP
        2800,   // Level 8: 2800 XP
        3600,   // Level 9: 3600 XP
        4500,   // Level 10: 4500 XP
        5500,   // Level 11: 5500 XP
        6600,   // Level 12: 6600 XP
        7800,   // Level 13: 7800 XP
        9100,   // Level 14: 9100 XP
        10500,  // Level 15: 10500 XP
        12000,  // Level 16: 12000 XP
        13600,  // Level 17: 13600 XP
        15300,  // Level 18: 15300 XP
        17100,  // Level 19: 17100 XP
        19000   // Level 20: 19000 XP
    ];

    // Find the highest level threshold that is less than or equal to the total XP
    for (let i = levelThresholds.length - 1; i >= 0; i--) {
        if (totalXP >= levelThresholds[i]) {
            return i + 1; // +1 because array is 0-indexed but levels start at 1
        }
    }

    return 1; // Default to level 1
}

/**
 * Calculate the XP needed for the next level
 * 
 * @param totalXP - Total accumulated XP
 * @returns The XP needed for the next level
 */
export function calculateXPForNextLevel(totalXP: number): number {
    const currentLevel = calculateLevel(totalXP);

    // Level thresholds - each index represents the XP needed for that level
    const levelThresholds = [
        0,      // Level 1: 0 XP
        100,    // Level 2: 100 XP
        300,    // Level 3: 300 XP
        600,    // Level 4: 600 XP
        1000,   // Level 5: 1000 XP
        1500,   // Level 6: 1500 XP
        2100,   // Level 7: 2100 XP
        2800,   // Level 8: 2800 XP
        3600,   // Level 9: 3600 XP
        4500,   // Level 10: 4500 XP
        5500,   // Level 11: 5500 XP
        6600,   // Level 12: 6600 XP
        7800,   // Level 13: 7800 XP
        9100,   // Level 14: 9100 XP
        10500,  // Level 15: 10500 XP
        12000,  // Level 16: 12000 XP
        13600,  // Level 17: 13600 XP
        15300,  // Level 18: 15300 XP
        17100,  // Level 19: 17100 XP
        19000   // Level 20: 19000 XP
    ];

    // If at max level, return 0
    if (currentLevel >= levelThresholds.length) {
        return 0;
    }

    // Return the XP needed for the next level
    return levelThresholds[currentLevel] - totalXP;
}

/**
 * Generate a game summary with all rewards and statistics
 * 
 * @param score - Game score
 * @param distance - Distance traveled in meters
 * @param correctQuizAnswers - Number of correctly answered quiz questions
 * @param totalQuizzes - Total number of quiz questions encountered
 * @returns A summary object with all game statistics and rewards
 */
export function generateGameSummary(
    score: number,
    distance: number,
    correctQuizAnswers: number,
    totalQuizzes: number
): GameSummary {
    const xpEarned = calculateXP(distance);
    const roluTokens = calculateRoluTokens(score, correctQuizAnswers);

    return {
        score,
        distance,
        xpEarned,
        roluTokens,
        quizStats: {
            correct: correctQuizAnswers,
            total: totalQuizzes,
            accuracy: totalQuizzes > 0 ? (correctQuizAnswers / totalQuizzes) * 100 : 0
        }
    };
}

/**
 * Game summary interface
 */
export interface GameSummary {
    score: number;
    distance: number;
    xpEarned: number;
    roluTokens: number;
    quizStats: {
        correct: number;
        total: number;
        accuracy: number;
    };
} 