'use server';
// ☝️ Mark this file as server-only to prevent client-side usage

import { Quiz, QuizOption } from '@prisma/client';
import prisma from './prisma';
import { v2 as cloudTranslate } from '@google-cloud/translate';

// Initialize the Google Translate API client - this will only run on the server
let translate: cloudTranslate.Translate | undefined;
try {
    translate = new cloudTranslate.Translate({
        key: process.env.GOOGLE_TRANSLATE_API_KEY,
    });
} catch (error) {
    console.error('Error initializing Google Translate:', error);
    // We'll handle fallback to mock translations if this fails
}

// Define types for our translation functionality
type QuizContent = {
    id: string;
    question: string;
    options: {
        id: string;
        text: string;
        explanation: string;
        isCorrect: boolean;
    }[];
};

// Type for a translated quiz - for internal use
type TranslatedQuiz = Quiz & {
    options: (QuizOption & {
        translatedText?: string;
        translatedExplanation?: string;
    })[];
};

// Define types for our database models that we need
type DBQuizTranslation = {
    id: string;
    quizId: string;
    languageCode: string;
    question: string;
};

type DBQuizOptionTranslation = {
    id: string;
    optionId: string;
    translationId?: string | null;
    languageCode: string;
    text: string;
    explanation: string;
};

/**
 * Mock translate function for fallback when Google Translate is not available
 */
function mockTranslate(text: string, targetLang: string): string {
    if (!text) return '';
    if (targetLang === 'es') return `[ES] ${text}`;
    if (targetLang === 'ar') return `[AR] ${text}`;
    return text;
}

/**
 * Translates text using Google Translate or falls back to mock translation
 */
async function translateText(text: string, targetLanguage: string): Promise<string> {
    if (!text) return '';

    try {
        if (translate && process.env.GOOGLE_TRANSLATE_API_KEY) {
            const [translation] = await translate.translate(text, targetLanguage);
            return translation || '';
        } else {
            return mockTranslate(text, targetLanguage);
        }
    } catch (error) {
        console.error('Error translating text:', error);
        return mockTranslate(text, targetLanguage);
    }
}

/**
 * Checks if a translation exists in the database for a quiz
 */
async function getStoredQuizTranslation(quizId: string, languageCode: string) {
    try {
        if (!quizId || !languageCode) {
            console.error('Missing quizId or languageCode in getStoredQuizTranslation');
            return null;
        }

        // Get quiz translation
        const quizTranslation = await prisma.$queryRaw<DBQuizTranslation[]>`
            SELECT * FROM "QuizTranslation"
            WHERE "quizId" = ${quizId} AND "languageCode" = ${languageCode}
            LIMIT 1
        `;

        if (!quizTranslation || quizTranslation.length === 0) {
            return null;
        }

        // Get option translations for this quiz
        const optionTranslations = await prisma.$queryRaw<DBQuizOptionTranslation[]>`
            SELECT qot.* FROM "QuizOptionTranslation" qot
            JOIN "QuizOption" qo ON qot."optionId" = qo.id
            WHERE qo."quizId" = ${quizId} AND qot."languageCode" = ${languageCode}
        `;

        console.log(`Retrieved ${optionTranslations.length} option translations for quiz ${quizId} in ${languageCode}`);

        // Debug log to verify the content of option translations
        if (optionTranslations.length > 0) {
            console.log(`Sample option translation: ${optionTranslations[0].text}`);
        }

        return {
            quizTranslation: quizTranslation[0],
            optionTranslations: optionTranslations || []
        };
    } catch (error) {
        console.error('Error fetching stored translation:', error);
        return null;
    }
}

/**
 * Stores a new translation for a quiz
 */
