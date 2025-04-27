import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/assets - Get all assets or filter by brandId
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const brandId = searchParams.get("brandId");
        const type = searchParams.get("type");

        let whereClause: any = {};

        if (brandId) {
            whereClause.brandId = brandId;
        }

        if (type) {
            whereClause.type = type;
        }

        const assets = await prisma.gameAsset.findMany({
            where: whereClause,
            orderBy: {
                type: "asc",
            },
        });

        return NextResponse.json({ assets });
    } catch (error) {
        console.error("Error fetching assets:", error);
        return NextResponse.json(
            { error: "Failed to fetch assets" },
            { status: 500 }
        );
    }
}

// Add route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 