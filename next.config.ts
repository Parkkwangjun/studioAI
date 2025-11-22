import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nwfgebinyicoxcevnzbw.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'fal.media',
      },
      {
        protocol: 'https',
        hostname: 'oaidalleapiprodscus.blob.core.windows.net', // OpenAI DALL-E
      },
    ],
  },
};

export default nextConfig;
