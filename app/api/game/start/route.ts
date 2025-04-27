import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRandomQuizWithTranslation } from "@/lib/quiz-service";

interface GameAsset {
    id: string;
    brandId: string;
    type: string;
    assetUrl: string;
    width: number | null;
    height: number | null;
    points: number | null;
}

interface AssetWithDimensions {
    id: string;
    assetUrl: string;
    width: number;
    height: number;
    points?: number;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get("brand");
        const userLanguage = searchParams.get("lang") || "en"; // Get user language, default to English

        // Fetch game settings based on brandId
        let gameSettings;
        if (brandId) {
            // Try to find brand-specific default settings
            gameSettings = await prisma.gameSettings.findFirst({
                where: {
                    brandId: brandId,
                    isDefault: true,
                },
            });
        }

        // If no brand-specific settings found, use global default settings
        if (!gameSettings) {
            gameSettings = await prisma.gameSettings.findFirst({
                where: {
                    isGlobal: true,
                    isDefault: true,
                },
            });
        }

        // Fetch brand from database
        const brand = brandId ? await prisma.brand.findFirst({
            where: {
                id: brandId,
            },
            include: {
                gameAssets: true,
            },
        }) : null;

        // If brand doesn't exist and no game settings, create a default configuration
        if (!brand && !gameSettings) {
            // In a production app, we would return an error
            // For now, we'll return a default configuration
            const gameConfig = {
                brandId: brandId || "default",
                difficulty: "normal",
                quizFrequency: 500, // Show quiz every 500 distance units
                obstacles: {
                    frequency: 0.015,
                    speed: 3,
                },
                collectibles: {
                    frequency: 0.02,
                    value: 10,
                },
                player: {
                    speed: 3,
                    jumpForce: 10,
                },
                session: {
                    id: `session_${Date.now()}`,
                    startTime: new Date().toISOString(),
                },
                // Add new game mechanics configuration
                mechanics: {
                    speedIncrease: {
                        threshold: 200, // Score threshold for speed increase
                        percentage: 10, // Percentage to increase speed by
                        maxMultiplier: 3, // Maximum speed multiplier
                    },
                    quizzes: {
                        frequency: 0.005, // Frequency of quiz items
                    },
                    minFramesBetweenObstacles: 30, // Minimum frames between obstacles
                }
            };

            return NextResponse.json({
                success: true,
                data: gameConfig
            });
        }

        // Map game assets to their respective types if brand exists
        const playerAssets = brand?.gameAssets.filter((asset: GameAsset) => asset.type === 'player') || [];
        const obstacleAssets = brand?.gameAssets.filter((asset: GameAsset) => asset.type === 'obstacle') || [];
        const collectibleAssets = brand?.gameAssets.filter((asset: GameAsset) => asset.type === 'collectible') || [];
        const backgroundAssets = brand?.gameAssets.filter((asset: GameAsset) => asset.type === 'background') || [];
        const powerupAssets = brand?.gameAssets.filter((asset: GameAsset) => asset.type === 'powerup') || [];

        // Add sample quiz with translation if available
        const sampleQuiz = await getRandomQuizWithTranslation(brand?.id || "default", userLanguage);

        // Create game configuration from brand, assets, and game settings
        const gameConfig = {
            brandId: brand?.id || "default",
            brandName: brand?.name || "Default",
            difficulty: "normal",
            quizFrequency: gameSettings?.quizFrequency ? Math.round(1000 * gameSettings.quizFrequency) : 500,
            language: userLanguage, // Add language to game config
            obstacles: {
                frequency: gameSettings?.obstacleFrequency ? gameSettings.obstacleFrequency / 100 : 0.015,
                speed: gameSettings?.initialSpeed || 3,
                assets: obstacleAssets.map((asset: GameAsset): AssetWithDimensions => ({
                    id: asset.id,
                    assetUrl: asset.assetUrl,
                    width: asset.width || 40,
                    height: asset.height || 40,
                })),
            },
            collectibles: {
                frequency: gameSettings?.collectibleFrequency ? gameSettings.collectibleFrequency / 100 : 0.02,
                value: gameSettings?.pointsPerCollectible || 10,
                assets: collectibleAssets.map((asset: GameAsset): AssetWithDimensions => ({
                    id: asset.id,
                    assetUrl: asset.assetUrl,
                    width: asset.width || 30,
                    height: asset.height || 30,
                    points: asset.points || gameSettings?.pointsPerCollectible || 10,
                })),
            },
            powerups: {
                frequency: gameSettings?.powerupFrequency ? gameSettings.powerupFrequency / 100 : 0.005,
                assets: powerupAssets.map((asset: GameAsset): AssetWithDimensions => ({
                    id: asset.id,
                    assetUrl: asset.assetUrl,
                    width: asset.width || 30,
                    height: asset.height || 30,
                })),
            },
            quizzes: {
                frequency: gameSettings?.quizFrequency ? gameSettings.quizFrequency / 100 : 0.005,
                timeLimit: gameSettings?.quizTimeLimit || 15,
                pauseGame: gameSettings?.quizPauseGame || true,
                requiredForCompletion: gameSettings?.quizRequiredForCompletion || false,
                roluPerCorrectAnswer: gameSettings?.roluPerCorrectAnswer || 5,
            },
            player: {
                speed: gameSettings?.initialSpeed || 3,
                jumpForce: 10,
                asset: playerAssets.length > 0 ? {
                    id: playerAssets[0].id,
                    assetUrl: playerAssets[0].assetUrl,
                    width: playerAssets[0].width || 30,
                    height: playerAssets[0].height || 50,
                } : null,
            },
            background: backgroundAssets.length > 0 ? {
                id: backgroundAssets[0].id,
                assetUrl: backgroundAssets[0].assetUrl,
            } : null,
            session: {
                id: `session_${Date.now()}`,
                startTime: new Date().toISOString(),
            },
            // Add game mechanics configuration from game settings
            mechanics: {
                speedIncrease: {
                    threshold: gameSettings?.speedIncreaseThreshold || 200,
                    percentage: gameSettings?.speedIncreasePercentage || 10,
                    maxSpeed: gameSettings?.maxSpeed || 15,
                },
                minFramesBetweenObstacles: gameSettings?.minFramesBetweenObstacles || 30,
                pointsPerMeter: gameSettings?.pointsPerMeter || 0.1,
                xpPerPoint: gameSettings?.xpPerPoint || 0.5,
            },
            sampleQuiz, // Add sample quiz to response
        };

        return NextResponse.json({
            success: true,
            data: gameConfig
        });
    } catch (error) {
        console.error("Error starting game:", error);
        return NextResponse.json(
            { success: false, error: "Failed to start game" },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic'; 