async function storeQuizTranslation(
    quizId: string,
    languageCode: string,
    translatedQuestion: string,
    optionTranslations: {
        optionId: string;
        translatedText: string;
        translatedExplanation: string;
    }[]
) {
    try {
        if (!quizId || !languageCode || !translatedQuestion) {
            console.error('Missing required parameters in storeQuizTranslation');
            return false;
        }

        console.log(`Storing translation for quiz ${quizId} in ${languageCode}`);
        console.log(`Translated question: "${translatedQuestion}"`);
        console.log(`Number of options to translate: ${optionTranslations.length}`);

        // Log first few option translations for debugging
        optionTranslations.slice(0, 2).forEach((opt, i) => {
            console.log(`Option ${i + 1}: "${opt.translatedText}"`);
        });

        // Check if translation exists
        const existingTranslation = await prisma.$queryRaw<DBQuizTranslation[]>`
            SELECT id FROM "QuizTranslation" 
            WHERE "quizId" = ${quizId} AND "languageCode" = ${languageCode}
            LIMIT 1
        `;

        let quizTranslationId;
        if (existingTranslation && existingTranslation.length > 0) {
            // Update existing translation
            await prisma.$executeRaw`
                UPDATE "QuizTranslation"
                SET "question" = ${translatedQuestion}, "updatedAt" = NOW()
                WHERE id = ${existingTranslation[0].id}
            `;
            quizTranslationId = existingTranslation[0].id;
            console.log(`Updated existing quiz translation with ID ${quizTranslationId}`);
        } else {
            // Create new translation without languageId
            await prisma.$executeRaw`
                INSERT INTO "QuizTranslation" (id, "quizId", "languageCode", "question", "createdAt", "updatedAt")
                VALUES (gen_random_uuid(), ${quizId}, ${languageCode}, ${translatedQuestion}, NOW(), NOW())
            `;

            // Get the created translation ID
            const createdTranslation = await prisma.$queryRaw<{ id: string }[]>`
                SELECT id FROM "QuizTranslation" 
                WHERE "quizId" = ${quizId} AND "languageCode" = ${languageCode}
                ORDER BY "createdAt" DESC
                LIMIT 1
            `;

            if (!createdTranslation || createdTranslation.length === 0) {
                console.error('Failed to retrieve created translation ID');
                return false;
            }

            quizTranslationId = createdTranslation[0].id;
            console.log(`Created new quiz translation with ID ${quizTranslationId}`);
        }

        // Create or update option translations
        for (const option of optionTranslations) {
            if (!option.optionId) {
                console.warn('Skipping option with missing ID');
                continue;
            }

            const existingOptionTranslation = await prisma.$queryRaw<DBQuizOptionTranslation[]>`
                SELECT id FROM "QuizOptionTranslation"
                WHERE "optionId" = ${option.optionId} AND "languageCode" = ${languageCode}
                LIMIT 1
            `;

            if (existingOptionTranslation && existingOptionTranslation.length > 0) {
                // Update existing option translation
                await prisma.$executeRaw`
                    UPDATE "QuizOptionTranslation"
                    SET "text" = ${option.translatedText}, "explanation" = ${option.translatedExplanation || ''}, "updatedAt" = NOW()
                    WHERE id = ${existingOptionTranslation[0].id}
                `;
                console.log(`Updated existing option translation for option ${option.optionId}`);
            } else {
                // Create new option translation without translationId field
                await prisma.$executeRaw`
                    INSERT INTO "QuizOptionTranslation" (
                        id, "optionId", "languageCode", 
                        "text", "explanation", "createdAt", "updatedAt"
                    )
                    VALUES (
                        gen_random_uuid(), ${option.optionId}, ${languageCode},
                        ${option.translatedText}, ${option.translatedExplanation || ''}, NOW(), NOW()
                    )
                `;
                console.log(`Created new option translation for option ${option.optionId}`);
            }
        }

        console.log(`Successfully stored translation for quiz ${quizId} in ${languageCode}`);
        return true;
    } catch (error) {
        console.error('Error storing translation:', error);
        console.error(error instanceof Error ? error.stack : 'Unknown error');
        return false;
    }
}

/**
 * Ensures all options for a quiz have translations in the given language
 * If options are missing translations, they will be created automatically
 */
async function ensureQuizOptionTranslations(
    quizId: string,
    quizTranslationId: string,
    languageCode: string
): Promise<boolean> {
    try {
        if (!quizId || !quizTranslationId || !languageCode) {
            console.error('Missing required parameters in ensureQuizOptionTranslations');
            return false;
        }

        // Get all options for this quiz
        const options = await prisma.quizOption.findMany({
            where: { quizId }
        });

        if (!options || options.length === 0) {
            console.log(`No options found for quiz ${quizId}`);
            return true; // Nothing to translate
        }

        // Check which options already have translations
        // Don't use translationId since it doesn't exist in the schema
        const existingOptionTranslations = await prisma.$queryRaw<DBQuizOptionTranslation[]>`
            SELECT qot."optionId", qot.text, qot.explanation 
            FROM "QuizOptionTranslation" qot
            JOIN "QuizOption" qo ON qot."optionId" = qo.id
            WHERE qo."quizId" = ${quizId} AND qot."languageCode" = ${languageCode}
        `;

        // Create a set of option IDs that already have translations
        const translatedOptionIds = new Set(
            (existingOptionTranslations || []).map(t => t.optionId)
        );

        // Filter options that need translation
        const optionsNeedingTranslation = options.filter(
            option => !translatedOptionIds.has(option.id)
        );

        console.log(`Found ${optionsNeedingTranslation.length} options needing translation for quiz ${quizId}`);

        // If all options have translations, return
        if (optionsNeedingTranslation.length === 0) {
            return true;
        }

        // Translate each option that needs translation
        for (const option of optionsNeedingTranslation) {
            const translatedText = await translateText(option.text, languageCode);
            const translatedExplanation = await translateText(option.explanation || '', languageCode);

            // Create new option translation without using translationId field
            await prisma.$executeRaw`
                INSERT INTO "QuizOptionTranslation" (
                    id, "optionId", "languageCode", 
                    "text", "explanation", "createdAt", "updatedAt"
                )
                VALUES (
                    gen_random_uuid(), ${option.id}, ${languageCode},
                    ${translatedText}, ${translatedExplanation}, NOW(), NOW()
                )
            `;
            console.log(`Created translation for option ${option.id}: "${translatedText}"`);
        }

        console.log(`Successfully translated all missing options for quiz ${quizId}`);
        return true;
    } catch (error) {
        console.error(`Error ensuring option translations for quiz ${quizId}:`, error);
        return false;
    }
}

