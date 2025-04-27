import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Define the params type for route handlers
type RouteParams = {
    params: {
        id: string;
    };
};

// POST /api/admin/brands/[id]/toggle-active - Toggle a brand's active status
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;
        const body = await request.json();
        const { is_active } = body;

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

        // If we're activating this brand, first deactivate all other brands
        if (is_active) {
            await prisma.brand.updateMany({
                where: {
                    NOT: {
                        id
                    },
                    is_active: true
                },
                data: {
                    is_active: false
                }
            });
        }

        // Update the brand's active status
        const updatedBrand = await prisma.brand.update({
            where: { id },
            data: {
                is_active
            },
        });

        return NextResponse.json({
            success: true,
            brand: updatedBrand,
            message: is_active ? "Brand activated successfully" : "Brand deactivated successfully"
        });
    } catch (error) {
        console.error(`Error toggling brand ${params.id} active status:`, error);
        return NextResponse.json(
            { error: "Failed to update brand status" },
            { status: 500 }
        );
    }
} 