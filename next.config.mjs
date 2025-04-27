/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        domains: ['images.unsplash.com', 'res.cloudinary.com'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    // Configure output for better static generation
    output: 'standalone',
    // Explicitly set the experimental features
    experimental: {
        // Improve server component serialization
        serverComponentsExternalPackages: ['@prisma/client'],
    },
    // Configure dynamic routes
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Credentials', value: 'true' },
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
                    { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
                ],
            },
            // Add headers to prevent minification issues with Cloudflare
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-XSS-Protection', value: '1; mode=block' },
                ],
            },
        ];
    },
    // Configure redirects
    async redirects() {
        return [];
    },
    // Configure rewrites
    async rewrites() {
        return [];
    },
    // Handle Node.js specific modules in the browser
    webpack: (config, { isServer }) => {
        // Only include the Google Cloud Translate package on the server
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
                child_process: false,
            };
        }
        return config;
    },
    // Add this section if missing
    compiler: {
        // Enables the styled-components SWC transform
        styledComponents: true
    },
    // Mark routes that use cookies as dynamic
    // This prevents Next.js from trying to statically generate them
    // Make sure server components aren't statically optimized when they use cookies
    staticPageGenerationTimeout: 120,
    // Disable static generation for routes that use cookies
    trailingSlash: false,
    // Add onDemandEntries configuration to prevent stale entries
    onDemandEntries: {
        // Period (in ms) where the server will keep pages in the buffer
        maxInactiveAge: 25 * 1000,
        // Number of pages that should be kept simultaneously without being disposed
        pagesBufferLength: 5,
    },
};

export default nextConfig;
