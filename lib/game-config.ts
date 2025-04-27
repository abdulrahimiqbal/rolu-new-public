import { prisma } from "@/lib/prisma";
import { getQuizzesByBrandWithTranslation } from "./translation-service";
import { QuizQuestion } from "@/components/quiz/quiz-modal";

export interface GameAsset {
    id: string;
    brandId: string;
    type: string;
    assetUrl: string;
    width: number | null;
    height: number | null;
    points: number | null;
}

export interface Brand {
    id: string;
    name: string;
    description: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    is_active: boolean | null;
}

export interface GameSettings {
    id: string;
    name: string;
    brandId: string | null;
    isDefault: boolean;
    isGlobal: boolean;
    initialSpeed: number;
    speedIncreaseThreshold: number;
    speedIncreasePercentage: number;
    maxSpeed: number;
    minFramesBetweenObstacles: number;
    obstacleFrequency: number;
    collectibleFrequency: number;
    powerupFrequency: number;
    quizFrequency: number;
    pointsPerCollectible: number;
    pointsPerMeter: number;
    xpPerPoint: number;
    roluPerCorrectAnswer: number;
    quizTimeLimit: number;
    quizPauseGame: boolean;
    quizRequiredForCompletion: boolean;
}

export interface GameConfig {
    brand: Brand;
    settings: GameSettings;
    assets: {
        player: GameAsset | null;
        obstacle: GameAsset | null;
        collectible: GameAsset | null;
        powerup: GameAsset | null;
        background: GameAsset | null;
    };
    quizzes?: QuizQuestion[];
    session?: {
        id: string;
    };
}

/**
 * Get the game configuration for a specific brand
 * @param brandId The ID of the brand to get configuration for
 * @param language The language for quiz translations
 * @returns The complete game configuration including brand, settings, assets, and quizzes
 */
export async function getGameConfig(brandId: string, language: string = 'en'): Promise<GameConfig> {
    try {
        // Get the brand
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
        });

        if (!brand) {
            throw new Error(`Brand with ID ${brandId} not found`);
        }

        // Get the active game settings
        // First try to find brand-specific settings that are default
        let settings = await prisma.gameSettings.findFirst({
            where: {
                brandId,
                isDefault: true,
            },
        });

        // If no brand-specific default settings, try to find global default settings
        if (!settings) {
            settings = await prisma.gameSettings.findFirst({
                where: {
                    isGlobal: true,
                    isDefault: true,
                },
            });
        }

        // If still no settings, try to find any brand-specific settings
        if (!settings) {
            settings = await prisma.gameSettings.findFirst({
                where: {
                    brandId,
                },
            });
        }

        // If still no settings, try to find any global settings
        if (!settings) {
            settings = await prisma.gameSettings.findFirst({
                where: {
                    isGlobal: true,
                },
            });
        }

        // If still no settings, throw an error
        if (!settings) {
            throw new Error("No game settings found");
        }

        // Get the brand assets
        const assets = await prisma.gameAsset.findMany({
            where: {
                brandId,
            },
        });

        // Organize assets by type
        const assetsByType: GameConfig['assets'] = {
            player: assets.find(asset => asset.type === 'player') || null,
            obstacle: assets.find(asset => asset.type === 'obstacle') || null,
            collectible: assets.find(asset => asset.type === 'collectible') || null,
            powerup: assets.find(asset => asset.type === 'powerup') || null,
            background: assets.find(asset => asset.type === 'background') || null,
        };

        // Create a unique session ID for this game
        const sessionId = `session_${Date.now()}`;

        // Get quizzes for this brand with translations
        let quizzes: QuizQuestion[] = [];

        try {
            // Use the brand's translated quizzes
            const translatedQuizzes = await getQuizzesByBrandWithTranslation(brandId, language);

            // Map to the QuizQuestion format
            quizzes = translatedQuizzes.map(quiz => ({
                id: quiz.id,
                question: quiz.question,
                imageUrl: quiz.imageUrl || undefined,
                options: quiz.options.map(option => ({
                    id: option.id,
                    text: option.translatedText || option.text,
                    isCorrect: option.isCorrect,
                    explanation: option.translatedExplanation || option.explanation,
                    translatedText: (option as any).translatedText,
                    translatedExplanation: (option as any).translatedExplanation,
                })),
                explanation: (quiz as any).explanation,
                questionType: quiz.questionType,
                imageUploadPrompt: quiz.imageUploadPrompt,
            }));

            console.log(`Loaded ${quizzes.length} translated quizzes for brand ${brandId} in ${language}`);

            // Debug log to verify option translations
            if (quizzes.length > 0) {
                console.log(`Sample quiz question: ${quizzes[0].question}`);
                console.log(`Sample options:`);
                quizzes[0].options.forEach((option, index) => {
                    console.log(`Option ${index + 1}: ${option.text}`);
                });
            }
        } catch (error) {
            console.error(`Error loading quizzes for brand ${brandId}:`, error);
            // Continue without quizzes if there's an error
        }

        return {
            brand: {
                id: brand.id,
                name: brand.name,
                description: brand.description || "",
                logoUrl: brand.logoUrl,
                primaryColor: brand.primaryColor || "#3498db",
                secondaryColor: brand.secondaryColor || "#2980b9",
                is_active: brand.is_active === true
            },
            settings: settings as unknown as GameSettings,
            assets: assetsByType,
            quizzes,
            session: {
                id: sessionId
            }
        };
    } catch (error) {
        console.error("Error getting game configuration:", error);
        throw error;
    }
}

/**
 * Get all available brands
 * @returns List of brands with their status and asset information
 */
export async function getAvailableBrands() {
    try {
        const brands = await prisma.brand.findMany({
            orderBy: [
                // Order active brands first, then by name
                { is_active: 'desc' },
                { name: 'asc' },
            ],
        });

        // Check if each brand has all required assets
        const brandsWithStatus = await Promise.all(
            brands.map(async (brand) => {
                const assets = await prisma.gameAsset.findMany({
                    where: {
                        brandId: brand.id,
                    },
                });

                // Check if brand has all required asset types
                const hasPlayer = assets.some(asset => asset.type === 'player');
                const hasObstacle = assets.some(asset => asset.type === 'obstacle');
                const hasCollectible = assets.some(asset => asset.type === 'collectible');

                // A brand is considered ready if it has at least player, obstacle, and collectible assets
                const isReady = hasPlayer && hasObstacle && hasCollectible;

                return {
                    ...brand,
                    isReady,
                    is_active: brand.is_active === true,
                    assetCount: assets.length,
                };
            })
        );

        return brandsWithStatus;
    } catch (error) {
        console.error("Error getting available brands:", error);
        throw error;
    }
} 