import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface RouteParams {
    params: {
        id: string;
    };
}

// GET /api/admin/assets/[id] - Get a specific asset
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;

        const asset = await prisma.gameAsset.findUnique({
            where: { id },
        });

        if (!asset) {
            return NextResponse.json(
                { error: "Asset not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ asset });
    } catch (error) {
        console.error(`Error fetching asset ${params.id}:`, error);
        return NextResponse.json(
            { error: "Failed to fetch asset" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/assets/[id] - Delete an asset
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;

        // Check if asset exists
        const asset = await prisma.gameAsset.findUnique({
            where: { id },
        });

        if (!asset) {
            return NextResponse.json(
                { error: "Asset not found" },
                { status: 404 }
            );
        }

        // Delete from Cloudinary if possible
        if (asset.assetUrl) {
            try {
                // Extract public_id from the URL
                const urlParts = asset.assetUrl.split('/');
                const filenameWithExt = urlParts[urlParts.length - 1];
                const filename = filenameWithExt.split('.')[0];
                const publicId = `game_assets/${filename}`;

                await new Promise((resolve, reject) => {
                    cloudinary.uploader.destroy(publicId, (error, result) => {
                        if (error) {
                            console.warn(`Warning: Could not delete asset from Cloudinary: ${error.message}`);
                        }
                        resolve(result);
                    });
                });
            } catch (cloudinaryError) {
                console.warn("Warning: Error deleting from Cloudinary, continuing with database deletion", cloudinaryError);
            }
        }

        // Delete from database
        await prisma.gameAsset.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(`Error deleting asset ${params.id}:`, error);
        return NextResponse.json(
            { error: "Failed to delete asset" },
            { status: 500 }
        );
    }
}

// Add route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 