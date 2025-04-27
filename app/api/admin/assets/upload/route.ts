import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const brandId = formData.get("brandId") as string;
        const assetType = formData.get("assetType") as string;

        if (!file || !brandId) {
            return NextResponse.json(
                { error: "File and brandId are required" },
                { status: 400 }
            );
        }

        // Check if brand exists
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
        });

        if (!brand) {
            return NextResponse.json(
                { error: "Brand not found" },
                { status: 404 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert buffer to base64
        const base64 = buffer.toString("base64");
        const base64File = `data:${file.type};base64,${base64}`;

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload(
                base64File,
                {
                    folder: "game_assets",
                    resource_type: "auto",
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );
        });

        // Handle different asset types
        if (assetType === "logo") {
            // For logo, just return the URL (will be updated in brand record separately)
            return NextResponse.json({
                success: true,
                assetUrl: (result as any).secure_url,
            });
        } else {
            // For game assets, create or update the asset record
            const assetId = formData.get("assetId") as string;
            const width = parseInt(formData.get("width") as string) || 30;
            const height = parseInt(formData.get("height") as string) || 50;
            const points = formData.get("points") ? parseInt(formData.get("points") as string) : null;

            // Validate asset type
            const validTypes = ["player", "obstacle", "collectible", "powerup", "background"];
            if (!validTypes.includes(assetType)) {
                return NextResponse.json(
                    { error: "Invalid asset type" },
                    { status: 400 }
                );
            }

            // Create or update asset
            let asset;
            if (assetId) {
                // Update existing asset
                asset = await prisma.gameAsset.update({
                    where: { id: assetId },
                    data: {
                        assetUrl: (result as any).secure_url,
                        width,
                        height,
                        points,
                    },
                });
            } else {
                // Create new asset with a default ID if not provided
                const defaultId = `${assetType}-${brandId}`;

                // Check if an asset with this default ID already exists
                const existingAsset = await prisma.gameAsset.findUnique({
                    where: { id: defaultId },
                });

                if (existingAsset) {
                    // Update the existing asset
                    asset = await prisma.gameAsset.update({
                        where: { id: defaultId },
                        data: {
                            assetUrl: (result as any).secure_url,
                            width,
                            height,
                            points,
                        },
                    });
                } else {
                    // Create a new asset
                    asset = await prisma.gameAsset.create({
                        data: {
                            id: defaultId,
                            brandId,
                            type: assetType,
                            assetUrl: (result as any).secure_url,
                            width,
                            height,
                            points,
                        },
                    });
                }
            }

            return NextResponse.json({
                success: true,
                asset,
                assetUrl: (result as any).secure_url,
            });
        }
    } catch (error) {
        console.error("Error uploading asset:", error);
        return NextResponse.json(
            { error: "Failed to upload asset" },
            { status: 500 }
        );
    }
}

// New route segment config format
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 