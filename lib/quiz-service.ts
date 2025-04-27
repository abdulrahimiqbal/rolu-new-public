'use server';
// ☝️ Mark this file as server-only to prevent client-side usage

import { QuizQuestion } from "@/components/quiz/quiz-modal";
import { getQuizInUserLanguage } from "./translation-service";
import prisma from "./prisma";
import { QuestionType } from '@prisma/client';

// Mock quiz data - in a real app, this would come from an API
const mockQuizzes: Record<string, QuizQuestion[]> = {
    worldchain: [
        {
            id: "geo-1",
            question: "What is the capital of France?",
            questionType: QuestionType.TEXT_MCQ,
            options: [
                {
                    id: "a",
                    text: "London",
                    isCorrect: false,
                    explanation: "London is the capital of the United Kingdom, not France.",
                },
                {
                    id: "b",
                    text: "Paris",
                    isCorrect: true,
                    explanation: "Paris is indeed the capital of France.",
                },
                {
                    id: "c",
                    text: "Berlin",
                    isCorrect: false,
                    explanation: "Berlin is the capital of Germany, not France.",
                },
                {
                    id: "d",
                    text: "Madrid",
                    isCorrect: false,
                    explanation: "Madrid is the capital of Spain, not France.",
                },
            ],
            imageUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop",
        },
        {
            id: "geo-2",
            question: "Which mountain range separates Europe from Asia?",
            questionType: QuestionType.TEXT_MCQ,
            options: [
                {
                    id: "a",
                    text: "The Alps",
                    isCorrect: false,
                    explanation: "The Alps are entirely within Europe.",
                },
                {
                    id: "b",
                    text: "The Himalayas",
                    isCorrect: false,
                    explanation: "The Himalayas separate the Indian subcontinent from Asia.",
                },
                {
                    id: "c",
                    text: "The Ural Mountains",
                    isCorrect: true,
                    explanation: "The Ural Mountains are considered the boundary between Europe and Asia.",
                },
                {
                    id: "d",
                    text: "The Andes",
                    isCorrect: false,
                    explanation: "The Andes are in South America.",
                },
            ],
        },
    ],
    numbermaster: [
        {
            id: "math-1",
            question: "What is the value of π (pi) to two decimal places?",
            questionType: QuestionType.TEXT_MCQ,
            options: [
                {
                    id: "a",
                    text: "3.14",
                    isCorrect: true,
                    explanation: "π is approximately equal to 3.14159..., which rounds to 3.14.",
                },
                {
                    id: "b",
                    text: "3.41",
                    isCorrect: false,
                    explanation: "This is not the correct value of π.",
                },
                {
                    id: "c",
                    text: "3.12",
                    isCorrect: false,
                    explanation: "This is not the correct value of π.",
                },
                {
                    id: "d",
                    text: "3.16",
                    isCorrect: false,
                    explanation: "This is not the correct value of π.",
                },
            ],
        },
        {
            id: "math-2",
            question: "If x + y = 10 and x - y = 4, what is the value of x?",
            questionType: QuestionType.TEXT_MCQ,
            options: [
                {
                    id: "a",
                    text: "3",
                    isCorrect: false,
                    explanation: "If x = 3, then y = 7, and x - y = -4, not 4.",
                },
                {
                    id: "b",
                    text: "5",
                    isCorrect: false,
                    explanation: "If x = 5, then y = 5, and x - y = 0, not 4.",
                },
                {
                    id: "c",
                    text: "7",
                    isCorrect: true,
                    explanation: "If x = 7, then y = 3, and x - y = 4, which satisfies both equations.",
                },
                {
                    id: "d",
                    text: "6",
                    isCorrect: false,
                    explanation: "If x = 6, then y = 4, and x - y = 2, not 4.",
                },
            ],
        },
    ],
    linguallearn: [
        {
            id: "lang-1",
            question: "What does 'Bonjour' mean in English?",
            questionType: QuestionType.TEXT_MCQ,
            options: [
                {
                    id: "a",
                    text: "Goodbye",
                    isCorrect: false,
                    explanation: "'Au revoir' means goodbye in French.",
                },
                {
                    id: "b",
                    text: "Hello",
                    isCorrect: true,
                    explanation: "'Bonjour' is the French word for hello or good day.",
                },
                {
                    id: "c",
                    text: "Thank you",
                    isCorrect: false,
                    explanation: "'Merci' means thank you in French.",
                },
                {
                    id: "d",
                    text: "Please",
                    isCorrect: false,
                    explanation: "'S'il vous plaît' means please in French.",
                },
            ],
            imageUrl: "https://images.unsplash.com/photo-1431274172761-fca41d930114?q=80&w=2070&auto=format&fit=crop",
        },
        {
            id: "lang-2",
            question: "Which language is spoken in Brazil?",
            questionType: QuestionType.TEXT_MCQ,
            options: [
                {
                    id: "a",
                    text: "Spanish",
                    isCorrect: false,
                    explanation: "Spanish is spoken in many Latin American countries, but not Brazil.",
                },
                {
                    id: "b",
                    text: "Portuguese",
                    isCorrect: true,
                    explanation: "Portuguese is the official language of Brazil.",
                },
                {
                    id: "c",
                    text: "English",
                    isCorrect: false,
                    explanation: "English is not the official language of Brazil.",
                },
                {
                    id: "d",
                    text: "French",
                    isCorrect: false,
                    explanation: "French is not the official language of Brazil.",
                },
            ],
        },
    ],
};

