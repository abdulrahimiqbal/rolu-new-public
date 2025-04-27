#!/usr/bin/env ts-node

/**
 * This script retranslates quiz options for existing quiz translations.
 * It's useful when quiz questions have been translated but options have not.
 * 
 * Usage:
 * npx ts-node scripts/translate-quiz-options.ts [brandId] [languageCode]
 * 
 * Example:
 * npx ts-node scripts/translate-quiz-options.ts rolu-brand es
 */

import { prisma } from '../lib/prisma';
import { v2 as cloudTranslate } from '@google-cloud/translate';

// Initialize the Google Translate API client
let translate: cloudTranslate.Translate;
try {
    translate = new cloudTranslate.Translate({
        key: process.env.GOOGLE_TRANSLATE_API_KEY,
    });
} catch (error) {
    console.error('Error initializing Google Translate:', error);
    process.exit(1);
}

// Define types for our database models
type DBQuiz = {
    id: string;
    question: string;
    brandId: string;
};

type DBQuizOption = {
    id: string;
    quizId: string;
    text: string;
    explanation: string;
    isCorrect: boolean;
};

type DBQuizTranslation = {
    id: string;
    quizId: string;
    languageCode: string;
    question: string;
};

type DBQuizOptionTranslation = {
    id: string;
    optionId: string;
    translationId: string;
    languageCode: string;
    text: string;
    explanation: string;
};

/**
 * Translates text using Google Translate
 */
async function translateText(text: string, targetLanguage: string): Promise<string> {
    if (!text) return '';

    try {
        const [translation] = await translate.translate(text, targetLanguage);
        return translation;
    } catch (error) {
        console.error('Error translating text:', error);
        return `[ERROR] ${text}`;
    }
}

/**
 * Mock translate function for fallback when Google Translate is not available
 */
function mockTranslate(text: string, targetLang: string): string {
    if (!text) return '';
    if (targetLang === 'es') return `[ES] ${text}`;
    if (targetLang === 'ar') return `[AR] ${text}`;
    return text;
}

async function main() {
    const args = process.argv.slice(2);
    const brandId = args[0];
    const languageCode = args[1];

    if (!brandId || !languageCode) {
        console.error('Usage: npx ts-node scripts/translate-quiz-options.ts [brandId] [languageCode]');
        process.exit(1);
    }

    console.log(`Processing quiz options for brand: ${brandId}, language: ${languageCode}`);

    try {
        // Get all quizzes for this brand
        const quizzes = await prisma.$queryRaw<DBQuiz[]>`
            SELECT id, question, "brandId" FROM "Quiz"
            WHERE "brandId" = ${brandId}
        `;

        console.log(`Found ${quizzes.length} quizzes for brand ${brandId}`);

        let totalOptions = 0;
        let translatedOptions = 0;

        // Process each quiz
        for (const quiz of quizzes) {
            // Find quiz translation
            const quizTranslations = await prisma.$queryRaw<DBQuizTranslation[]>`
                SELECT id, "quizId", "languageCode", question FROM "QuizTranslation"
                WHERE "quizId" = ${quiz.id} AND "languageCode" = ${languageCode}
                LIMIT 1
            `;

            // Only process quizzes that have a translation
            if (quizTranslations.length > 0) {
                const quizTranslation = quizTranslations[0];
                console.log(`\nProcessing quiz: ${quiz.id}`);
                console.log(`Translation exists: ${quizTranslation.question}`);

                // Get all options for this quiz
                const options = await prisma.$queryRaw<DBQuizOption[]>`
                    SELECT id, "quizId", text, explanation, "isCorrect" FROM "QuizOption"
                    WHERE "quizId" = ${quiz.id}
                `;

                // Check each option
                for (const option of options) {
                    totalOptions++;

                    // Check if option translation exists
                    const optionTranslations = await prisma.$queryRaw<DBQuizOptionTranslation[]>`
                        SELECT id, "optionId", "languageCode", text, explanation FROM "QuizOptionTranslation"
                        WHERE "optionId" = ${option.id} AND "languageCode" = ${languageCode}
                        LIMIT 1
                    `;

                    if (optionTranslations.length > 0) {
                        console.log(`Option translation exists: ${optionTranslations[0].text}`);
                        translatedOptions++;
                    } else {
                        console.log(`Translating option: ${option.text}`);

                        // Translate the option text and explanation
                        const translatedText = await translateText(option.text, languageCode);
                        const translatedExplanation = await translateText(option.explanation || '', languageCode);

                        // Create the option translation
                        await prisma.$executeRaw`
                            INSERT INTO "QuizOptionTranslation" (
                                id, "optionId", "translationId", "languageCode", "text", 
                                "explanation", "createdAt", "updatedAt"
                            )
                            VALUES (
                                gen_random_uuid(), ${option.id}, ${quizTranslation.id}, ${languageCode},
                                ${translatedText}, ${translatedExplanation}, NOW(), NOW()
                            )
                        `;

                        console.log(`Created translation: ${translatedText}`);
                        translatedOptions++;
                    }
                }
            } else {
                console.log(`\nSkipping quiz ${quiz.id} - no translation exists`);
            }
        }

        console.log(`\nComplete! ${translatedOptions}/${totalOptions} options translated`);
    } catch (error) {
        console.error('Error processing translations:', error);
        process.exit(1);
    }
}

main().then(() => {
    console.log('Done');
    process.exit(0);
}).catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
}); 