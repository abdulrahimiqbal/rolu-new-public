import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ImageKit from 'imagekit';
import { StoryType, Prisma } from '@prisma/client'; // Import generated StoryType enum AND Prisma
import { v4 as uuidv4 } from 'uuid'; // For unique filenames

export async function POST(request: NextRequest) {
  // Initialize ImageKit inside the handler
  const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
  });

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const storyType = formData.get('storyType') as StoryType | null;
    const textContent = formData.get('textContent') as string | null;
    const file = formData.get('file') as File | null;

    if (!storyType) {
      return NextResponse.json({ error: 'storyType is required' }, { status: 400 });
    }

    let contentUrl: string | null = null;
    let finalStoryType: StoryType = storyType;

    // Validate inputs based on type
    if (storyType === StoryType.TEXT) {
      if (!textContent) {
        return NextResponse.json({ error: 'textContent is required for TEXT stories' }, { status: 400 });
      }
    } else if (storyType === StoryType.IMAGE || storyType === StoryType.GAME_SCREENSHOT) {
      if (!file) {
        return NextResponse.json({ error: 'file is required for IMAGE or GAME_SCREENSHOT stories' }, { status: 400 });
      }

      // --- ImageKit Upload ---
      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const uniqueFileName = `${uuidv4()}-${file.name}`; // Ensure unique filename

        const uploadResponse = await imagekit.upload({
          file: fileBuffer,
          fileName: uniqueFileName,
          folder: '/user_stories', // Optional: Organize uploads in ImageKit
          // You can add tags, etc. here
        });
        contentUrl = uploadResponse.url; // Get the URL from ImageKit
        console.log('ImageKit Upload Success:', { url: contentUrl, fileId: uploadResponse.fileId });
      } catch (uploadError: any) {
        console.error('ImageKit upload failed:', uploadError);
        return NextResponse.json({ error: 'Image upload failed', details: uploadError.message }, { status: 500 });
      }
      // --- End ImageKit Upload ---

    } else {
        // Handle potential future story types or invalid types
        if (storyType !== StoryType.HIGH_SCORE) { // Allow HIGH_SCORE without content for now
             return NextResponse.json({ error: 'Invalid storyType or missing required content' }, { status: 400 });
        }
    }


    // --- Database Insertion ---
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // Expire in 24 hours

    const newStory = await prisma.userStory.create({
      data: {
        userId: currentUser.id,
        type: finalStoryType,
        textContent: storyType === StoryType.TEXT ? textContent : null,
        contentUrl: contentUrl,
        expiresAt: expiresAt,
      } as any, // Use 'as any' to bypass strict type checking here
      select: {
        id: true,
        userId: true,
        type: true,
        contentUrl: true,
        textContent: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    // --- End Database Insertion ---

    return NextResponse.json({ success: true, story: newStory }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating story:', error);
    // Log the specific error details if possible
    let errorMessage = 'Failed to create story';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
    }

    return NextResponse.json({ error: 'Failed to create story', details: errorMessage }, { status: 500 });
  }
} 