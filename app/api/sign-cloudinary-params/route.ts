import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Handle GET requests for simple uploads
export async function GET() {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);

        // Generate the signature
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                folder: "rolu_assets"
            },
            process.env.CLOUDINARY_API_SECRET as string
        );

        return NextResponse.json({
            signature,
            timestamp,
            apiKey: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
        });
    } catch (error) {
        console.error("Error generating Cloudinary signature:", error);
        return NextResponse.json(
            { error: "Failed to generate signature" },
            { status: 500 }
        );
    }
}

// Handle POST requests with specific parameters to sign
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { paramsToSign } = body;

        // Get the signature with the api_sign_request method
        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET as string
        );

        // Return the signature
        return NextResponse.json({ signature });
    } catch (error) {
        console.error("Error signing Cloudinary params:", error);
        return NextResponse.json(
            { error: "Failed to sign Cloudinary parameters" },
            { status: 500 }
        );
    }
} 