import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product/shop images are served from the public Supabase Storage bucket.
    // next/image (optimized on Vercel) requires the remote host to be allow-listed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
