#!/usr/bin/env ts-node

/**
 * This script checks and displays the current quiz translations in the database.
 * It's useful for debugging translation issues and verifying that translations exist.
 * 
 * Usage:
 * npx ts-node scripts/check-translations.ts [brandId] [languageCode]
 * 
 * Example:
 * npx ts-node scripts/check-translations.ts rolu-brand es
 */

import { prisma } from '../lib/prisma';

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

async function main() {
    const args = process.argv.slice(2);
    const brandId = args[0];
    const languageCode = args[1];

    if (!brandId || !languageCode) {
        console.error('Usage: npx ts-node scripts/check-translations.ts [brandId] [languageCode]');
        process.exit(1);
    }

    console.log(`Checking translations for brand: ${brandId}, language: ${languageCode}`);

    try {
        // Get all quizzes for this brand
        const quizzes = await prisma.$queryRaw<DBQuiz[]>`
      SELECT id, question, "brandId" FROM "Quiz"
      WHERE "brandId" = ${brandId}
    `;

        console.log(`Found ${quizzes.length} quizzes for brand ${brandId}`);

        // Process each quiz
        for (const quiz of quizzes) {
            console.log(`\n=== Quiz ID: ${quiz.id} ===`);
            console.log(`Original Question: ${quiz.question}`);

            // Get quiz translation
            const quizTranslations = await prisma.$queryRaw<DBQuizTranslation[]>`
        SELECT id, "quizId", "languageCode", question FROM "QuizTranslation"
        WHERE "quizId" = ${quiz.id} AND "languageCode" = ${languageCode}
      `;

            if (quizTranslations.length === 0) {
                console.log(`No translation found for language: ${languageCode}`);
                continue;
            }

            console.log(`Translated Question: ${quizTranslations[0].question}`);

            // Get all options for this quiz
            const options = await prisma.$queryRaw<DBQuizOption[]>`
        SELECT id, text, explanation, "isCorrect" FROM "QuizOption"
        WHERE "quizId" = ${quiz.id}
      `;

            console.log(`\nOptions (${options.length}):`);

            // Process each option
            for (const option of options) {
                console.log(`\n  Option ID: ${option.id}`);
                console.log(`  Original Text: ${option.text}`);
                console.log(`  Original Explanation: ${option.explanation.substring(0, 50)}${option.explanation.length > 50 ? '...' : ''}`);

                // Get option translation
                const optionTranslations = await prisma.$queryRaw<DBQuizOptionTranslation[]>`
          SELECT id, text, explanation FROM "QuizOptionTranslation"
          WHERE "optionId" = ${option.id} AND "languageCode" = ${languageCode}
        `;

                if (optionTranslations.length === 0) {
                    console.log(`  No translation found for this option`);
                } else {
                    console.log(`  Translated Text: ${optionTranslations[0].text}`);
                    console.log(`  Translated Explanation: ${optionTranslations[0].explanation.substring(0, 50)}${optionTranslations[0].explanation.length > 50 ? '...' : ''}`);
                }
            }
        }

        console.log('\nTranslation check complete');
    } catch (error) {
        console.error('Error checking translations:', error);
        process.exit(1);
    }
}

main().then(() => {
    console.log('\nDone');
    process.exit(0);
}).catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
}); 