/**
 * Gets a quiz with translated content based on user language
 * First checks for stored translations, then translates on-the-fly if needed
 */
export async function getQuizInUserLanguage(
    quizId: string,
    userLanguage: string
): Promise<TranslatedQuiz | null> {
    try {
        if (!quizId) {
            console.error('Missing quizId in getQuizInUserLanguage');
            return null;
        }

        // Default language (original content)
        const defaultLanguage = 'en';
        const language = userLanguage || defaultLanguage;

        // If user wants content in English, return the original
        if (language === defaultLanguage) {
            return prisma.quiz.findUnique({
                where: { id: quizId },
                include: { options: true }
            });
        }

        // Get the original quiz with options
        const originalQuiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { options: true }
        });

        if (!originalQuiz) return null;

        // First check if we have a stored translation
        const storedTranslation = await getStoredQuizTranslation(quizId, language);

        if (storedTranslation) {
            console.log(`Found stored translation for quiz ${quizId} in ${language}`);

            // Check if all options have translations
            // If quiz is translated but some options aren't, translate them now
            if (storedTranslation.optionTranslations.length < originalQuiz.options.length) {
                console.log(`Quiz has ${originalQuiz.options.length} options but only ${storedTranslation.optionTranslations.length} translations`);

                // Ensure all options have translations
                await ensureQuizOptionTranslations(
                    quizId,
                    storedTranslation.quizTranslation.id,
                    language
                );

                // Refresh the option translations after adding new ones
                const refreshedTranslation = await getStoredQuizTranslation(quizId, language);
                if (refreshedTranslation) {
                    storedTranslation.optionTranslations = refreshedTranslation.optionTranslations;
                }
            }

            // Create a translated version of the quiz using stored translations
            const translatedQuiz: TranslatedQuiz = {
                ...originalQuiz,
                question: storedTranslation.quizTranslation.question,
                options: originalQuiz.options.map(option => {
                    const optionTranslation = storedTranslation.optionTranslations.find(
                        (t) => t.optionId === option.id
                    );

                    // Debug log for option translation mapping
                    if (optionTranslation) {
                        console.log(`Option "${option.text}" → "${optionTranslation.text}"`);
                    } else {
                        console.log(`No translation found for option "${option.text}" (ID: ${option.id})`);
                    }

                    return {
                        ...option,
                        translatedText: optionTranslation?.text || option.text,
                        translatedExplanation: optionTranslation?.explanation || option.explanation
                    };
                })
            };

            return translatedQuiz;
        }

        // If no stored translation, translate on-the-fly
        console.log(`No stored translation found for quiz ${quizId} in ${language}, translating now`);

        // Translate quiz question
        const translatedQuestion = await translateText(originalQuiz.question, language);

        // Translate each option
        const translatedOptions = await Promise.all(
            originalQuiz.options.map(async (option) => {
                const translatedText = await translateText(option.text, language);
                const translatedExplanation = await translateText(option.explanation || '', language);

                return {
                    ...option,
                    translatedText,
                    translatedExplanation
                };
            })
        );

        // Store the new translations for future use
        await storeQuizTranslation(
            quizId,
            language,
            translatedQuestion,
            translatedOptions.map(option => ({
                optionId: option.id,
                translatedText: option.translatedText || '',
                translatedExplanation: option.translatedExplanation || ''
            }))
        );

        // Create a translated version of the quiz
        const translatedQuiz: TranslatedQuiz = {
            ...originalQuiz,
            question: translatedQuestion,
            options: translatedOptions
        };

        return translatedQuiz;
    } catch (error) {
        console.error('Error translating quiz content:', error);
        // Return original content if translation fails
        const originalQuiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: { options: true }
        });
        return originalQuiz;
    }
}

