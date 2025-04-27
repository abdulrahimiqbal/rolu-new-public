import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

interface QuizMetricsResponse {
    brandId: string;
    totalQuizzes: number;
    totalResponses: number;
    correctResponses: number;
    accuracy: number;
    quizCompletionPercentage: number;
    totalRoluEarned: number;
    userRoluEarned: number;
}

// Helper function to calculate user's Rolu earned
async function calculateUserRoluEarned(brandId: string, userId: string): Promise<number> {
    const userGameSessions = await prisma.gameSession.findMany({
        where: {
            brandId,
            userId,
        },
        select: { roluEarned: true },
    });

    return userGameSessions.reduce(
        (total, session) => total + (session.roluEarned || 0),
        0
    );
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const brandIds = searchParams.get("brandIds");

        if (!brandIds) {
            return NextResponse.json(
                { error: "brandIds parameter is required" },
                { status: 400 }
            );
        }

        // Parse the comma-separated list of brand IDs
        const brandIdList = brandIds.split(",");

        // Get the current user from cookies
        let userId: string | undefined;
        const cookieStore = cookies();
        const userDataCookie = cookieStore.get("rolu_user_data")?.value;

        if (userDataCookie) {
            try {
                const userData = JSON.parse(decodeURIComponent(userDataCookie));
                userId = userData.id;
            } catch (err) {
                console.error("Error parsing user data from cookie:", err);
            }
        }

        // Get metrics for all requested brands in parallel
        const metricsPromises = brandIdList.map(async (brandId) => {
            // Get the total number of quizzes for this brand
            const totalQuizzes = await prisma.quiz.count({
                where: { brandId },
            });

            // Get all quiz responses for quizzes in this brand
            const quizResponses = await prisma.quizResponse.findMany({
                where: {
                    quiz: { brandId },
                    ...(userId ? { userId } : {}), // Only count user's responses if user is logged in
                },
                select: {
                    isCorrect: true,
                    quizId: true, // Add quizId to track unique quizzes
                    userId: true,
                },
            });


            // Calculate metrics for overall stats
            const totalResponses = quizResponses.length;
            const correctResponses = quizResponses.filter(
                (response) => response.isCorrect
            ).length;

            // Count unique correctly answered quizzes
            const uniqueCorrectQuizzes = new Set(
                quizResponses
                    .filter(response => response.isCorrect)
                    .map(response => response.quizId)
            ).size;

            // Calculate accuracy based solely on responses (not quizzes)
            // Only use responses as the denominator (percentage of correct answers out of all answers)
            const accuracy = totalResponses > 0
                ? (correctResponses / totalResponses) * 100
                : 0;


            // Calculate quiz completion percentage based on unique correct quizzes
            // and cap it at 100%
            const quizCompletionPercentage = totalQuizzes > 0
                ? Math.min((uniqueCorrectQuizzes / totalQuizzes) * 100, 100)
                : 0;

            // Get the total Rolu earned by all users from game sessions for this brand
            const allGameSessions = await prisma.gameSession.findMany({
                where: { brandId },
                select: { roluEarned: true },
            });

            // Calculate total Rolu earned by all users
            const totalRoluEarned = allGameSessions.reduce(
                (total, session) => total + (session.roluEarned || 0),
                0
            );

            // Calculate user's Rolu earned if userId is available
            const userRoluEarned = userId ? await calculateUserRoluEarned(brandId, userId) : 0;

            const metrics: QuizMetricsResponse = {
                brandId,
                totalQuizzes,
                totalResponses,
                correctResponses,
                accuracy,
                quizCompletionPercentage,
                totalRoluEarned,
                userRoluEarned,
            };

            return metrics;
        });

        // Wait for all metrics to be calculated
        const results = await Promise.all(metricsPromises);

        // Convert array to object with brandId as key
        const metricsMap = results.reduce((acc, metrics) => {
            acc[metrics.brandId] = metrics;
            return acc;
        }, {} as Record<string, QuizMetricsResponse>);

        return NextResponse.json(metricsMap);
    } catch (error) {
        console.error("Error fetching batch quiz metrics:", error);
        return NextResponse.json(
            { error: "Failed to fetch batch quiz metrics" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic"; 