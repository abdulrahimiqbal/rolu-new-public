import { NextRequest, NextResponse } from "next/server";
import { getRandomQuizWithTranslation, getQuizzesByBrandWithTranslation } from "@/lib/translation-service";

export async function GET(request: NextRequest) {
    try {
        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const brandId = searchParams.get("brandId");
        const language = searchParams.get("language") || "en";
        const mode = searchParams.get("mode") || "random"; // random or all

        if (!brandId) {
            return NextResponse.json(
                { error: "Brand ID is required" },
                { status: 400 }
            );
        }

        let data;
        if (mode === "random") {
            // Get a random quiz with translation
            data = await getRandomQuizWithTranslation(brandId, language);
        } else {
            // Get all quizzes for the brand
            data = await getQuizzesByBrandWithTranslation(brandId, language);
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching quiz:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch quiz" },
            { status: 500 }
        );
    }
}

export const dynamic = "force-dynamic"; 