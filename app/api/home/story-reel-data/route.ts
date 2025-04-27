import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserStory } from '@prisma/client';

// This interface defines the shape of the data returned by the API
export interface StoryReelData {
  userStory: UserStory | null; // User's currently active story, if any
  collectedQuestionsCount: number; // Example: count of collected questions
  collectedInfoBlocksCount: number; // Example: count of collected info blocks
  isPowerHourActive: boolean; // Example: status of power hour
  friendsWithStories: { userId: string; username: string; profileImage: string | null }[]; // Placeholder for friends
}

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch user's active story
    const now = new Date();
    const userStory = await prisma.userStory.findFirst({
      where: {
        userId: currentUser.id,
        expiresAt: {
          gt: now, // Find stories that haven't expired yet
        },
      },
      orderBy: {
        createdAt: 'desc', // Get the most recent active story
      },
    });

    // 2. Fetch collected items counts
    // Count distinct quizzes the user has responded to
    const distinctQuizResponses = await prisma.quizResponse.findMany({
      where: {
        userId: currentUser.id,
        // Optionally add: isCorrect: true if only correct answers count
      },
      distinct: ['quizId'],
      select: {
        quizId: true, // Select only the distinct field for efficiency
      },
    });
    const collectedQuizIds = distinctQuizResponses.map(qr => qr.quizId);
    const collectedQuestionsCount = collectedQuizIds.length;

    // Info blocks are derived from collected questions
    const collectedInfoBlocksCount = collectedQuestionsCount; // Use the same count

    // 3. Fetch Power Hour status
    // TODO: Implement actual logic for Power Hour.
    // This might involve checking global GameSettings, user-specific flags,
    // time-based events, or an external configuration.
    const isPowerHourActive = false; // Placeholder

    // 4. Fetch friends with active stories (Placeholder/Simplified)
    // TODO: Replace with actual friend relationship logic and story fetching
    const friendsWithStories: StoryReelData['friendsWithStories'] = []; // Empty for now

    // 5. Combine data into the response structure
    const responseData: StoryReelData = {
      userStory,
      collectedQuestionsCount,
      collectedInfoBlocksCount,
      isPowerHourActive,
      friendsWithStories,
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Error fetching story reel data:', error);
    return NextResponse.json({ error: 'Failed to fetch story reel data', details: error.message }, { status: 500 });
  }
} 