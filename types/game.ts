// Game status types
export type GameStatus =
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "error"
  | "countdown";

// Lane types
export type Lane = 0 | 1 | 2; // Left, Center, Right

// Game object types
export interface GameObject {
    id: string;
    type: 'obstacle' | 'collectible';
    lane: Lane;
    y: number; // Position from top
    speed: number;
    width: number;
    height: number;
    imageUrl?: string;
}

// Player types
export interface Player {
    lane: Lane;
    y: number; // Fixed position from bottom
    width: number;
    height: number;
    imageUrl?: string;
}

// Game configuration types
export interface GameConfig {
    brandName: string;
    background: string;
    playerImage: string;
    obstacles: {
        type: string;
        imageUrl: string;
        width: number;
        height: number;
    }[];
    collectibles: {
        type: string;
        imageUrl: string;
        width: number;
        height: number;
        points: number;
    }[];
    initialSpeed: number;
    speedIncrement: number;
    spawnRate: number;
}

// Game rewards types
export interface GameRewards {
    xp: number;
    roluTokens: number;
}

// Quiz statistics types
export interface QuizStats {
    total: number;
    correct: number;
    accuracy: number;
}

// Game session result types
export interface GameSessionResult {
    sessionId: string;
    userId?: string;
    brandId: string;
    score: number;
    distance: number;
    xpEarned: number;
    roluTokens: number;
    quizStats: QuizStats;
    timestamp: Date;
}

// User level types
export interface UserLevel {
    level: number;
    currentXP: number;
    nextLevelXP: number;
    progress: number; // Percentage to next level (0-100)
} 