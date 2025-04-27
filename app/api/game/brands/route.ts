import { NextResponse } from "next/server";
import { getAvailableBrands } from "@/lib/game-config";

// GET /api/game/brands - Get all available brands for the game
export async function GET() {
    try {
        const brands = await getAvailableBrands();



        // Only return brands that are both ready (have required assets) and active
        // Handle the case where is_active might be null
        // const activeBrands = brands.filter(brand => brand.isReady && brand.is_active === true);



        return NextResponse.json({ brands });
    } catch (error) {
        console.error("Error fetching available brands:", error);
        return NextResponse.json(
            { error: "Failed to fetch available brands" },
            { status: 500 }
        );
    }
} 