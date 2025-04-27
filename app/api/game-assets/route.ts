import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/game-assets - Get all game assets or filtered by brand and type
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get("brandId");
        const type = searchParams.get("type");

        // Build the where clause based on query parameters
        const whereClause: any = {};

        if (brandId) {
            whereClause.brandId = brandId;
        }

        if (type) {
            whereClause.type = type;
        }

        const gameAssets = await prisma.gameAsset.findMany({
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

        return NextResponse.json(gameAssets);
    } catch (error) {
        console.error("Error fetching game assets:", error);
        return NextResponse.json(
            { error: "Failed to fetch game assets" },
            { status: 500 }
        );
    }
}

// POST /api/game-assets - Create a new game asset
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        if (!body.type || !body.assetUrl || !body.brandId) {
            return NextResponse.json(
                { error: "Missing required fields: type, assetUrl, brandId" },
                { status: 400 }
            );
        }

        // Create the new game asset
        const gameAsset = await prisma.gameAsset.create({
            data: {
                type: body.type,
                assetUrl: body.assetUrl,
                brandId: body.brandId,
                width: body.width || null,
                height: body.height || null,
                points: body.points || null,
            },
        });

        return NextResponse.json(gameAsset, { status: 201 });
    } catch (error) {
        console.error("Error creating game asset:", error);
        return NextResponse.json(
            { error: "Failed to create game asset" },
            { status: 500 }
        );
    }
} 