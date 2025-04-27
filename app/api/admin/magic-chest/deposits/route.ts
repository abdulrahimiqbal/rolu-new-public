import { NextRequest, NextResponse } from "next/server";
// import { getCurrentUser } from "@/lib/auth"; // Removed auth check
import { prisma } from "@/lib/prisma";

// Ensuring the route is properly marked as dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// GET /api/admin/magic-chest/deposits
// Fetches all users with active magic chest deposits, their total deposit amount, and latest deposit time.
// !! WARNING: Authentication check removed based on user request !!
export async function GET(request: NextRequest) {
    try {
        // Removed authentication check:
        // const currentUser = await getCurrentUser();
        // if (!currentUser) {
        //     return NextResponse.json(
        //         { success: false, error: "Authentication required" },
        //         { status: 401 }
        //     );
        // }

        // Removed placeholder Admin Check comment as well

        // 1. Group deposits by user to get sum and latest time
        const depositsByUser = await prisma.magicChestDeposit.groupBy({
            by: ['userId'],
            _sum: {
                amount: true,
            },
            _max: {
                depositTime: true,
            },
            // Having clause ensures we only get users with active deposits
            having: {
                amount: {
                    _sum: {
                        gt: 0 // Only include users with a total deposit > 0
                    }
                }
            }
        });

        // 2. Extract user IDs from the grouped results
        const userIds = depositsByUser.map(deposit => deposit.userId);

        // 3. Fetch user details for the relevant users
        const users = await prisma.user.findMany({
            where: {
                id: {
                    in: userIds,
                },
            },
            select: {
                id: true,
                username: true,
                profileImage: true, // Include profile image if needed
            },
        });

        // 4. Create a map for easy lookup of user details
        const userMap = new Map(users.map(user => [user.id, user]));

        // 5. Combine deposit aggregates with user details
        const results = depositsByUser.map(deposit => {
            const user = userMap.get(deposit.userId);
            return {
                userId: deposit.userId,
                username: user?.username ?? 'Unknown User',
                profileImage: user?.profileImage,
                totalDeposited: deposit._sum.amount ?? 0,
                latestDepositTime: deposit._max.depositTime ?? null,
            };
        });

        // Optional: Sort results, e.g., by latest deposit time descending
        results.sort((a, b) => {
            const timeA = a.latestDepositTime ? new Date(a.latestDepositTime).getTime() : 0;
            const timeB = b.latestDepositTime ? new Date(b.latestDepositTime).getTime() : 0;
            return timeB - timeA; // Sort descending (newest first)
        });

        return NextResponse.json({
            success: true,
            deposits: results,
        });

    } catch (error) {
        console.error("Admin Magic Chest Deposits Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch magic chest deposits" },
            { status: 500 }
        );
    }
} 