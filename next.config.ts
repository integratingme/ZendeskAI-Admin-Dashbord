import type { NextConfig } from "next";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_BASE_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
  /* config options here */
};

export default nextConfig;
