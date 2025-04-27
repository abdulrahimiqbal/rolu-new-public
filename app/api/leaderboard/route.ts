import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get("brand") || "worldchain";
        const limit = parseInt(searchParams.get("limit") || "10", 10);

        // Get top scores from game sessions
        const topScores = await prisma.gameSession.findMany({
            where: {
                brandId,
            },
            orderBy: {
                score: "desc",
            },
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        profileImage: true,
                        level: true,
                    },
                },
            },
        });

        // Get top XP users
        const topUsers = await prisma.user.findMany({
            orderBy: {
                xp: "desc",
            },
            take: limit,
            select: {
                id: true,
                username: true,
                profileImage: true,
                xp: true,
                level: true,
                roluBalance: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                topScores,
                topUsers,
            },
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch leaderboard" },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic'; 