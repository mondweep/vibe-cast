/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable WebSocket support for Socket.io
  // Note: For production with Socket.io, use a custom server
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
        pathname: '/**',
      },
    ],
  },

  // Headers for WebSocket and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Allow WebSocket upgrade requests
        source: '/api/socket/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },

  // Rewrites for Socket.io path
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: '/api/socket/:path*',
      },
    ];
  },

  // Webpack configuration for Socket.io server
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only modules on client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
      };
    }

    // Optimize chunk loading for real-time updates
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          socketio: {
            test: /[\\/]node_modules[\\/](socket\.io-client)[\\/]/,
            name: 'socketio',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    };

    return config;
  },

  // Environment variables exposed to client
  env: {
    NEXT_PUBLIC_APP_NAME: 'ChatFlow',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Output configuration for deployment
  output: 'standalone',

  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to complete even with type errors
    // Set to true only for CI/CD pipelines with separate type checking
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Run ESLint on these directories during build
    dirs: ['src'],
  },
};

module.exports = nextConfig;
