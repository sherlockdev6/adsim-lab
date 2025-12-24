/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Only use rewrites in development when mock API is running
    async rewrites() {
        // In production (Vercel), use the built-in API routes
        if (process.env.VERCEL) {
            return [];
        }
        // In development, can still use the mock API if preferred
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
