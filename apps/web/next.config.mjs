/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@citypulse/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
  },
};

export default nextConfig;
