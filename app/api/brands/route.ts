import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/brands - Get all brands
export async function GET(request: NextRequest) {
    try {
        const brands = await prisma.brand.findMany({
            orderBy: {
                name: "asc",
            },
        });

        console.log("Fetched brands:", brands); // Debug log

        return NextResponse.json({
            success: true,
            data: brands,
        });
    } catch (error) {
        console.error("Error fetching brands:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch brands" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, name, description, primaryColor, secondaryColor, logoUrl } = body;

        // Validate required fields
        if (!id || !name) {
            return NextResponse.json(
                { success: false, error: "ID and name are required" },
                { status: 400 }
            );
        }

        // Check if brand with this ID already exists
        const existingBrand = await prisma.brand.findUnique({
            where: {
                id,
            },
        });

        if (existingBrand) {
            return NextResponse.json(
                { success: false, error: "Brand with this ID already exists" },
                { status: 400 }
            );
        }

        // Create new brand
        const brand = await prisma.brand.create({
            data: {
                id,
                name,
                description,
                primaryColor,
                secondaryColor,
                logoUrl,
            },
        });

        return NextResponse.json({
            success: true,
            data: brand,
        });
    } catch (error) {
        console.error("Error creating brand:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create brand" },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic'; 