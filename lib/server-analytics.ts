/**
 * Server-safe analytics module
 * Provides no-op implementations of analytics functions that can be safely used on the server
 */

// Server-side analytics stubs that do nothing but log
export const trackEvent = (
    eventName: string,
    properties?: Record<string, any>
) => {
    console.log(`[Server] Analytics event: ${eventName}`, properties || {});
};

export const identifyUser = (
    userId: string,
    userProperties?: Record<string, any>
) => {
    console.log(`[Server] Analytics identify: ${userId}`, userProperties || {});
};

export const resetAnalyticsUser = () => {
    console.log(`[Server] Analytics reset user`);
};

export const initializeAnalytics = () => {
    console.log(`[Server] Analytics initialization`);
}; 