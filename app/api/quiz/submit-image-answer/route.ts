import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { evaluateImage } from '@/lib/ai-evaluator';
import { QuestionType, Prisma } from '@prisma/client'; // Import enum and Prisma namespace
import { trackEvent } from "@/lib/server-analytics"; // Server-safe trackEvent

// TODO: Import necessary functions for user authentication

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      quizId,
      imageUrl, // Assuming client-side upload provides the ImageKit URL
      imageMimeType, // Client should provide this (e.g., 'image/png', 'image/jpeg')
      gameSessionId, // Optional
    } = body;

    // --- 1. Input Validation ---
    if (!userId || !quizId || !imageUrl || !imageMimeType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // --- 2. Authentication (Placeholder) ---
    // TODO: Implement actual user authentication check
    console.log(`[API Submit Image] Received request for user: ${userId}, quiz: ${quizId}`);


    // --- 3. Fetch Quiz Details & Validate Type ---
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { brand: true } // Include brand relation for settings lookup
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    if (!quiz.brand) {
      return NextResponse.json({ error: 'Quiz or associated brand not found' }, { status: 404 });
    }

    if (quiz.questionType !== QuestionType.IMAGE_UPLOAD_AI) {
      return NextResponse.json({ error: 'Invalid question type for this endpoint' }, { status: 400 });
    }

    if (!quiz.aiEvaluationCriteria) {
      console.error(`[API Submit Image] Missing aiEvaluationCriteria for quiz ID: ${quizId}`);
      return NextResponse.json({ error: 'Quiz is missing AI evaluation criteria configuration.' }, { status: 500 });
    }

    // --- 4. AI Evaluation ---
    let aiResponseText: string;
    const aiStartTime = performance.now(); // Start timing AI evaluation
    try {
      aiResponseText = await evaluateImage(imageUrl, quiz.aiEvaluationCriteria, imageMimeType);
    } catch (aiError) {
      console.error(`[API Submit Image] AI Evaluation failed for quiz ${quizId}, image ${imageUrl}:`, aiError);
      const errorMessage = aiError instanceof Error ? aiError.message : 'AI evaluation failed';
      // Track failed evaluation
      trackEvent('AI Evaluation Completed', {
        quizId: quizId,
        userId: userId,
        success: false,
        error: errorMessage,
        evaluationTimeMs: performance.now() - aiStartTime
      });
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
    const aiEndTime = performance.now(); // End timing AI evaluation

    // --- 5. Determine Correctness ---
    const isCorrect = aiResponseText.toUpperCase() === 'CORRECT';
    console.log(`[API Submit Image] AI evaluation result: ${aiResponseText}, Determined correct: ${isCorrect}`);

    // Track successful evaluation
    trackEvent('AI Evaluation Completed', {
      quizId: quizId,
      userId: userId,
      success: true,
      isCorrect: isCorrect,
      aiResponse: aiResponseText,
      evaluationTimeMs: aiEndTime - aiStartTime
    });

    // --- 6 & 7. Award ROLU & Record Response --- 
    let roluAwarded = 0;
    let finalQuizResponse = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day UTC

    if (isCorrect) {
      // 1. Fetch Game Settings to determine ROLU amount
      let settings = await prisma.gameSettings.findFirst({
        where: { brandId: quiz.brandId, isDefault: true },
      });
      if (!settings) settings = await prisma.gameSettings.findFirst({ where: { isGlobal: true, isDefault: true } });
      if (!settings) settings = await prisma.gameSettings.findFirst({ where: { brandId: quiz.brandId } });
      if (!settings) settings = await prisma.gameSettings.findFirst({ where: { isGlobal: true } });

      const roluPerAnswer = settings?.roluPerCorrectAnswer || 5; // Use fetched value or default
      roluAwarded = roluPerAnswer; // Assign potential award amount
      // NOTE: Daily limit check was deferred

      // 2. Proceed with transaction to award ROLU and record response
      try {
        finalQuizResponse = await prisma.$transaction(async (tx) => {
          // Update user balance
          await tx.user.update({
            where: { id: userId },
            data: { roluBalance: { increment: roluAwarded } },
          });
          // Upsert daily earnings
          await tx.dailyRoluEarnings.upsert({
            where: { userId_date: { userId: userId, date: today } },
            update: { totalEarned: { increment: roluAwarded } },
            create: { userId: userId, date: today, totalEarned: roluAwarded },
          });
          // Create QuizResponse inside the transaction
          const quizResponse = await tx.quizResponse.create({
            data: {
              userId: userId,
              quizId: quizId,
              isCorrect: true,
              gameSessionId: gameSessionId || null,
              uploadedImageUrl: imageUrl,
              aiEvaluationResult: aiResponseText,
            }
          });
          // Optionally create TokenTransaction
          return quizResponse;
        });
        console.log(`[API Submit Image] Awarded ${roluAwarded} ROLU to user ${userId} and logged daily earnings.`);
      } catch (transactionError) {
        console.error(`[API Submit Image] Transaction failed for user ${userId}, quiz ${quizId}:`, transactionError);
        roluAwarded = 0; // Set awarded to 0 if transaction fails
        // Record response outside/after failed transaction
        try {
          finalQuizResponse = await prisma.quizResponse.create({
            data: { // Provide full data structure
              userId: userId,
              quizId: quizId,
              isCorrect: true, // It was correct, transaction failed
              gameSessionId: gameSessionId || null,
              uploadedImageUrl: imageUrl,
              aiEvaluationResult: aiResponseText,
            }
          });
        } catch (responseLogError) {
          console.error(`[API Submit Image] Failed to log quiz response after transaction error:`, responseLogError);
        }
        // Return error indicating transaction failure
        return NextResponse.json({ error: 'Correct answer, but failed to process reward transaction.' }, { status: 500 });
      }

    } else {
      // Incorrect answer - just record response
      try {
        finalQuizResponse = await prisma.quizResponse.create({
          data: {
            userId: userId,
            quizId: quizId,
            isCorrect: false,
            gameSessionId: gameSessionId || null,
            uploadedImageUrl: imageUrl,
            aiEvaluationResult: aiResponseText,
          }
        });
      } catch (responseLogError) {
        console.error(`[API Submit Image] Failed to log incorrect quiz response:`, responseLogError);
        // Decide if we should still return success or an error here
      }
    }

    // --- 8. Return Response --- 
    const responseData = {
      success: true,
      isCorrect: isCorrect,
      aiResponse: aiResponseText,
      roluAwarded: roluAwarded, // Return actual awarded amount (could be 0)
      quizResponseId: finalQuizResponse?.id,
    };
    console.log("[API Submit Image] Returning response:", JSON.stringify(responseData));
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[API Submit Image] General error:', error);
    let errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = `Database Error: Code ${error.code}. Failed to process submission.`;
    }
    return NextResponse.json({ error: `Failed to submit image answer: ${errorMessage}` }, { status: 500 });
  }
} 