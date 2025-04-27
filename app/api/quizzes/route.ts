import { NextResponse } from "next/server";
import { QuizQuestion } from "@/components/quiz/quiz-modal";
import prisma from "@/lib/prisma";
import { QuestionType, Prisma } from '@prisma/client';

// Mark this route as dynamic to prevent static generation errors
export const dynamic = 'force-dynamic';

// Mock quiz data - in a real app, this would come from a database
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
        // More questions...
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
        // More questions...
    ],
    // More brands...
};

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get("brand");
        const quizId = searchParams.get("id");
        const random = searchParams.get("random") === "true";
        const all = searchParams.get("all") === "true"; // New parameter to fetch all quizzes for admin

        // For admin dashboard: fetch all quizzes with their options
        if (all) {
            const quizzes = await prisma.quiz.findMany({
                include: {
                    options: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            return NextResponse.json({
                success: true,
                data: quizzes,
            });
        }

        // Fetch specific quiz by ID
        if (quizId) {
            const quiz = await prisma.quiz.findUnique({
                where: {
                    id: quizId,
                },
                include: {
                    options: true,
                },
            });

            if (!quiz) {
                return NextResponse.json(
                    { success: false, error: "Quiz not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                data: quiz,
            });
        }

        // Fetch quizzes by brand
        let quizQuery: any = {};
        if (brandId) {
            quizQuery.where = {
                brandId,
            };
        }

        // Get all quizzes matching the criteria
        const quizzes = await prisma.quiz.findMany({
            ...quizQuery,
            include: {
                options: true,
            },
        });

        if (quizzes.length === 0) {
            return NextResponse.json(
                { success: false, error: "No quizzes found" },
                { status: 404 }
            );
        }

        // If random is true, return a random quiz
        if (random) {
            const randomIndex = Math.floor(Math.random() * quizzes.length);
            return NextResponse.json({
                success: true,
                data: quizzes[randomIndex],
            });
        }

        // Otherwise return all matching quizzes
        return NextResponse.json({
            success: true,
            data: quizzes,
        });
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch quizzes" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
             question, 
             imageUrl, 
             brandId, 
             options, 
             questionType,
             imageUploadPrompt,
             aiEvaluationCriteria
        } = body;

        if (!question || !brandId || !questionType) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: question, brandId, questionType." },
                { status: 400 }
            );
        }

        if (questionType === QuestionType.TEXT_MCQ) {
            if (!options || options.length < 2) {
                 return NextResponse.json(
                    { success: false, error: "Multiple Choice questions require at least 2 options." },
                    { status: 400 }
                );
            }
            if (!options.some((option: any) => option.isCorrect)) {
                return NextResponse.json(
                    { success: false, error: "At least one option must be marked as correct for Multiple Choice questions" },
                    { status: 400 }
                );
            }
        } else if (questionType === QuestionType.IMAGE_UPLOAD_AI) {
             if (!imageUploadPrompt?.trim()) {
                return NextResponse.json(
                    { success: false, error: "User Prompt is required for Image Upload questions" },
                    { status: 400 }
                );
            }
             if (!aiEvaluationCriteria?.trim()) {
                 return NextResponse.json(
                    { success: false, error: "AI Evaluation Criteria is required for Image Upload questions" },
                    { status: 400 }
                );
            }
        } else {
             return NextResponse.json(
                { success: false, error: "Invalid question type specified" },
                { status: 400 }
            );
        }

        const quizData: any = {
            question,
            imageUrl,
            brandId,
            questionType,
            imageUploadPrompt: questionType === QuestionType.IMAGE_UPLOAD_AI ? imageUploadPrompt : null,
            aiEvaluationCriteria: questionType === QuestionType.IMAGE_UPLOAD_AI ? aiEvaluationCriteria : null,
        };

        if (questionType === QuestionType.TEXT_MCQ && options) {
            quizData.options = {
                create: options.map((option: any) => ({
                    text: option.text,
                    isCorrect: option.isCorrect,
                    explanation: option.explanation,
                })),
            };
        }

        const quiz = await prisma.quiz.create({
            data: quizData,
            include: {
                options: questionType === QuestionType.TEXT_MCQ,
            },
        });

        return NextResponse.json({
            success: true,
            data: quiz,
        });
    } catch (error) {
        console.error("Error creating quiz:", error);
        // Provide more specific error if possible
        let errorMessage = error instanceof Error ? error.message : "Failed to create quiz";
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
             // Handle known Prisma errors (e.g., unique constraint violation)
             errorMessage = `Database Error: Code ${error.code}. Failed to create quiz.`;
         }
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
} 