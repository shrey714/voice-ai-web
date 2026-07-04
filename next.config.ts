import type { NextConfig } from "next";

// Third-party origins the client actually talks to — keep this list in sync
// with lib/supabase.ts (Supabase project) and lib/geocode.ts (BigDataCloud +
// Photon). Anything not listed here is blocked by connect-src.
const CONNECT_SRC = [
  "'self'",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.bigdatacloud.net",
  "https://photon.komoot.io",
];

// Pragmatic first-pass CSP: script-src stays permissive because Next.js App
// Router relies on inline bootstrap/RSC payload scripts, and a strict
// nonce-based policy needs per-request middleware — tracked as a follow-up,
// not worth the risk of breaking the live site in this pass. Everything else
// (frames, objects, base URI, form targets) is locked down, which is what
// actually stops clickjacking and most injection payloads in practice.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${CONNECT_SRC.join(" ")}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
