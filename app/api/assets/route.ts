import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/assets - Get all assets or filtered by type and brand
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const brandId = searchParams.get("brandId");

        const whereClause: any = {};

        if (type) {
            whereClause.type = type;
        }

        if (brandId) {
            whereClause.brandId = brandId;
        }

        const assets = await prisma.gameAsset.findMany({
            where: whereClause,
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(assets);
    } catch (error) {
        console.error("Error fetching assets:", error);
        return NextResponse.json(
            { error: "Failed to fetch assets" },
            { status: 500 }
        );
    }
}

// POST /api/assets - Create a new asset
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, brandId, assetUrl, width, height, points } = body;

        // Validate required fields
        if (!type || !brandId || !assetUrl) {
            return NextResponse.json(
                { error: "Missing required fields: type, brandId, assetUrl" },
                { status: 400 }
            );
        }

        // Create the asset
        const asset = await prisma.gameAsset.create({
            data: {
                type,
                brandId,
                assetUrl,
                width: width || null,
                height: height || null,
                points: points || null,
            },
        });

        return NextResponse.json(asset, { status: 201 });
    } catch (error) {
        console.error("Error creating asset:", error);
        return NextResponse.json(
            { error: "Failed to create asset" },
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