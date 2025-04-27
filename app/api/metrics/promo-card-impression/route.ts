import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { impressions } = body;

        // Validate request
        if (!impressions || !Array.isArray(impressions)) {
            return NextResponse.json(
                { error: 'Missing or invalid impressions array' },
                { status: 400 }
            );
        }

        // For each impression, record in database
        const results = await Promise.allSettled(
            impressions.map(async (impression: any) => {
                const { cardId, userId, brandId } = impression;
                if (!cardId || !userId) return null;

                try {
                    // Record the impression with action 'viewed'
                    await prisma.$executeRaw`
                        INSERT INTO "PromoCardInteraction" ("id", "cardId", "userId", "action", "brandId", "timestamp")
                        VALUES (gen_random_uuid(), ${cardId}, ${userId}, 'viewed', ${brandId || null}, NOW())
                        ON CONFLICT DO NOTHING;
                    `;

                    // Update impression count in metrics if available
                    try {
                        await prisma.$executeRaw`
                            UPDATE "PromotionalCardMetric" 
                            SET "impressionCount" = "impressionCount" + 1,
                                "lastUpdated" = NOW()
                            WHERE "cardId" = ${cardId};
                        `;
                    } catch (error) {
                        // Silently fail if metrics table doesn't exist yet
                        console.log('Note: Unable to update metrics for impression:', error);
                    }

                    return { success: true, cardId };
                } catch (error) {
                    console.error('Error recording impression for card:', cardId, error);
                    return { success: false, cardId, error };
                }
            })
        );

        return NextResponse.json({ 
            success: true, 
            processed: results.length 
        });
    } catch (error) {
        console.error('Error recording promotional card impressions:', error);
        return NextResponse.json(
            { error: 'Failed to record impressions' },
            { status: 500 }
        );
    }
} 