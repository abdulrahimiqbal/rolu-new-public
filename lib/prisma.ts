import { PrismaClient } from "@prisma/client";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

// Function to create a PrismaClient instance
function createPrismaClient() {
    return new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        // Add error formatting options to better handle type conversion issues
        errorFormat: 'pretty',
    });
}

// Use existing global client or create new one
export const prisma = global.prisma || createPrismaClient();

// Save PrismaClient on the global object in non-production environments
if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}

// This function ensures we can get a fresh connection if needed
export function getPrismaClient() {
    return prisma;
}

// Gracefully shutdown the Prisma client on serverless function completion
// This helps prevent connection issues with serverless environments
export async function disconnectPrisma() {
    try {
        await prisma.$disconnect();
    } catch (error) {
        console.error("Error disconnecting from Prisma:", error);
    }
}

export default prisma;
