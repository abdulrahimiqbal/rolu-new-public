'use server';

import { QuizQuestion } from "@/components/quiz/quiz-modal";
import { getRandomQuizWithTranslation as getRandomQuizWithTranslationServer, getQuizzesByBrandWithTranslation as getQuizzesByBrandWithTranslationServer, getRandomQuiz as getRandomQuizServer, getQuizzesByBrand as getQuizzesByBrandServer } from "./quiz-service";

/**
 * Server action to get a random quiz with translation
 */
export async function getRandomQuizAction(brandId: string, language: string = 'en'): Promise<QuizQuestion | null> {
    try {
        return await getRandomQuizWithTranslationServer(brandId, language);
    } catch (error) {
        console.error("Error in getRandomQuizAction:", error);
        // Fallback to non-translated quiz
        return getRandomQuizServer(brandId);
    }
}

/**
 * Server action to get all quizzes for a brand with translations
 */
export async function getQuizzesByBrandAction(brandId: string, language: string = 'en'): Promise<QuizQuestion[]> {
    try {
        return await getQuizzesByBrandWithTranslationServer(brandId, language);
    } catch (error) {
        console.error("Error in getQuizzesByBrandAction:", error);
        // Fallback to non-translated quizzes
        return getQuizzesByBrandServer(brandId);
    }
} 