// Configuration for the application

// Define which routes should be statically generated
export const staticRoutes = [
    '/',
    '/sign-in',
];

// Define which routes should be dynamically rendered
export const dynamicRoutes = [
    '/gameplay',
    '/profile',
];

// Game configuration
export const gameConfig = {
    defaultBrand: 'worldchain',
    lanes: 3,
    baseSpeed: 3,
    speedIncrease: {
        threshold: 200,
        percentage: 10,
        maxMultiplier: 3,
    },
    quizFrequency: 500,
    minFramesBetweenObstacles: 30,
};

// API configuration
export const apiConfig = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '',
    endpoints: {
        quizzes: '/api/quizzes',
        gameStart: '/api/game/start',
        gameSubmit: '/api/game/submit',
        leaderboard: '/api/leaderboard',
        userProfile: '/api/users/profile',
        login: '/api/auth/test-login',
    },
};

// Auth configuration
export const authConfig = {
    cookieName: 'has_session',
    tokenKey: 'rolu_auth_token',
    userKey: 'rolu_user',
}; 