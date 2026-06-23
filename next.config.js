/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use webpack to avoid SWC issues on Windows
  webpack: (config) => config,
  serverExternalPackages: [
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    'pino',
    'pino-pretty',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'eventflow.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'replicate.delivery' },
      { protocol: 'https', hostname: '*.replicate.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL ?? '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  // Phase 10: Disable console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  poweredByHeader: false,
};

module.exports = nextConfig;
