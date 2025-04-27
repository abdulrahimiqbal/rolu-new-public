import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { QuestionType, Prisma } from '@prisma/client'; // Import enum and Prisma namespace

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const quizId = params.id;
        const body = await request.json();
        // Extract new fields
        const {
            question,
            imageUrl,
            brandId,
            options, // May be undefined/null if saving an image quiz
            questionType,
            imageUploadPrompt,
            aiEvaluationCriteria
         } = body;

        // --- Validation ---
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
        // --- End Validation ---

        // Check if quiz exists
        const existingQuiz = await prisma.quiz.findUnique({
            where: { id: quizId },
        });

        if (!existingQuiz) {
            return NextResponse.json(
                { success: false, error: "Quiz not found" },
                { status: 404 }
            );
        }

        // Prepare update data
        const updateData: Prisma.QuizUpdateInput = {
            question,
            imageUrl,
            brand: brandId ? { connect: { id: brandId } } : undefined,
            questionType,
            imageUploadPrompt: questionType === QuestionType.IMAGE_UPLOAD_AI ? imageUploadPrompt : null,
            aiEvaluationCriteria: questionType === QuestionType.IMAGE_UPLOAD_AI ? aiEvaluationCriteria : null,
            // options handled separately below
        };

        // Update within a transaction
        const updatedQuiz = await prisma.$transaction(async (tx) => {
            
            // Handle options based on type
            if (questionType === QuestionType.TEXT_MCQ && options) {
                // For MCQ, delete old options and create new ones
                await tx.quizOption.deleteMany({ where: { quizId } });
                updateData.options = {
                    create: options.map((option: any) => ({
                        text: option.text,
                        isCorrect: option.isCorrect,
                        explanation: option.explanation,
                    })),
                };
            } else if (questionType === QuestionType.IMAGE_UPLOAD_AI) {
                // For Image Upload, ensure no options exist (delete if changing type)
                 await tx.quizOption.deleteMany({ where: { quizId } });
                 // Ensure options are not included in the update data itself
                 delete updateData.options;
            }

            // Perform the quiz update
            return tx.quiz.update({
                where: { id: quizId },
                data: updateData,
                include: {
                    // Only include options in the response if it's an MCQ
                    options: questionType === QuestionType.TEXT_MCQ,
                },
            });
        });

        return NextResponse.json({
            success: true,
            data: updatedQuiz,
        });
    } catch (error) {
        console.error("Error updating quiz:", error);
        let errorMessage = "Failed to update quiz";
         if (error instanceof Prisma.PrismaClientKnownRequestError) {
            errorMessage = `Database Error: Code ${error.code}. Failed to update quiz.`;
        }
        return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const quizId = params.id;

        // Check if quiz exists
        const existingQuiz = await prisma.quiz.findUnique({
            where: { id: quizId },
        });

        if (!existingQuiz) {
            return NextResponse.json(
                { success: false, error: "Quiz not found" },
                { status: 404 }
            );
        }

        // Delete the quiz and its options
        await prisma.$transaction(async (tx) => {
            // Delete options first (due to foreign key constraints)
            await tx.quizOption.deleteMany({
                where: { quizId },
            });

            // Delete the quiz
            await tx.quiz.delete({
                where: { id: quizId },
            });
        });

        return NextResponse.json({
            success: true,
            message: "Quiz deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting quiz:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete quiz" },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic'; 