/**
 * Gets a random quiz from the database and translates it to the user's language
 */
export async function getRandomQuizWithTranslation(
    brandId: string,
    language: string = 'en'
): Promise<TranslatedQuiz | null> {
    try {
        if (!brandId) {
            console.error('Missing brandId in getRandomQuizWithTranslation');
            return null;
        }

        // Find a random quiz for the brand
        const quizzes = await prisma.quiz.findMany({
            where: { brandId },
            select: { id: true }
        });

        if (!quizzes || quizzes.length === 0) {
            console.log(`No quizzes found for brand ${brandId}`);
            return null;
        }

        // Get a random quiz from the results
        const randomIndex = Math.floor(Math.random() * quizzes.length);
        const randomQuizId = quizzes[randomIndex].id;

        // Get the quiz with translations
        return getQuizInUserLanguage(randomQuizId, language);
    } catch (error) {
        console.error('Error getting random quiz with translation:', error);
        return null;
    }
}

/**
 * Gets quizzes for a brand and translates them to the user's language
 */
export async function getQuizzesByBrandWithTranslation(
    brandId: string,
    language: string = 'en'
): Promise<TranslatedQuiz[]> {
    try {
        if (!brandId) {
            console.error('Missing brandId in getQuizzesByBrandWithTranslation');
            return [];
        }

        // Get all quizzes for the brand
        const quizzes = await prisma.quiz.findMany({
            where: { brandId },
            select: { id: true }
        });

        if (!quizzes || quizzes.length === 0) {
            console.log(`No quizzes found for brand ${brandId}`);
            return [];
        }

        // Get all quizzes with translations
        const translatedQuizzes = await Promise.all(
            quizzes.map(quiz => getQuizInUserLanguage(quiz.id, language))
        );

        // Filter out null results
        return translatedQuizzes.filter(quiz => quiz !== null) as TranslatedQuiz[];
    } catch (error) {
        console.error('Error getting quizzes with translation:', error);
        return [];
    }
}

/**
 * Prefetches all translations for a brand's quizzes
 * This should be called when loading the game config, before gameplay starts
 */
export async function prefetchBrandQuizTranslations(
    brandId: string,
    language: string = 'en'
): Promise<boolean> {
    try {
        if (!brandId) {
            console.error('Missing brandId in prefetchBrandQuizTranslations');
            return false;
        }

        // If language is English, no need to prefetch translations
        if (language === 'en') return true;

        console.log(`Prefetching translations for brand ${brandId} in ${language}`);

        // Get all quizzes for the brand
        const quizzes = await prisma.quiz.findMany({
            where: { brandId },
            include: { options: true }
        });

        if (!quizzes || quizzes.length === 0) {
            console.log(`No quizzes found for brand ${brandId} to prefetch translations`);
            return true;
        }

        // For each quiz, ensure we have translations
        for (const quiz of quizzes) {
            // Check if we already have a translation stored
            const storedTranslation = await getStoredQuizTranslation(quiz.id, language);

            // If no stored translation, create one
            if (!storedTranslation) {
                console.log(`Creating translation for quiz ${quiz.id} in ${language}`);

                // Translate quiz question
                const translatedQuestion = await translateText(quiz.question, language);

                // Translate each option
                const translatedOptions = await Promise.all(
                    quiz.options.map(async (option) => {
                        const translatedText = await translateText(option.text, language);
                        const translatedExplanation = await translateText(option.explanation || '', language);

                        return {
                            optionId: option.id,
                            translatedText,
                            translatedExplanation
                        };
                    })
                );

                // Store translations
                await storeQuizTranslation(
                    quiz.id,
                    language,
                    translatedQuestion,
                    translatedOptions
                );
            } else {
                console.log(`Translation already exists for quiz ${quiz.id} in ${language}`);

                // Check if all options have translations
                if (storedTranslation.optionTranslations.length < quiz.options.length) {
                    console.log(`Quiz has ${quiz.options.length} options but only ${storedTranslation.optionTranslations.length} translations`);

                    // Ensure all options have translations
                    await ensureQuizOptionTranslations(
                        quiz.id,
                        storedTranslation.quizTranslation.id,
                        language
                    );
                }
            }
        }

        console.log(`Successfully prefetched all translations for brand ${brandId} in ${language}`);
        return true;
    } catch (error) {
        console.error(`Error prefetching translations for brand ${brandId}:`, error);
        return false;
    }
}

/**
 * In the future with schema updates, implement these additional functions:
 * 
 * 1. storeQuizTranslation - saves translations to the database
 * 2. getStoredTranslation - retrieves existing translations from the database 
 * 3. updateQuizTranslationSettings - enables/disables autoTranslate for quizzes
 */ 