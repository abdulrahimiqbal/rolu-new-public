import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
    params: {
        id: string;
    };
}

// GET /api/admin/settings/[id] - Get specific settings
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;

        const settings = await prisma.gameSettings.findUnique({
            where: { id },
        });

        if (!settings) {
            return NextResponse.json(
                { error: "Settings not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ settings });
    } catch (error) {
        console.error(`Error fetching settings ${params.id}:`, error);
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/settings/[id] - Update settings
export async function PATCH(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;
        const body = await request.json();

        // Check if settings exist
        const existingSettings = await prisma.gameSettings.findUnique({
            where: { id },
        });

        if (!existingSettings) {
            return NextResponse.json(
                { error: "Settings not found" },
                { status: 404 }
            );
        }

        // Prepare data for update
        const updateData: any = {};

        // Process each field, converting number strings to numbers
        for (const [key, value] of Object.entries(body)) {
            if (key === 'isGlobal') {
                updateData[key] = !!value;
                if (value === true) {
                    updateData.brandId = null;
                }
            } else if (key === 'brandId') {
                updateData[key] = value === null || value === 'null' ? null : value;
            } else if (
                ['initialSpeed', 'speedIncreaseThreshold', 'speedIncreasePercentage',
                    'maxSpeed', 'minFramesBetweenObstacles', 'obstacleFrequency',
                    'collectibleFrequency', 'powerupFrequency', 'quizFrequency',
                    'pointsPerCollectible', 'pointsPerMeter', 'xpPerPoint',
                    'roluPerCorrectAnswer', 'quizTimeLimit'].includes(key)
            ) {
                updateData[key] = value === '' ? null : Number(value);
            } else if (['quizPauseGame', 'quizRequiredForCompletion'].includes(key)) {
                updateData[key] = !!value;
            } else if (key !== 'id' && key !== 'isDefault') { // Don't allow updating id or isDefault
                updateData[key] = value;
            }
        }

        // Update the settings
        const updatedSettings = await prisma.gameSettings.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ settings: updatedSettings });
    } catch (error) {
        console.error(`Error updating settings ${params.id}:`, error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/settings/[id] - Delete settings
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;

        // Check if settings exist
        const existingSettings = await prisma.gameSettings.findUnique({
            where: { id },
        });

        if (!existingSettings) {
            return NextResponse.json(
                { error: "Settings not found" },
                { status: 404 }
            );
        }

        // Don't allow deleting the default settings
        if (existingSettings.isDefault) {
            return NextResponse.json(
                { error: "Cannot delete the active settings configuration. Please activate another configuration first." },
                { status: 409 }
            );
        }

        // Delete the settings
        await prisma.gameSettings.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Error deleting settings ${params.id}:`, error);
        return NextResponse.json(
            { error: "Failed to delete settings" },
            { status: 500 }
        );
    }
} 