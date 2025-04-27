'use server';

import prisma from '@/lib/prisma';
import { cache } from 'react';

export const getDashboardStats = cache(async () => {
    try {
        // Get user count
        const userCount = await prisma.user.count();

        // Get verified users count
        const verifiedUserCount = await prisma.user.count({
            where: { is_verified: true }
        });

        // Get game session count
        const gameSessionCount = await prisma.gameSession.count();

        // Get quiz completion percentage
        const totalQuizResponses = await prisma.quizResponse.count();
        const correctAnswers = await prisma.quizResponse.count({
            where: { isCorrect: true }
        });
        const quizCompletionPercentage = totalQuizResponses > 0
            ? Math.round((correctAnswers / totalQuizResponses) * 100)
            : 0;

        // Get total Rolu tokens
        const totalRolu = await prisma.user.aggregate({
            _sum: { roluBalance: true }
        });

        // Get top brands with sessions and completion rates
        const brands = await prisma.brand.findMany({
            take: 4,
            select: {
                id: true,
                name: true,
                logoUrl: true,
                _count: {
                    select: { gameSessions: true }
                },
            },
            orderBy: {
                gameSessions: {
                    _count: 'desc'
                }
            }
        });

        // Calculate completion percentage for each brand
        const brandsWithStats = await Promise.all(
            brands.map(async (brand) => {
                const totalBrandQuizzes = await prisma.quizResponse.count({
                    where: {
                        quiz: {
                            brandId: brand.id
                        }
                    }
                });

                const correctBrandAnswers = await prisma.quizResponse.count({
                    where: {
                        quiz: {
                            brandId: brand.id
                        },
                        isCorrect: true
                    }
                });

                const completionPercentage = totalBrandQuizzes > 0
                    ? Math.round((correctBrandAnswers / totalBrandQuizzes) * 100)
                    : 0;

                return {
                    id: brand.id,
                    name: brand.name,
                    logoUrl: brand.logoUrl,
                    sessions: brand._count.gameSessions,
                    completion: `${completionPercentage}%`
                };
            })
        );

        return {
            userCount: userCount.toString(),
            verifiedUserCount: verifiedUserCount.toString(),
            gameSessionCount: gameSessionCount.toString(),
            quizCompletionPercentage: `${quizCompletionPercentage}%`,
            totalRoluTokens: totalRolu._sum.roluBalance?.toString() || '0',
            topBrands: brandsWithStats,
            // Calculate change percentage from yesterday (simplified placeholder)
            // In a real app, you would compare with yesterday's data
            stats: {
                userGrowth: '+15%',
                verifiedUserGrowth: '+8%',
                sessionGrowth: '+5%',
                quizCompletionGrowth: '+3%',
                roluGrowth: '+12%'
            }
        };
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return {
            userCount: '0',
            verifiedUserCount: '0',
            gameSessionCount: '0',
            quizCompletionPercentage: '0%',
            totalRoluTokens: '0',
            topBrands: [],
            stats: {
                userGrowth: '0%',
                verifiedUserGrowth: '0%',
                sessionGrowth: '0%',
                quizCompletionGrowth: '0%',
                roluGrowth: '0%'
            }
        };
    }
}); 