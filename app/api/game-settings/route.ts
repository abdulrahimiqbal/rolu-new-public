import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/game-settings - Get all game settings configurations
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get("brandId");
        const isGlobal = searchParams.get("isGlobal") === "true";
        const isDefault = searchParams.get("isDefault") === "true";

        // Build the where clause based on query parameters
        const whereClause: any = {};
        if (brandId) {
            whereClause.brandId = brandId;
        }
        if (isGlobal !== null) {
            whereClause.isGlobal = isGlobal;
        }
        if (isDefault !== null) {
            whereClause.isDefault = isDefault;
        }

        const gameSettings = await prisma.gameSettings.findMany({
            where: whereClause,
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json(gameSettings);
    } catch (error) {
        console.error("Error fetching game settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch game settings" },
            { status: 500 }
        );
    }
}

// POST /api/game-settings - Create a new game settings configuration
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Check if this is a default configuration
        if (body.isDefault) {
            // If setting a new default, unset any existing defaults for the same brand or global scope
            if (body.brandId) {
                await prisma.gameSettings.updateMany({
                    where: {
                        brandId: body.brandId,
                        isDefault: true,
                    },
                    data: {
                        isDefault: false,
                    },
                });
            } else if (body.isGlobal) {
                await prisma.gameSettings.updateMany({
                    where: {
                        isGlobal: true,
                        isDefault: true,
                    },
                    data: {
                        isDefault: false,
                    },
                });
            }
        }

        // Create the new game settings
        const gameSettings = await prisma.gameSettings.create({
            data: body,
        });

        return NextResponse.json(gameSettings, { status: 201 });
    } catch (error) {
        console.error("Error creating game settings:", error);
        return NextResponse.json(
            { error: "Failed to create game settings" },
            { status: 500 }
        );
    }
} 