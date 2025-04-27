import { NextRequest, NextResponse } from "next/server";
import { prefetchBrandQuizTranslations } from "@/lib/translation-service";
import { prisma } from "@/lib/prisma";

// This API endpoint is for admins to manually trigger translation of all quizzes
// for a specific brand in a specific language
export async function POST(request: NextRequest) {
    try {
        // Check for basic auth - in a real app, use more robust authentication
        // This is just a simple protection for this admin endpoint
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Basic ")) {
            return NextResponse.json(
                { error: "Unauthorized access" },
                { status: 401 }
            );
        }

        // Parse the request body
        const body = await request.json();
        const { brandId, languageCode } = body;

        if (!brandId) {
            return NextResponse.json(
                { error: "Brand ID is required" },
                { status: 400 }
            );
        }

        if (!languageCode) {
            return NextResponse.json(
                { error: "Language code is required" },
                { status: 400 }
            );
        }

        // Check if brand exists
        const brand = await prisma.brand.findUnique({
            where: { id: brandId }
        });

        if (!brand) {
            return NextResponse.json(
                { error: `Brand with ID ${brandId} not found` },
                { status: 404 }
            );
        }

        // Force re-translation by first clearing existing translations
        console.log(`Clearing existing translations for brand ${brandId} in ${languageCode}`);

        // Get all quizzes for this brand
        const quizzes = await prisma.quiz.findMany({
            where: { brandId },
            select: { id: true }
        });

        console.log(`Found ${quizzes.length} quizzes for brand ${brandId}`);

        // Delete existing translations for these quizzes
        for (const quiz of quizzes) {
            // Find the quiz translation
            const quizTranslation = await prisma.$queryRaw<{ id: string }[]>`
                SELECT id FROM "QuizTranslation"
                WHERE "quizId" = ${quiz.id} AND "languageCode" = ${languageCode}
                LIMIT 1
            `;

            if (quizTranslation && quizTranslation.length > 0) {
                const translationId = quizTranslation[0].id;

                // Delete option translations
                await prisma.$executeRaw`
                    DELETE FROM "QuizOptionTranslation"
                    WHERE "translationId" = ${translationId}
                `;

                // Delete quiz translation
                await prisma.$executeRaw`
                    DELETE FROM "QuizTranslation"
                    WHERE id = ${translationId}
                `;

                console.log(`Deleted translations for quiz ${quiz.id}`);
            }
        }

        // Now trigger the prefetch to generate fresh translations
        console.log(`Generating fresh translations for brand ${brandId} in ${languageCode}`);
        const result = await prefetchBrandQuizTranslations(brandId, languageCode);

        if (result) {
            return NextResponse.json({
                success: true,
                message: `Successfully translated quizzes for brand ${brandId} in ${languageCode}`,
                quizCount: quizzes.length
            });
        } else {
            return NextResponse.json(
                { error: "Failed to translate quizzes" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Error in translate-quizzes API:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
} 