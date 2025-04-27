import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * API endpoint to manually refund a failed token claim
 * Can be used by admins or automatically called from frontend when showing failed claims
 */
export async function POST(req: NextRequest) {
  try {
    // Get current user and verify admin status
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { transactionId } = body;

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get the transaction using raw query to avoid type issues
    const transactions = await prisma.$queryRaw<{
      id: string;
      userId: string;
      amount: number;
      status: string;
      errorMessage: string | null;
    }[]>`
      SELECT id, "userId", amount, status, "errorMessage"
      FROM "TokenTransaction"
      WHERE id = ${transactionId}
    `;

    const transaction = transactions.length > 0 ? transactions[0] : null;

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to refund this transaction
    // Only allow refunding your own transactions unless you're an admin
    const isAdmin = false; // TODO: Implement admin check
    const isOwner = transaction.userId === currentUser.id;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to refund this transaction' },
        { status: 403 }
      );
    }

    // Only allow refunding failed transactions
    if (transaction.status !== 'FAILED') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Only failed transactions can be refunded',
          status: transaction.status
        },
        { status: 400 }
      );
    }

    // Check if transaction was already refunded
    if (transaction.errorMessage?.includes('Amount refunded')) {
      return NextResponse.json(
        { success: false, error: 'This transaction has already been refunded' },
        { status: 400 }
      );
    }

    // Process the refund using raw queries to avoid type issues
    await prisma.$transaction(async (tx) => {
      // 1. Mark the transaction as refunded
      await tx.$executeRaw`
        UPDATE "TokenTransaction"
        SET "errorMessage" = CONCAT(COALESCE("errorMessage", ''), ' | Manually refunded on ${new Date().toISOString()}')
        WHERE id = ${transaction.id}
      `;
      
      // 2. Refund the user's in-app balance
      await tx.$executeRaw`
        UPDATE "User"
        SET "roluBalance" = "roluBalance" + ${transaction.amount}
        WHERE id = ${transaction.userId}
      `;
    });

    // Get updated user balance
    const users = await prisma.$queryRaw<{ roluBalance: number }[]>`
      SELECT "roluBalance" FROM "User"
      WHERE id = ${transaction.userId}
    `;

    const userBalance = users.length > 0 ? users[0].roluBalance : 0;

    return NextResponse.json({
      success: true,
      message: `Successfully refunded ${transaction.amount} ROLU to user's in-app balance`,
      data: {
        transactionId: transaction.id,
        amount: transaction.amount,
        userId: transaction.userId,
        newBalance: userBalance
      }
    });
  } catch (error) {
    console.error('Error refunding claim:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process refund',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 