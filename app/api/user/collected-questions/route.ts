import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for types

// Define the expected return type, including quiz options
export type CollectedQuestion = Prisma.QuizGetPayload<{
  include: {
    options: true;
    // We might also want to include the user's last response here later
  }
}>

export const dynamic = 'force-dynamic'; // Ensure fresh data

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Find distinct quiz IDs the user has responded to
    const distinctQuizResponses = await prisma.quizResponse.findMany({
      where: {
        userId: currentUser.id,
      },
      distinct: ['quizId'],
      select: {
        quizId: true,
      },
    });

    const collectedQuizIds = distinctQuizResponses.map(qr => qr.quizId);

    if (collectedQuizIds.length === 0) {
      return NextResponse.json([]); // Return empty array if no questions collected
    }

    // 2. Fetch the full details for these quizzes, including options
    const collectedQuizzes: CollectedQuestion[] = await prisma.quiz.findMany({
      where: {
        id: {
          in: collectedQuizIds,
        },
      },
      include: {
        options: true, // Include the multiple-choice options
      },
      // Optionally add orderBy if needed
    });

    // TODO: Enhance response later? 
    // - Include user's previous answer (correct/incorrect) for each quiz.
    // - Filter out quizzes that shouldn't be reviewed?

    return NextResponse.json(collectedQuizzes);

  } catch (error: any) {
    console.error('Error fetching collected questions:', error);
    return NextResponse.json({ error: 'Failed to fetch collected questions', details: error.message }, { status: 500 });
  }
} 