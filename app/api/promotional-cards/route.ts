import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to calculate card priority score with fatigue detection
async function calculateCardPriorityScore(card: any, userId?: string | null) {
    let score = 0;
    const now = new Date();
    
    // 1. Urgency (Time-Sensitivity)
    const endDate = new Date(card.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 3) score += 40;      // Last 3 days - highest urgency
    else if (daysRemaining <= 7) score += 25; // Last week - high urgency
    else if (daysRemaining <= 14) score += 15; // Two weeks - moderate urgency
    
    // 2. Freshness
    const creationDate = new Date(card.createdAt);
    const daysSinceCreation = Math.ceil((now.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
    score += Math.max(0, 30 - daysSinceCreation); // Linear decay over 30 days
    
    // 3. Content relevance based on brand
    if (card.brand) {
        // Give popular brands a boost
        score += 10;
    }
    
    // 4. Card priority (if available)
    if (card.priority) {
        score += card.priority * 5; // Priority 1-10 can add up to 50 points
    }
    
    // 5. Special offer flag
    if (card.isSpecialOffer) {
        score += 20;
    }
    
    // 6. Fatigue Detection - Apply if we have a userId
    if (userId) {
        try {
            // Use raw query since the model might not be recognized by TypeScript yet
            const interactionsResult: any[] = await prisma.$queryRaw`
                SELECT "action", COUNT(*) as "count"
                FROM "PromoCardInteraction"
                WHERE "cardId" = ${card.id}
                AND "userId" = ${userId}
                GROUP BY "action"
            `;
            
            // Count views and clicks from the result
            const viewRecord = interactionsResult.find(r => r.action === 'viewed');
            const clickRecord = interactionsResult.find(r => r.action === 'clicked');
            
            const views = viewRecord ? Number(viewRecord.count) : 0;
            const clicks = clickRecord ? Number(clickRecord.count) : 0;
            
            // If user has viewed the card but not clicked it
            if (views > 0 && clicks === 0) {
                // For first view, no penalty
                if (views === 1) {
                    // No penalty for first view
                } 
                // For second view without interaction, apply moderate penalty
                else if (views === 2) {
                    score -= 15; // Moderate penalty
                }
                // For third+ view without interaction, apply larger penalty to rotate it out
                else if (views >= 3) {
                    score -= 50; // Significant penalty to rotate it out
                }
            }
            
            // If user has already clicked the card, reduce its priority slightly
            // This ensures users see a variety of content
            if (clicks > 0) {
                score -= 10;
            }
        } catch (error) {
            console.error('Error checking interaction history for fatigue detection:', error);
            // Continue without fatigue penalty if there's an error
        }
    }
    
    return score;
}

// GET - Fetch all promotional cards
export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const brandId = url.searchParams.get('brandId');
        const showInactive = url.searchParams.get('showInactive') === 'true';
        const userId = url.searchParams.get('userId');

        const filters: any = {};

        if (brandId) {
            filters.brandId = brandId;
        }

        if (!showInactive) {
            filters.isActive = true;
            // Only show cards that are currently active (within date range)
            filters.startDate = { lte: new Date() };
            filters.endDate = { gte: new Date() };
        }

        // Fetch promotional cards
        const promotionalCards = await prisma.promotionalCard.findMany({
            where: filters,
            include: {
                brand: {
                    select: {
                        name: true,
                        logoUrl: true
                    }
                }
            }
        });

        // Calculate priority score for each card
        const scoredCardsPromises = promotionalCards.map(async card => {
            const priorityScore = await calculateCardPriorityScore(card, userId || null);
            return {
                ...card,
                priorityScore
            };
        });
        
        const scoredCards = await Promise.all(scoredCardsPromises);

        // Sort by priority score (highest first)
        scoredCards.sort((a, b) => b.priorityScore - a.priorityScore);
        
        // Log fatigue-affected cards for debugging
        if (userId) {
            // Check which cards were affected by fatigue by comparing their score
            // with what would be expected based solely on their base attributes
            const fatigueAffectedCards = scoredCards.filter(card => {
                // A negative score indicates fatigue penalty was applied
                return card.priorityScore < 0;
            });
            
            if (fatigueAffectedCards.length > 0) {
                console.log(`Fatigue affecting ${fatigueAffectedCards.length} cards for user ${userId}`);
            }
        }

        return NextResponse.json(scoredCards);
    } catch (error) {
        console.error('Error fetching promotional cards:', error);
        return NextResponse.json(
            { error: 'Failed to fetch promotional cards' },
            { status: 500 }
        );
    }
}

// POST - Create a new promotional card
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            title,
            description,
            imageUrl,
            linkUrl,
            brandId,
            isActive,
            startDate,
            endDate
        } = body;

        // Validate required fields
        if (!title || !description || !imageUrl || !linkUrl || !brandId || !startDate || !endDate) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Convert dates from strings to Date objects
        const formattedStartDate = new Date(startDate);
        const formattedEndDate = new Date(endDate);

        const newPromotionalCard = await prisma.promotionalCard.create({
            data: {
                title,
                description,
                imageUrl,
                linkUrl,
                brandId,
                isActive: isActive ?? true,
                startDate: formattedStartDate,
                endDate: formattedEndDate
            }
        });

        return NextResponse.json(newPromotionalCard, { status: 201 });
    } catch (error) {
        console.error('Error creating promotional card:', error);
        return NextResponse.json(
            { error: 'Failed to create promotional card' },
            { status: 500 }
        );
    }
} 