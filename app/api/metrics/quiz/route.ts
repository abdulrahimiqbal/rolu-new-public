import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

interface QuizMetricsResponse {
    brandId: string;
    totalQuizzes: number;
    totalResponses: number;
    correctResponses: number;
    accuracy: number;
    totalRoluEarned: number;
    userRoluEarned: number;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get("brandId");

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

        if (!brandId) {
            return NextResponse.json(
                { error: "Brand ID is required" },
                { status: 400 }
            );
        }

        // Get the total number of quizzes for this brand
        const totalQuizzes = await prisma.quiz.count({
            where: {
                brandId,
            },
        });

        // Get all quiz responses for quizzes in this brand
        const quizResponses = await prisma.quizResponse.findMany({
            where: {
                quiz: {
                    brandId,
                },
            },
            select: {
                isCorrect: true,
            },
        });

        // Calculate metrics for overall stats
        const totalResponses = quizResponses.length;
        console.log("totalResponses", totalResponses);
        const correctResponses = quizResponses.filter(
            (response) => response.isCorrect
        ).length;
        console.log("correctResponses", correctResponses);
        console.log("totalQuizzes", totalQuizzes);

        // Calculate accuracy based solely on responses (not quizzes)
        // Only use responses as the denominator (percentage of correct answers out of all answers)
        const accuracy = totalResponses > 0
            ? (correctResponses / totalResponses) * 100
            : 0;
        console.log("accuracy", accuracy);

        // Get the total Rolu earned by all users from game sessions for this brand
        const allGameSessions = await prisma.gameSession.findMany({
            where: {
                brandId,
            },
            select: {
                roluEarned: true,
            },
        });

        // Calculate total Rolu earned by all users
        const totalRoluEarned = allGameSessions.reduce(
            (total, session) => total + (session.roluEarned || 0),
            0
        );

        // If we have a logged in user, get their personal Rolu earnings
        let userRoluEarned = 0;
        if (userId) {
            const userGameSessions = await prisma.gameSession.findMany({
                where: {
                    brandId,
                    userId,
                },
                select: {
                    roluEarned: true,
                },
            });

            // Calculate Rolu earned by this specific user
            userRoluEarned = userGameSessions.reduce(
                (total, session) => total + (session.roluEarned || 0),
                0
            );
        }

        const metrics: QuizMetricsResponse = {
            brandId,
            totalQuizzes,
            totalResponses,
            correctResponses,
            accuracy,
            totalRoluEarned,
            userRoluEarned,
        };

        return NextResponse.json(metrics);
    } catch (error) {
        console.error("Error fetching quiz metrics:", error);
        return NextResponse.json(
            { error: "Failed to fetch quiz metrics" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic"; 