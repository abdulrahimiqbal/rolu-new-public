import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/assets/:id - Get a specific asset
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        const asset = await prisma.gameAsset.findUnique({
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

        if (!asset) {
            return NextResponse.json(
                { error: "Asset not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(asset);
    } catch (error) {
        console.error("Error fetching asset:", error);
        return NextResponse.json(
            { error: "Failed to fetch asset" },
            { status: 500 }
        );
    }
}

// PUT /api/assets/:id - Update an asset
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();
        const { type, brandId, assetUrl, width, height, points } = body;

        // Validate required fields
        if (!type || !brandId || !assetUrl) {
            return NextResponse.json(
                { error: "Missing required fields: type, brandId, assetUrl" },
                { status: 400 }
            );
        }

        // Update the asset
        const asset = await prisma.gameAsset.update({
            where: {
                id,
            },
            data: {
                type,
                brandId,
                assetUrl,
                width: width || null,
                height: height || null,
                points: points || null,
            },
        });

        return NextResponse.json(asset);
    } catch (error) {
        console.error("Error updating asset:", error);
        return NextResponse.json(
            { error: "Failed to update asset" },
            { status: 500 }
        );
    }
}

// DELETE /api/assets/:id - Delete an asset
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        // Delete the asset
        await prisma.gameAsset.delete({
            where: {
                id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting asset:", error);
        return NextResponse.json(
            { error: "Failed to delete asset" },
            { status: 500 }
        );
    }
} 