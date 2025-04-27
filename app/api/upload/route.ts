import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Set route segment config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Maximum duration in seconds

export async function POST(request: NextRequest) {
    try {
        // Configure Cloudinary at runtime only
        if (!cloudinary.config().cloud_name) {
            cloudinary.config({
                cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET,
            });
        }

        // Validate Cloudinary configuration
        if (!cloudinary.config().cloud_name) {
            return NextResponse.json(
                { error: "Cloudinary configuration is missing. Please check environment variables." },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const folder = formData.get("folder") as string || "game_assets";

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Convert buffer to base64
        const base64 = buffer.toString("base64");
        const dataURI = `data:${file.type};base64,${base64}`;

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload(
                dataURI,
                {
                    folder,
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

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json(
            { error: "Failed to upload file" },
            { status: 500 }
        );
    }
} 