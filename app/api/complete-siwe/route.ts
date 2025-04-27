import { NextRequest, NextResponse } from 'next/server'

// This route is a placeholder for future implementation
// of SIWE message verification
export async function POST(request: NextRequest) {
    try {
        const { payload } = await request.json()

        // For now, we'll just return success without verification
        console.log("SIWE verification is disabled for now")
        console.log("Will be implemented in the future")

        return NextResponse.json({
            isValid: true,
            address: payload.address,
        })
    } catch (error) {
        console.error('Error in SIWE endpoint:', error)
        return NextResponse.json(
            { isValid: false, message: 'An error occurred' },
            { status: 500 }
        )
    }
} 