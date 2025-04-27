import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define public routes that don't require authentication
const publicRoutes: string[] = [
    '/sign-in',
    '/api/nonce',
    '/api/auth/login',
    '/api/auth/test-login'
];

// Define routes that should bypass auth checks (like admin routes)
const bypassRoutes: string[] = ['/admin', '/api/*'];

// Define routes that require verification
const verifiedOnlyRoutes: string[] = [
    // Add routes that need verified user here
    // Example: '/premium-features'
];

// Routes that show verification prompt but don't hard require it
const showVerificationPrompt: string[] = [
    // Example routes where we want to encourage verification
    '/'
];

// Routes that should show notification permission prompt
const showNotificationPrompt: string[] = [
    // Routes where we want to prompt for notification permission
    '/'
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Add a response header to indicate this is a dynamic route
    // This helps Next.js understand it should not be statically optimized
    const response = NextResponse.next();
    response.headers.set('x-middleware-cache', 'no-cache');

    // Check if the route is public or should bypass auth
    if (publicRoutes.some(route => pathname.startsWith(route)) ||
        bypassRoutes.some(route => {
            // Handle wildcard patterns like '/api/*'
            if (route.endsWith('*')) {
                const prefix = route.slice(0, -1); // Remove the '*'
                return pathname.startsWith(prefix);
            }
            return pathname.startsWith(route);
        })) {
        return response;
    }

    // Check for authentication token
    const token = request.cookies.get('rolu_auth_token')?.value;

    // If no token is found, redirect to sign-in page
    if (!token) {
        const signInUrl = new URL('/sign-in', request.url);
        return NextResponse.redirect(signInUrl);
    }

    // Extract user data from cookie for subsequent checks
    const userDataCookie = request.cookies.get('rolu_user_data')?.value;
    let userData = null;

    if (userDataCookie) {
        try {
            userData = JSON.parse(decodeURIComponent(userDataCookie));
        } catch (error) {
            console.error('Error parsing user data:', error);
        }
    }

    // Check verification status for routes that require it
    if (verifiedOnlyRoutes.some(route => pathname.startsWith(route))) {
        if (userData && !userData.is_verified) {
            return NextResponse.redirect(new URL('/verification-required', request.url));
        }
    }

    // If user data is available, check for verification and notification prompts
    if (userData) {
        // Add verification prompt header if applicable
        if (showVerificationPrompt.some(route => pathname.startsWith(route)) && !userData.is_verified) {
            response.headers.set('X-Should-Show-Verification', 'true');
        }

        // Add notification permission prompt header if applicable
        if (showNotificationPrompt.some(route => pathname.startsWith(route)) && !userData.has_notification_permission) {
            response.headers.set('X-Should-Show-Notification-Prompt', 'true');
        }
    }

    // Token exists, allow the request to proceed
    return response;
}

// Configure which routes the middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         * - api routes that are public
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
    ],
}; 