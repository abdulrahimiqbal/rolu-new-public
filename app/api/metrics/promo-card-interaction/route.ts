import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { cardId, userId, action, brandId, timestamp } = body;

        // Validate required fields
        if (!cardId || !action) {
            return NextResponse.json(
                { error: 'Missing required fields (cardId, action)' },
                { status: 400 }
            );
        }

        // Create interaction record in the database
        // Note: This assumes you have a PromoCardInteraction model in your Prisma schema
        // If you don't have this model yet, you'll need to add it to your schema and run prisma migrate
        try {
            await prisma.$executeRaw`
                INSERT INTO "PromoCardInteraction" ("cardId", "userId", "action", "brandId", "timestamp")
                VALUES (${cardId}, ${userId || null}, ${action}, ${brandId || null}, ${timestamp ? new Date(timestamp) : new Date()})
                ON CONFLICT ("cardId", "userId", "action") 
                DO UPDATE SET "timestamp" = ${timestamp ? new Date(timestamp) : new Date()};
            `;
            
            // If you have a metrics table for aggregating card performance, update it
            // This is a simple implementation - in production you might have a more complex logic
            // or use a background job for this
            if (action === 'clicked') {
                try {
                    // Insert or update the metrics record - this handles cases where the metric doesn't exist yet
                    await prisma.$executeRaw`
                        INSERT INTO "PromotionalCardMetric" ("id", "cardId", "impressionCount", "clickCount", "conversionCount", "shareCount", "lastUpdated")
                        VALUES (gen_random_uuid(), ${cardId}, 0, 1, 0, 0, NOW())
                        ON CONFLICT ("cardId") 
                        DO UPDATE SET 
                            "clickCount" = "PromotionalCardMetric"."clickCount" + 1,
                            "lastUpdated" = NOW();
                    `;
                } catch (error) {
                    // Log error but continue - we don't want to fail the user experience
                    console.log('Error updating promotional card metrics:', error);
                }
            }

            return NextResponse.json({ success: true });
        } catch (error) {
            console.error('Database error recording promo card interaction:', error);
            
            // Fallback to logging interaction if schema doesn't support it yet
            console.log('Promo card interaction:', { cardId, userId, action, brandId, timestamp });
            
            // Still return success to client - we don't want to fail user experience
            return NextResponse.json({ 
                success: true, 
                note: 'Interaction logged but not stored in database. Schema may need updating.'
            });
        }
        
    } catch (error) {
        console.error('Error recording promotional card interaction:', error);
        return NextResponse.json(
            { error: 'Failed to record interaction', details: error },
            { status: 500 }
        );
    }
} 