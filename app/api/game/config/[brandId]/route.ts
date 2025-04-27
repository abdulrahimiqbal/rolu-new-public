import { NextResponse } from "next/server";
import { getGameConfig } from "@/lib/game-config";
import { prefetchBrandQuizTranslations } from "@/lib/translation-service";

interface RouteParams {
    params: {
        brandId: string;
    };
}

// GET /api/game/config/[brandId] - Get game configuration for a specific brand
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { brandId } = params;
        const url = new URL(request.url);
        const language = url.searchParams.get('lang') || 'en';

        if (!brandId) {
            return NextResponse.json(
                { error: "Brand ID is required" },
                { status: 400 }
            );
        }

        // Get the game configuration including quizzes with translations
        const config = await getGameConfig(brandId, language);

        // Prefetch translations for this brand in the requested language
        // This ensures translations are ready when quizzes are needed during gameplay
        if (language !== 'en') {
            console.log(`Prefetching translations for brand ${brandId} in ${language}`);
            try {
                await prefetchBrandQuizTranslations(brandId, language);
            } catch (translationError) {
                console.error(`Error prefetching translations: ${translationError}`);
                // Continue even if prefetching fails - translations will be generated on-demand
            }
        }

        return NextResponse.json({
            config,
            translationsPreloaded: language !== 'en'
        });
    } catch (error) {
        console.error(`Error fetching game config for brand ${params.brandId}:`, error);

        // Provide more specific error message based on the error
        const errorMessage = error instanceof Error
            ? error.message
            : "Failed to fetch game configuration";

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 