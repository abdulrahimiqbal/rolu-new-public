import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch a specific promotional card
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        const promotionalCard = await prisma.promotionalCard.findUnique({
            where: { id },
            include: {
                brand: {
                    select: {
                        name: true,
                        logoUrl: true
                    }
                }
            }
        });

        if (!promotionalCard) {
            return NextResponse.json(
                { error: 'Promotional card not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(promotionalCard);
    } catch (error) {
        console.error('Error fetching promotional card:', error);
        return NextResponse.json(
            { error: 'Failed to fetch promotional card' },
            { status: 500 }
        );
    }
}

// PATCH - Update a promotional card
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
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

        // Prepare update data
        const updateData: any = {};

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
        if (brandId !== undefined) updateData.brandId = brandId;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);

        const updatedPromotionalCard = await prisma.promotionalCard.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(updatedPromotionalCard);
    } catch (error) {
        console.error('Error updating promotional card:', error);
        return NextResponse.json(
            { error: 'Failed to update promotional card' },
            { status: 500 }
        );
    }
}

// DELETE - Delete a promotional card
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        await prisma.promotionalCard.delete({
            where: { id }
        });

        return NextResponse.json(
            { message: 'Promotional card deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting promotional card:', error);
        return NextResponse.json(
            { error: 'Failed to delete promotional card' },
            { status: 500 }
        );
    }
} 