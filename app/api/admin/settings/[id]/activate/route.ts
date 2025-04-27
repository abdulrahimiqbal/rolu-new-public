import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
    params: {
        id: string;
    };
}

// POST /api/admin/settings/[id]/activate - Activate specific settings
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;

        // Check if settings exist
        const settingsToActivate = await prisma.gameSettings.findUnique({
            where: { id },
        });

        if (!settingsToActivate) {
            return NextResponse.json(
                { error: "Settings not found" },
                { status: 404 }
            );
        }

        // Start a transaction to update all settings
        await prisma.$transaction([
            // First, set all settings to not default
            prisma.gameSettings.updateMany({
                where: {
                    isDefault: true,
                },
                data: {
                    isDefault: false,
                },
            }),
            // Then, set the selected settings as default
            prisma.gameSettings.update({
                where: { id },
                data: {
                    isDefault: true,
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            message: "Settings activated successfully"
        });
    } catch (error) {
        console.error(`Error activating settings ${params.id}:`, error);
        return NextResponse.json(
            { error: "Failed to activate settings" },
            { status: 500 }
        );
    }
} 