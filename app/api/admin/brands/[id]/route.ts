import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Define the params type for route handlers
type RouteParams = {
    params: {
        id: string;
    };
};

// GET /api/admin/brands/[id] - Get a specific brand
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;

        const brand = await prisma.brand.findUnique({
            where: { id },
        });

        if (!brand) {
            return NextResponse.json(
                { error: "Brand not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ brand });
    } catch (error) {
        console.error(`Error fetching brand ${params.id}:`, error);
        return NextResponse.json(
            { error: "Failed to fetch brand" },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/brands/[id] - Update a brand
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;
        const body = await request.json();
        const { name, description, logoUrl, primaryColor, secondaryColor } = body;

        // Check if brand exists
        const existingBrand = await prisma.brand.findUnique({
            where: { id },
        });

        if (!existingBrand) {
            return NextResponse.json(
                { error: "Brand not found" },
                { status: 404 }
            );
        }

        // Update the brand
        const updatedBrand = await prisma.brand.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(logoUrl !== undefined && { logoUrl }),
                ...(primaryColor && { primaryColor }),
                ...(secondaryColor && { secondaryColor }),
            },
        });

        return NextResponse.json({ brand: updatedBrand });
    } catch (error) {
        console.error(`Error updating brand ${params.id}:`, error);
        return NextResponse.json(
            { error: "Failed to update brand" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/brands/[id] - Delete a brand
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;

        // Check if brand exists
        const existingBrand = await prisma.brand.findUnique({
            where: { id },
        });

        if (!existingBrand) {
            return NextResponse.json(
                { error: "Brand not found" },
                { status: 404 }
            );
        }

        // Check if there are game settings associated with this brand
        const gameSettings = await prisma.gameSettings.findFirst({
            where: { brandId: id },
        });

        if (gameSettings) {
            return NextResponse.json(
                { error: "Cannot delete brand with associated game settings. Please delete the settings first." },
                { status: 409 }
            );
        }

        // Check if there are game assets associated with this brand
        const gameAssets = await prisma.gameAsset.findFirst({
            where: { brandId: id },
        });

        if (gameAssets) {
            return NextResponse.json(
                { error: "Cannot delete brand with associated game assets. Please delete the assets first." },
                { status: 409 }
            );
        }

        // Delete the brand
        await prisma.brand.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Error deleting brand ${params.id}:`, error);
        return NextResponse.json(
            { error: "Failed to delete brand" },
            { status: 500 }
        );
    }
} 