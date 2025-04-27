import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/game-assets/:id - Get a specific game asset
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const gameAsset = await prisma.gameAsset.findUnique({
            where: {
                id,
            },
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!gameAsset) {
            return NextResponse.json(
                { error: "Game asset not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(gameAsset);
    } catch (error) {
        console.error("Error fetching game asset:", error);
        return NextResponse.json(
            { error: "Failed to fetch game asset" },
            { status: 500 }
        );
    }
}

// PUT /api/game-assets/:id - Update a game asset
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();

        // Validate required fields
        if (!body.type || !body.assetUrl || !body.brandId) {
            return NextResponse.json(
                { error: "Missing required fields: type, assetUrl, brandId" },
                { status: 400 }
            );
        }

        // Update the game asset
        const gameAsset = await prisma.gameAsset.update({
            where: {
                id,
            },
            data: {
                type: body.type,
                assetUrl: body.assetUrl,
                brandId: body.brandId,
                width: body.width || null,
                height: body.height || null,
                points: body.points || null,
            },
        });

        return NextResponse.json(gameAsset);
    } catch (error) {
        console.error("Error updating game asset:", error);
        return NextResponse.json(
            { error: "Failed to update game asset" },
            { status: 500 }
        );
    }
}

// DELETE /api/game-assets/:id - Delete a game asset
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        await prisma.gameAsset.delete({
            where: {
                id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting game asset:", error);
        return NextResponse.json(
            { error: "Failed to delete game asset" },
            { status: 500 }
        );
    }
} 