/**
 * Gets quizzes for a brand with translations based on user language
 */
export async function getQuizzesByBrandWithTranslation(
    brandId: string,
    language: string = 'en'
): Promise<QuizQuestion[]> {
    try {
        // Try to fetch quizzes from the database
        const quizzesFromDb = await prisma.quiz.findMany({
            where: { brandId },
            include: {
                options: true,
                // NOTE: No need to explicitly include scalar fields like questionType,
                // they are included by default unless using `select`.
            }
        });

        // If we have quizzes in DB, translate them
        if (quizzesFromDb.length > 0) {
            const translatedQuizzes: QuizQuestion[] = [];

            // Process each quiz for translation
            for (const quiz of quizzesFromDb) {
                // Assume getQuizInUserLanguage handles fetching/returning the necessary base fields
                // or we use the quiz object directly if translation service focuses only on text
                const translatedQuizData = await getQuizInUserLanguage(quiz.id, language);

                // Use data from DB query directly for base fields, merge with translations
                const baseQuizData = quiz; // Original data from findMany query

                translatedQuizzes.push({
                    id: baseQuizData.id,
                    question: translatedQuizData?.question || baseQuizData.question, // Prefer translated
                    imageUrl: baseQuizData.imageUrl || undefined,
                    options: baseQuizData.options.map((option, index) => ({
                        id: option.id,
                        // Prefer translated text/explanation if available
                        text: translatedQuizData?.options?.[index]?.translatedText || option.text,
                        isCorrect: option.isCorrect,
                        explanation: translatedQuizData?.options?.[index]?.translatedExplanation || option.explanation,
                        // Pass original non-translated fields too, if needed by QuizQuestion type
                        translatedText: translatedQuizData?.options?.[index]?.translatedText,
                        translatedExplanation: translatedQuizData?.options?.[index]?.translatedExplanation
                    })),
                    questionType: baseQuizData.questionType,
                    imageUploadPrompt: baseQuizData.imageUploadPrompt || undefined,
                });

            }

            return translatedQuizzes;
        }

        // Fallback to mock data if no quizzes in database
        console.warn("No quizzes found in DB for brand:", brandId, "Falling back to mocks.");
        return getQuizzesByBrand(brandId);
    } catch (error) {
        console.error("Error fetching translated quizzes:", error);
        // Fallback to mock data on error
        return getQuizzesByBrand(brandId);
    }
}

/**
 * Gets a random quiz for a brand with translation
 */
export async function getRandomQuizWithTranslation(
    brandId: string,
    language: string = 'en'
): Promise<QuizQuestion | null> {
    try {
        // Fetch *all* quizzes for the brand first (already updated to include new fields)
        const quizzes = await getQuizzesByBrandWithTranslation(brandId, language);

        if (quizzes.length === 0) {
            return null;
        }

        // Select one randomly
        const randomIndex = Math.floor(Math.random() * quizzes.length);
        return quizzes[randomIndex]; // This quiz object now includes the new fields
    } catch (error) {
        console.error("Error fetching random translated quiz:", error);
        // Fallback needs update too
        return getRandomQuiz(brandId);
    }
}

// Keep the original functions for backward compatibility but make them async
// Update the return type and mock data access for these fallbacks
export async function getQuizzesByBrand(brandId: string): Promise<QuizQuestion[]> {
    const normalizedBrandId = brandId.toLowerCase().replace(/\s+/g, "");
    const brandMap: Record<string, string> = {
        worldchain: "worldchain",
        numbermaster: "numbermaster",
        linguallearn: "linguallearn",
    };
    const mappedBrandId = brandMap[normalizedBrandId] || normalizedBrandId;

    // Access mock data which now includes questionType
    return mockQuizzes[mappedBrandId] || [];
}

export async function getRandomQuiz(brandId: string): Promise<QuizQuestion | null> {
    const quizzes = await getQuizzesByBrand(brandId); // Uses the updated function above

    if (quizzes.length === 0) {
        return null;
    }

    const randomIndex = Math.floor(Math.random() * quizzes.length);
    return quizzes[randomIndex]; // This quiz object now includes the new fields from mock data
}

// In a real app, we would have functions to fetch from API
// export async function fetchQuizzes(brandId: string): Promise<QuizQuestion[]> {
//   const response = await fetch(`/api/quizzes?brand=${brandId}`);
//   if (!response.ok) {
//     throw new Error('Failed to fetch quizzes');
//   }
//   return response.json();
// } 