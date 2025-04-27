import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/game-settings/:id - Get a specific game settings configuration
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        const gameSettings = await prisma.gameSettings.findUnique({
            where: {
                id,
            },
            include: {
                brand: true,
            },
        });

        if (!gameSettings) {
            return NextResponse.json(
                { error: "Game settings not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(gameSettings);
    } catch (error) {
        console.error("Error fetching game settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch game settings" },
            { status: 500 }
        );
    }
}

// PUT /api/game-settings/:id - Update a game settings configuration
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();

        // Check if this is a default configuration
        if (body.isDefault) {
            // If setting a new default, unset any existing defaults for the same brand or global scope
            if (body.brandId) {
                await prisma.gameSettings.updateMany({
                    where: {
                        brandId: body.brandId,
                        isDefault: true,
                        id: { not: id }, // Don't update the current settings
                    },
                    data: {
                        isDefault: false,
                    },
                });
            } else if (body.isGlobal) {
                await prisma.gameSettings.updateMany({
                    where: {
                        isGlobal: true,
                        isDefault: true,
                        id: { not: id }, // Don't update the current settings
                    },
                    data: {
                        isDefault: false,
                    },
                });
            }
        }

        // Extract only the fields that can be updated
        const {
            name,
            isDefault,
            isGlobal,
            brandId,
            initialSpeed,
            speedIncreaseThreshold,
            speedIncreasePercentage,
            maxSpeed,
            minFramesBetweenObstacles,
            obstacleFrequency,
            collectibleFrequency,
            powerupFrequency,
            quizFrequency,
            pointsPerCollectible,
            pointsPerMeter,
            xpPerPoint,
            roluPerCorrectAnswer,
            quizTimeLimit,
            quizPauseGame,
            quizRequiredForCompletion,
        } = body;

        // Update the game settings with only the allowed fields
        const gameSettings = await prisma.gameSettings.update({
            where: {
                id,
            },
            data: {
                name,
                isDefault,
                isGlobal,
                brandId,
                initialSpeed,
                speedIncreaseThreshold,
                speedIncreasePercentage,
                maxSpeed,
                minFramesBetweenObstacles,
                obstacleFrequency,
                collectibleFrequency,
                powerupFrequency,
                quizFrequency,
                pointsPerCollectible,
                pointsPerMeter,
                xpPerPoint,
                roluPerCorrectAnswer,
                quizTimeLimit,
                quizPauseGame,
                quizRequiredForCompletion,
            },
        });

        return NextResponse.json(gameSettings);
    } catch (error) {
        console.error("Error updating game settings:", error);
        return NextResponse.json(
            { error: "Failed to update game settings" },
            { status: 500 }
        );
    }
}

// DELETE /api/game-settings/:id - Delete a game settings configuration
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        // Check if this is a default configuration
        const gameSettings = await prisma.gameSettings.findUnique({
            where: { id },
        });

        if (!gameSettings) {
            return NextResponse.json(
                { error: "Game settings not found" },
                { status: 404 }
            );
        }

        // Don't allow deleting the default configuration
        if (gameSettings.isDefault) {
            return NextResponse.json(
                { error: "Cannot delete the default configuration" },
                { status: 400 }
            );
        }

        // Delete the game settings
        await prisma.gameSettings.delete({
            where: {
                id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting game settings:", error);
        return NextResponse.json(
            { error: "Failed to delete game settings" },
            { status: 500 }
        );
    }
} 