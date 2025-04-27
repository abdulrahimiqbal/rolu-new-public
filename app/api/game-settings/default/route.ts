import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/game-settings/default - Get default game settings
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get("brandId");

        let whereClause: any = {
            isDefault: true,
        };

        if (brandId) {
            // If brandId is provided, look for brand-specific default settings
            whereClause.brandId = brandId;
        } else {
            // Otherwise, look for global default settings
            whereClause.isGlobal = true;
        }

        const defaultSettings = await prisma.gameSettings.findFirst({
            where: whereClause,
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!defaultSettings) {
            // If no default settings found, return a 404
            return NextResponse.json(
                { error: "No default settings found" },
                { status: 404 }
            );
        }

        return NextResponse.json(defaultSettings);
    } catch (error) {
        console.error("Error fetching default game settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch default game settings" },
            { status: 500 }
        );
    }
}

// POST /api/game-settings/default - Create a default game settings configuration
export async function POST(request: NextRequest) {
    try {
        // Check if a default configuration already exists
        const existingDefault = await prisma.gameSettings.findFirst({
            where: {
                isDefault: true,
                isGlobal: true,
            },
        });

        if (existingDefault) {
            return NextResponse.json(existingDefault);
        }

        // Create a default configuration
        const defaultSettings = await prisma.gameSettings.create({
            data: {
                name: "Default Configuration",
                isDefault: true,
                isGlobal: true,

                // Game mechanics
                initialSpeed: 5,
                speedIncreaseThreshold: 200,
                speedIncreasePercentage: 10,
                maxSpeed: 15,
                minFramesBetweenObstacles: 60,

                // Item frequencies
                obstacleFrequency: 2.5,
                collectibleFrequency: 1.5,
                powerupFrequency: 0.5,
                quizFrequency: 0.2,

                // Scoring
                pointsPerCollectible: 10,
                pointsPerMeter: 0.1,
                xpPerPoint: 0.5,
                roluPerCorrectAnswer: 5,

                // Quiz settings
                quizTimeLimit: 15,
                quizPauseGame: true,
                quizRequiredForCompletion: false,
            },
        });

        return NextResponse.json(defaultSettings, { status: 201 });
    } catch (error) {
        console.error("Error creating default game settings:", error);
        return NextResponse.json(
            { error: "Failed to create default game settings" },
            { status: 500 }
        );
    }
} 