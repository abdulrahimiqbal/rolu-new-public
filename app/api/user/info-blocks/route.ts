import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Re-use the same type definition as collected questions, as we need options
import type { CollectedQuestion } from '../collected-questions/route';

export const dynamic = 'force-dynamic'; // Ensure fresh data

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Find distinct quiz IDs the user has responded to (same as collected questions)
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
      return NextResponse.json([]); // Return empty array if no questions encountered
    }

    // 2. Fetch the full details for these quizzes, including options (needed for explanation)
    const quizzesForInfo: CollectedQuestion[] = await prisma.quiz.findMany({
      where: {
        id: {
          in: collectedQuizIds,
        },
      },
      include: {
        options: { // Ensure options are included
          where: { isCorrect: true }, // Only fetch the correct option for the explanation
          // If explanation might be on incorrect options too, remove the where clause
        },
      },
      // Optionally add orderBy if needed
    });

    // We might filter quizzes here if some shouldn't have info blocks displayed

    return NextResponse.json(quizzesForInfo);

  } catch (error: any) {
    console.error('Error fetching info blocks (quizzes):', error);
    return NextResponse.json({ error: 'Failed to fetch info blocks', details: error.message }, { status: 500 });
  }
} 