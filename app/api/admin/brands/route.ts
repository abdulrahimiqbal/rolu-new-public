import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/brands - Get all brands
export async function GET() {
    try {
        const brands = await prisma.brand.findMany({
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json({ brands });
    } catch (error) {
        console.error("Error fetching brands:", error);
        return NextResponse.json(
            { error: "Failed to fetch brands" },
            { status: 500 }
        );
    }
}

// POST /api/admin/brands - Create a new brand
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, name, description, primaryColor, secondaryColor } = body;

        // Validate required fields
        if (!id || !name) {
            return NextResponse.json(
                { error: "Brand ID and name are required" },
                { status: 400 }
            );
        }

        // Check if brand with this ID already exists
        const existingBrand = await prisma.brand.findUnique({
            where: { id },
        });

        if (existingBrand) {
            return NextResponse.json(
                { error: "A brand with this ID already exists" },
                { status: 409 }
            );
        }

        // Check if there are any active brands
        const activeCount = await prisma.brand.count({
            where: { is_active: true }
        });

        // Create the brand - make it active if it's the first brand
        const brand = await prisma.brand.create({
            data: {
                id,
                name,
                description: description || "",
                primaryColor: primaryColor || "#3498db",
                secondaryColor: secondaryColor || "#2980b9",
                is_active: activeCount === 0 // Make the first brand active by default
            },
        });

        return NextResponse.json({ brand }, { status: 201 });
    } catch (error) {
        console.error("Error creating brand:", error);
        return NextResponse.json(
            { error: "Failed to create brand" },
            { status: 500 }
        );
    }
} 