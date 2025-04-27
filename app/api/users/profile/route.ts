import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json(
                { success: false, error: "User ID is required" },
                { status: 400 }
            );
        }

        // Fetch user data
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        // Fetch user's game sessions
        const gameSessions = await prisma.gameSession.findMany({
            where: { userId: userId },
            orderBy: { endTime: "desc" },
            take: 10, // Get the 10 most recent games
        });

        // Calculate stats
        const totalGames = gameSessions.length;
        const totalScore = gameSessions.reduce((sum, game) => sum + game.score, 0);
        const highScore = gameSessions.length > 0
            ? Math.max(...gameSessions.map(game => game.score))
            : 0;
        const totalDistance = gameSessions.reduce((sum, game) => sum + game.distance, 0);

        // Fetch quiz responses
        type QuizResponseData = {
            id: string;
            isCorrect: boolean;
        };

        let quizResponses: QuizResponseData[] = [];
        try {
            quizResponses = await prisma.quizResponse.findMany({
                where: { userId: userId },
                select: {
                    id: true,
                    isCorrect: true
                }
            });
        } catch (error) {
            console.error("Error fetching quiz responses:", error);
            // Continue with empty quizResponses array
        }

        const totalQuizzes = quizResponses.length;
        const correctQuizzes = quizResponses.filter(quiz => quiz.isCorrect).length;
        const quizAccuracy = totalQuizzes > 0
            ? Math.round((correctQuizzes / totalQuizzes) * 100)
            : 0;

        // Generate achievements
        const achievements = [];

        if (totalGames >= 5) {
            achievements.push("Dedicated Player: Played 5+ games");
        }

        if (highScore >= 500) {
            achievements.push("High Scorer: Reached 500+ points");
        }

        if (totalDistance >= 1000) {
            achievements.push("Marathon Runner: Traveled 1000+ meters");
        }

        if (quizAccuracy >= 80 && totalQuizzes >= 5) {
            achievements.push("Quiz Master: 80%+ accuracy on 5+ quizzes");
        }

        if (user.level >= 5) {
            achievements.push("Level Up: Reached level 5+");
        }

        // Format recent games
        const recentGames = gameSessions.map(game => ({
            id: game.id,
            score: game.score,
            distance: game.distance,
            date: game.endTime.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    profileImage: user.profileImage,
                    xp: user.xp,
                    roluBalance: user.roluBalance,
                    level: user.level,
                },
                stats: {
                    totalGames,
                    totalScore,
                    highScore,
                    totalDistance,
                    quizAccuracy,
                    totalQuizzes,
                },
                achievements,
                recentGames,
            },
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch user profile" },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic'; 