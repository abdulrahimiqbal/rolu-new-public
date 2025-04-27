import { NextResponse } from 'next/server';
import imagekit from '@/lib/imagekit-server';
import { getCurrentUser } from '@/lib/auth';

// Simple endpoint to provide authentication parameters for client-side uploads
// In a real app, you SHOULD add authentication here to ensure only logged-in users can get these credentials
export async function GET() {
  try {
    // Add user authentication check here
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authenticationParameters = imagekit.getAuthenticationParameters();
    return NextResponse.json(authenticationParameters);
  } catch (error) {
    console.error('[API /imagekit/auth] Error generating ImageKit auth params:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication parameters' },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic"; 