/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb', // Allow compressed audio snippets (~22kHz mono = ~650KB/30s)
    },
  },
};

export default nextConfig;
