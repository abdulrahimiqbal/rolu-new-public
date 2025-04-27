import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/settings - Get all settings or filter by brandId
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get("brandId");

        let whereClause = {};
        if (brandId) {
            whereClause = {
                OR: [
                    { brandId },
                    { isGlobal: true }
                ]
            };
        }

        const settings = await prisma.gameSettings.findMany({
            where: whereClause,
            orderBy: [
                { isDefault: "desc" },
                { updatedAt: "desc" }
            ],
        });

        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

// POST /api/admin/settings - Create new game settings
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            name, brandId, isGlobal, initialSpeed, speedIncreaseThreshold,
            speedIncreasePercentage, maxSpeed, minFramesBetweenObstacles,
            obstacleFrequency, collectibleFrequency, powerupFrequency, quizFrequency,
            pointsPerCollectible, pointsPerMeter, xpPerPoint, roluPerCorrectAnswer,
            quizTimeLimit, quizPauseGame, quizRequiredForCompletion
        } = body;

        // Validate required fields
        if (!name) {
            return NextResponse.json(
                { error: "Settings name is required" },
                { status: 400 }
            );
        }

        // Check if this is the first settings being created
        const settingsCount = await prisma.gameSettings.count();
        const isDefault = settingsCount === 0;

        // Create the settings
        const settings = await prisma.gameSettings.create({
            data: {
                name,
                brandId: isGlobal ? null : brandId,
                isGlobal: !!isGlobal,
                isDefault,
                initialSpeed: Number(initialSpeed) || 4.5,
                speedIncreaseThreshold: Number(speedIncreaseThreshold) || 250,
                speedIncreasePercentage: Number(speedIncreasePercentage) || 10,
                maxSpeed: Number(maxSpeed) || 15,
                minFramesBetweenObstacles: Number(minFramesBetweenObstacles) || 60,
                obstacleFrequency: Number(obstacleFrequency) || 2.5,
                collectibleFrequency: Number(collectibleFrequency) || 1.5,
                powerupFrequency: Number(powerupFrequency) || 0.5,
                quizFrequency: Number(quizFrequency) || 0.2,
                pointsPerCollectible: Number(pointsPerCollectible) || 10,
                pointsPerMeter: Number(pointsPerMeter) || 0.1,
                xpPerPoint: Number(xpPerPoint) || 0.5,
                roluPerCorrectAnswer: Number(roluPerCorrectAnswer) || 5,
                quizTimeLimit: Number(quizTimeLimit) || 15,
                quizPauseGame: quizPauseGame !== undefined ? quizPauseGame : true,
                quizRequiredForCompletion: quizRequiredForCompletion !== undefined ? quizRequiredForCompletion : false,
            },
        });

        return NextResponse.json({ settings }, { status: 201 });
    } catch (error) {
        console.error("Error creating settings:", error);
        return NextResponse.json(
            { error: "Failed to create settings" },
            { status: 500 }
        );
    }
} 